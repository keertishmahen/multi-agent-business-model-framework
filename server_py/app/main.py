"""FastAPI entry point for the Business Model Studio RAG + MIA backend.

Replaces the Node/Express server in server/. Route paths and payload shapes are
unchanged so the React client only needs a new base URL.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

from .config import CORS_ORIGIN
from .routers import context, generate, health, rag
from .services.chroma_store import ensure_knowledge_seeded

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s — %(message)s",
)

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Make sure the knowledge base is present before serving traffic."""
    try:
        loaded = ensure_knowledge_seeded()
        if loaded:
            log.info("Knowledge base seeded from bundle: %s", loaded)
        else:
            log.info("Knowledge base already present")
    except Exception as exc:  # noqa: BLE001 - never block startup on seeding
        log.error("Knowledge seeding failed: %s", exc)
    yield


app = FastAPI(
    title="Business Model Studio RAG + MIA API",
    description="SDG-aligned business model co-pilot: retrieval, agents and generation.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS_ORIGIN may be a comma-separated list of deployed frontends.
_origins = [o.strip() for o in CORS_ORIGIN.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials="*" not in _origins,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(context.router, prefix="/api/context", tags=["context"])
app.include_router(rag.router, prefix="/api/rag", tags=["rag"])


@app.get("/")
async def root():
    return {
        "service": "Business Model Studio RAG + MIA API",
        "endpoints": [
            "GET  /api/health",
            "POST /api/generate",
            "POST /api/generate/stream",
            "POST /api/context/store",
            "POST /api/rag/retrieve",
            "POST /api/rag/suggest",
            "POST /api/rag/upload",
            "GET  /api/rag/documents",
            "DELETE /api/rag/documents/{docId}",
        ],
    }
