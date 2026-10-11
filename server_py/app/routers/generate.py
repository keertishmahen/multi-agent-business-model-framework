"""POST /api/generate and /api/generate/stream.

Request and response shapes are identical to the Node server so the React client
needs no change beyond its base URL.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from ..agents.orchestrator import orchestrate, should_use_mia
from ..agents.quality import write
from ..services.rag_service import retrieve_context

log = logging.getLogger(__name__)

router = APIRouter()


class GenerateRequest(BaseModel):
    prompt: str = ""
    stepId: str = "general"
    sessionId: str = "default"
    userStory: str = ""
    options: dict[str, Any] = Field(default_factory=dict)
    useAgents: bool = False


async def _plain_rag_generate(req: GenerateRequest) -> dict[str, Any]:
    """Single-writer path — the fallback when the agent pipeline is off or fails."""
    rag_context = await retrieve_context(
        req.prompt, req.stepId, req.sessionId, req.options or {}
    )
    content = await write(req.prompt, rag_context, req.userStory)
    return {
        "response": content,
        "sources": rag_context.get("sources", []),
        "contextUsed": {
            "knowledgeDocs": len(rag_context.get("knowledge", [])),
            "userHistoryDocs": len(rag_context.get("userHistory", [])),
        },
    }


@router.post("")
@router.post("/")
async def generate(req: GenerateRequest):
    if not req.prompt:
        return JSONResponse(status_code=400, content={"error": "prompt is required"})

    try:
        if req.useAgents:
            try:
                result = await orchestrate(
                    prompt=req.prompt,
                    step_id=req.stepId,
                    session_id=req.sessionId,
                    user_story=req.userStory,
                    options=req.options or {},
                )
                return {
                    "response": result["response"],
                    "sources": result["sources"],
                    "contextUsed": result["contextUsed"],
                    "agentMetadata": result["agentMetadata"],
                }
            except Exception as exc:  # noqa: BLE001 - fall back to plain RAG
                log.error("Multi-agent pipeline failed, falling back to RAG: %s", exc)

        return await _plain_rag_generate(req)
    except Exception as exc:  # noqa: BLE001
        log.exception("Generation failed")
        return JSONResponse(status_code=500, content={"error": str(exc) or "Internal server error"})


def _sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/stream")
async def generate_stream(req: GenerateRequest):
    """SSE progress for the MIA pipeline.

    Frame format matches the Node implementation exactly, because
    src/services/geminiClient.js parses `event:`/`data:` pairs by hand.
    """
    if not req.prompt:
        return JSONResponse(status_code=400, content={"error": "prompt is required"})

    queue: asyncio.Queue[tuple[str, Any] | None] = asyncio.Queue()

    async def on_progress(payload: dict[str, Any]) -> None:
        await queue.put((payload.get("event", "stage"), payload))

    async def run() -> None:
        # The client resolves on `event: complete` carrying a `response` field
        # (src/services/geminiClient.js parseSSEStream), and falls back to plain
        # RAG on a pipeline failure — both mirrored from the Node route.
        try:
            result = await orchestrate(
                prompt=req.prompt,
                step_id=req.stepId,
                session_id=req.sessionId,
                user_story=req.userStory,
                options=req.options or {},
                on_progress=on_progress,
            )
            await queue.put(
                (
                    "complete",
                    {
                        "response": result["response"],
                        "sources": result["sources"],
                        "contextUsed": result["contextUsed"],
                        "agentMetadata": result["agentMetadata"],
                    },
                )
            )
        except Exception as agent_error:  # noqa: BLE001
            log.error("MIA failed, falling back to RAG: %s", agent_error)
            await queue.put(
                (
                    "stage",
                    {"name": "fallback", "status": "running", "message": "Falling back to RAG"},
                )
            )
            try:
                result = await _plain_rag_generate(req)
                await queue.put(
                    (
                        "complete",
                        {
                            "response": result["response"],
                            "sources": result["sources"],
                            "contextUsed": result["contextUsed"],
                            "agentMetadata": {"fallback": True, "error": str(agent_error)},
                        },
                    )
                )
            except Exception as rag_error:  # noqa: BLE001
                await queue.put(
                    ("error", {"message": str(rag_error) or "Generation failed"})
                )
        finally:
            await queue.put(None)

    async def event_source():
        task = asyncio.create_task(run())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                event, data = item
                yield _sse(event, data)
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
