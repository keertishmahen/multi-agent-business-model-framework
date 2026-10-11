"""GET /api/health — liveness plus vector-store visibility."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..config import CHAT_MODEL, EMBEDDING_MODEL, GEMINI_API_KEY
from ..services import chroma_store as store

router = APIRouter()


@router.get("")
@router.get("/")
async def health():
    try:
        counts = store.stats()
        seeded = any(count > 0 for count in counts.values())
        return {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "collections": list(counts.keys()),
            "documentCounts": counts,
            "knowledgeBase": {
                "seeded": seeded,
                "expectedCollections": store.ALL_COLLECTIONS,
            },
            "models": {"chat": CHAT_MODEL, "embedding": EMBEDDING_MODEL},
            # Presence only — never echo the key itself.
            "geminiKeyConfigured": bool(GEMINI_API_KEY),
        }
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            status_code=503, content={"status": "unhealthy", "error": str(exc)}
        )
