"""The standalone RAG step between the BMC and the business plan.

- POST /api/rag/retrieve   hybrid retrieval the plan's MIA pipeline uses, without
                           calling the LLM, so the user can see (and curate)
                           exactly what the plan will be grounded on. The curated
                           set goes back as `options.curatedContext`.
- POST /api/rag/suggest    "what should I upload?" — three data categories for this
                           canvas (SunMoksha's suggestion prompt).
- POST /api/rag/upload     the user's own documents / pasted text → chunked,
                           embedded and stored for this session only.
- GET  /api/rag/documents  and DELETE /api/rag/documents/{docId} manage them.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.datastructures import UploadFile as StarletteUploadFile

from ..services import document_ingest as ingest
from ..services.gemini_client import generate_text, parse_json_response
from ..services.rag_service import (
    agent_routing,
    delete_document,
    ingest_documents,
    list_documents,
    retrieve_plan_context,
)

log = logging.getLogger(__name__)

router = APIRouter()


class RetrieveRequest(BaseModel):
    sessionId: str = ""
    prompt: str = ""
    selectedVpTitle: str = ""


class SuggestRequest(BaseModel):
    sessionId: str = ""
    bmc: Any = None
    story: str = ""


def _public(item: dict) -> dict:
    """Drop raw Chroma metadata; the client only needs display fields."""
    return {k: v for k, v in item.items() if k != "metadata"}


def _error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message})


@router.post("/retrieve")
async def retrieve(req: RetrieveRequest):
    if not req.sessionId:
        return _error(400, "sessionId is required")

    try:
        context = await retrieve_plan_context(
            session_id=req.sessionId,
            prompt=req.prompt or "Business plan grounded in the business model canvas",
            selected_vp_title=req.selectedVpTitle,
        )
    except Exception as exc:  # noqa: BLE001
        log.exception("RAG retrieval failed")
        return _error(500, str(exc))

    return {
        "bmcBlocks": [_public(b) for b in context["bmcBlocks"]],
        "priorSteps": [_public(p) for p in context["priorSteps"]],
        "uploads": [_public(u) for u in context["uploads"]],
        "knowledge": [_public(k) for k in context["knowledge"]],
        "coverageReport": context["coverageReport"],
        "sources": context["sources"],
        "agentRouting": agent_routing(),
    }


SUGGEST_PROMPT = """Given this Business Model Canvas{story_part}:
{bmc}

Suggest 3 categories of data related to this business model canvas that would help \
improve the final business plan (for example market studies, cost quotes, policy \
documents, impact data). Keep each one brief and specific to this business.

Return only JSON:
{{"suggestions": [{{"category": "...", "why": "one sentence", "examples": ["...", "..."]}}]}}"""


@router.post("/suggest")
async def suggest(req: SuggestRequest):
    if not req.bmc:
        return _error(400, "bmc is required")

    bmc_text = req.bmc if isinstance(req.bmc, str) else json.dumps(req.bmc)
    story_part = f" (business story: {req.story[:600]})" if req.story else ""
    prompt = SUGGEST_PROMPT.format(bmc=bmc_text[:6000], story_part=story_part)

    try:
        raw = await generate_text(
            prompt,
            temperature=0.3,
            max_output_tokens=1024,
            json_mode=True,
            disable_thinking=True,
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("Upload suggestion failed: %s", exc)
        return _error(502, f"Could not generate suggestions: {exc}")

    parsed = parse_json_response(raw) or {}
    items = parsed.get("suggestions") if isinstance(parsed, dict) else parsed
    suggestions = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict) or not item.get("category"):
            continue
        examples = item.get("examples") if isinstance(item.get("examples"), list) else []
        suggestions.append(
            {
                "category": str(item["category"])[:120],
                "why": str(item.get("why") or "")[:300],
                "examples": [str(e)[:120] for e in examples[:4]],
            }
        )
    return {"suggestions": suggestions[:3]}


@router.post("/upload")
async def upload(request: Request):
    # Reject oversized bodies before multipart parsing spools them to disk.
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > ingest.MAX_REQUEST_BYTES:
        return _error(413, "Upload is too large")

    try:
        form = await request.form(
            max_files=ingest.MAX_FILES_PER_REQUEST + 1, max_fields=10
        )
    except Exception as exc:  # noqa: BLE001 - malformed / over-limit multipart
        return _error(400, f"Could not read the upload: {exc}")

    sessionId = str(form.get("sessionId") or "")
    text = str(form.get("text") or "")
    files = [f for f in form.getlist("files") if isinstance(f, StarletteUploadFile) and f.filename]

    if not sessionId:
        return _error(400, "sessionId is required")
    if not files and not text.strip():
        return _error(400, "Upload at least one file or paste some text")
    if len(files) > ingest.MAX_FILES_PER_REQUEST:
        return _error(413, f"Upload at most {ingest.MAX_FILES_PER_REQUEST} files at a time")

    sources: list[tuple[str, str]] = []
    try:
        for f in files:
            name = ingest.safe_source_name(f.filename)
            # Read one byte past the cap so oversize files are rejected without
            # buffering arbitrarily large bodies.
            data = await f.read(ingest.MAX_FILE_BYTES + 1)
            # PDF/DOCX parsing is CPU-bound; keep it off the event loop so one
            # upload cannot stall every other request.
            extracted = await asyncio.to_thread(ingest.extract_text, name, data)
            if not extracted.strip():
                return _error(422, f"{name}: no readable text found (scanned PDFs are not supported)")
            sources.append((name, extracted))
        if text.strip():
            sources.append(("Pasted text", text.strip()))

        documents = await ingest_documents(sessionId, sources)
    except ingest.UnsupportedDocument as exc:
        return _error(415, str(exc))
    except ingest.DocumentTooLarge as exc:
        return _error(413, str(exc))
    except Exception as exc:  # noqa: BLE001
        log.exception("Knowledge upload failed")
        return _error(500, f"Upload failed: {exc}")

    return {
        "documents": documents,
        "stored": sum(d["chunks"] for d in documents),
    }


@router.get("/documents")
async def documents(sessionId: str = ""):
    if not sessionId:
        return _error(400, "sessionId is required")
    return {"documents": list_documents(sessionId)}


@router.delete("/documents/{doc_id}")
async def remove_document(doc_id: str, sessionId: str = ""):
    if not sessionId:
        return _error(400, "sessionId is required")
    removed = delete_document(sessionId, doc_id)
    if not removed:
        return _error(404, "Document not found")
    return {"removed": removed}
