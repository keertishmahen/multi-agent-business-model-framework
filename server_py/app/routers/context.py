"""POST /api/context/store — persist a step output into the vector store."""

from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..services import chroma_store as store
from ..services.gemini_client import generate_embedding
from ..services.rag_service import store_step_output

log = logging.getLogger(__name__)

router = APIRouter()


class StoreRequest(BaseModel):
    sessionId: str = ""
    stepId: str = ""
    content: Any = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    chunked: bool = False


@router.post("/store")
async def store_context(req: StoreRequest):
    if not req.sessionId or not req.stepId or req.content in (None, ""):
        return JSONResponse(
            status_code=400,
            content={"error": "sessionId, stepId, and content are required"},
        )

    try:
        # BMC output is always chunked per block, whether or not the client asks,
        # because the plan step retrieves blocks by metadata rather than by vector.
        if req.chunked or req.stepId == "bmc":
            stored = await store_step_output(req.sessionId, req.stepId, req.content)
            if stored == 0:
                # Content was non-empty, so nothing stored means embedding failed;
                # say so instead of a misleading 200 the client treats as success.
                return JSONResponse(
                    status_code=502,
                    content={"error": "Could not embed step output (embedding service failed)"},
                )
            return {"stored": stored, "chunked": True}

        text = req.content if isinstance(req.content, str) else str(req.content)
        embedding = await generate_embedding(text[:8000])
        doc_id = f"{req.sessionId}_{req.stepId}_{int(time.time() * 1000)}"

        store.add_documents(
            store.Collections.USER_CONTEXT,
            ids=[doc_id],
            documents=[text],
            embeddings=[embedding],
            metadatas=[
                {
                    "sessionId": req.sessionId,
                    "stepId": req.stepId,
                    "chunkType": "step_output",
                    "timestamp": int(time.time() * 1000),
                    **(req.metadata or {}),
                }
            ],
        )
        return {"stored": 1, "id": doc_id, "chunked": False}
    except Exception as exc:  # noqa: BLE001
        log.exception("Context store failed")
        return JSONResponse(status_code=500, content={"error": str(exc)})
