"""Persistent vector store backed by ChromaDB.

The Node implementation (server/services/chromaClient.js) declared a
ChromaDB-shaped interface but was actually an in-memory dict persisted to a
10MB vectors.json. This is a real PersistentClient: it survives restarts and
supports metadata filtering natively.

Embeddings are supplied by the caller (Gemini), so every collection is created
with embedding_function=None and we pass vectors explicitly.
"""

from __future__ import annotations

import logging
import threading
from typing import Any

import chromadb
from chromadb.config import Settings

from ..config import CHROMA_PATH, RELEVANCE_DISTANCE_CUTOFF

log = logging.getLogger(__name__)


class Collections:
    FRAMEWORKS = "business_frameworks"
    SDGS = "sdg_knowledge"
    INDUSTRY = "industry_patterns"
    USER_CONTEXT = "user_context"
    BUSINESS_PLAN = "business_plan_sections"
    # Documents the user uploads in the RAG step; always filtered by sessionId.
    USER_DOCS = "user_documents"


ALL_COLLECTIONS = [
    Collections.FRAMEWORKS,
    Collections.SDGS,
    Collections.INDUSTRY,
    Collections.USER_CONTEXT,
    Collections.BUSINESS_PLAN,
    Collections.USER_DOCS,
]

_client: chromadb.ClientAPI | None = None
_lock = threading.Lock()


def get_client() -> chromadb.ClientAPI:
    """Process-wide persistent client."""
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                _client = chromadb.PersistentClient(
                    path=CHROMA_PATH,
                    settings=Settings(anonymized_telemetry=False, allow_reset=True),
                )
                log.info("Chroma persistent client open at %s", CHROMA_PATH)
    return _client


def get_collection(name: str):
    """Fetch or create a collection. Cosine space matches the Node distances."""
    return get_client().get_or_create_collection(
        name=name,
        embedding_function=None,
        metadata={"hnsw:space": "cosine"},
    )


def _clean_metadata(meta: dict[str, Any] | None) -> dict[str, Any]:
    """Chroma only accepts scalar metadata values."""
    if not meta:
        return {}
    out: dict[str, Any] = {}
    for key, value in meta.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            out[key] = value
        else:
            out[key] = str(value)
    return out


def add_documents(
    collection_name: str,
    *,
    ids: list[str],
    documents: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict[str, Any]] | None = None,
) -> None:
    """Upsert documents so re-seeding is idempotent."""
    if not ids:
        return
    coll = get_collection(collection_name)
    coll.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=[_clean_metadata(m) for m in (metadatas or [{}] * len(ids))],
    )


def _to_where(filters: dict[str, Any] | None) -> dict[str, Any] | None:
    """Build a Chroma `where` clause.

    Supports the `<field>In` convention the Node planRagService used for
    "field is one of these values".
    """
    if not filters:
        return None

    clauses: list[dict[str, Any]] = []
    for key, value in filters.items():
        if value is None:
            continue
        if key.endswith("In") and isinstance(value, (list, tuple, set)):
            field = key[:-2]
            clauses.append({field: {"$in": list(value)}})
        elif isinstance(value, (list, tuple, set)):
            clauses.append({key: {"$in": list(value)}})
        else:
            clauses.append({key: {"$eq": value}})

    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def query_relevant(
    collection_name: str,
    query_embedding: list[float],
    n_results: int = 3,
    filters: dict[str, Any] | None = None,
) -> dict[str, list]:
    """Nearest-neighbour search. Returns Node-compatible parallel lists."""
    empty = {"ids": [], "documents": [], "metadatas": [], "distances": []}
    try:
        coll = get_collection(collection_name)
        if coll.count() == 0:
            return empty
        res = coll.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, coll.count()),
            where=_to_where(filters),
            include=["documents", "metadatas", "distances"],
        )
    except Exception as exc:  # noqa: BLE001 - retrieval must never break generation
        log.warning("Chroma query on %s failed: %s", collection_name, exc)
        return empty

    return {
        "ids": (res.get("ids") or [[]])[0],
        "documents": (res.get("documents") or [[]])[0],
        "metadatas": (res.get("metadatas") or [[]])[0],
        "distances": (res.get("distances") or [[]])[0],
    }


def query_by_metadata(
    collection_name: str,
    filters: dict[str, Any],
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Pure metadata lookup, no vector involved (used for BMC blocks)."""
    try:
        coll = get_collection(collection_name)
        res = coll.get(
            where=_to_where(filters),
            limit=limit,
            include=["documents", "metadatas"],
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("Chroma metadata query on %s failed: %s", collection_name, exc)
        return []

    docs = res.get("documents") or []
    metas = res.get("metadatas") or []
    ids = res.get("ids") or []
    return [
        {"id": ids[i] if i < len(ids) else "", "text": docs[i], "metadata": metas[i] if i < len(metas) else {}}
        for i in range(len(docs))
    ]


def list_ids_where(collection_name: str, filters: dict[str, Any]) -> list[str]:
    """Ids matching a metadata filter, without loading documents."""
    try:
        res = get_collection(collection_name).get(where=_to_where(filters), include=[])
    except Exception as exc:  # noqa: BLE001
        log.warning("Chroma id lookup on %s failed: %s", collection_name, exc)
        return []
    return list(res.get("ids") or [])


def count_where(collection_name: str, filters: dict[str, Any]) -> int:
    return len(list_ids_where(collection_name, filters))


def delete_ids(collection_name: str, ids: list[str]) -> None:
    """Remove documents by id; a no-op for an empty list."""
    if not ids:
        return
    try:
        get_collection(collection_name).delete(ids=ids)
    except Exception as exc:  # noqa: BLE001
        log.warning("Chroma delete on %s failed: %s", collection_name, exc)


def is_relevant(distance: float) -> bool:
    return distance < RELEVANCE_DISTANCE_CUTOFF


def stats() -> dict[str, int]:
    """Document counts per collection, for /api/health."""
    out: dict[str, int] = {}
    for name in ALL_COLLECTIONS:
        try:
            out[name] = get_collection(name).count()
        except Exception:  # noqa: BLE001
            out[name] = -1
    return out


def ensure_knowledge_seeded() -> dict[str, int]:
    """Load the bundled knowledge vectors into any empty knowledge collection.

    The corpus is static reference data, already embedded with the same model,
    so it ships inside the image and loads with no API calls. This makes the
    container self-healing: if it restarts onto an empty disk — which is the
    case on Container Apps environments that cannot mount a file share — the
    knowledge base rebuilds itself on startup instead of silently serving
    ungrounded answers.

    `user_context` is deliberately not seeded: it is per-session and is
    repopulated naturally as the user works through the nine steps.
    """
    import json

    from ..config import KNOWLEDGE_DIR

    snapshot = KNOWLEDGE_DIR / "vectors_knowledge.json"
    if not snapshot.exists():
        log.warning("No bundled vector snapshot at %s", snapshot)
        return {}

    loaded: dict[str, int] = {}
    try:
        data = json.loads(snapshot.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        log.error("Could not read bundled vectors: %s", exc)
        return {}

    for name, collection in data.items():
        try:
            if get_collection(name).count() > 0:
                continue
        except Exception:  # noqa: BLE001
            pass

        docs = collection.get("documents") or []
        ids, texts, embeddings, metadatas = [], [], [], []
        for doc in docs:
            if not doc.get("embedding") or not doc.get("text"):
                continue
            ids.append(doc["id"])
            texts.append(doc["text"])
            embeddings.append(doc["embedding"])
            metadatas.append(doc.get("metadata") or {})

        if ids:
            add_documents(
                name, ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas
            )
            loaded[name] = len(ids)
            log.info("Seeded %s with %d bundled documents", name, len(ids))

    return loaded
