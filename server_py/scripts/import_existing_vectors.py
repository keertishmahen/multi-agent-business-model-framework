"""Import the Node server's persisted vectors into Chroma.

server/data/vectors.json holds documents already embedded with
gemini-embedding-001 — the same model this backend uses — so they can be loaded
straight in with no API calls and no re-embedding cost.

Note: that file has no `business_plan_sections` collection. It was never seeded,
which is why the plan step's RAG has been querying an empty collection. Run
seed_knowledge.py afterwards to fill it.

    python scripts/import_existing_vectors.py [--include-user-context]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services import chroma_store as store  # noqa: E402

DEFAULT_SOURCE = Path(__file__).resolve().parents[2] / "server" / "data" / "vectors.json"

# Smoke-test session data — not knowledge, so excluded unless asked for.
USER_COLLECTION = "user_context"

BATCH = 100


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument(
        "--include-user-context",
        action="store_true",
        help="also import the old smoke-test session documents",
    )
    args = parser.parse_args()

    if not args.source.exists():
        print(f"✗ Source not found: {args.source}")
        return 1

    print(f"Reading {args.source} …")
    data = json.loads(args.source.read_text(encoding="utf-8"))

    total = 0
    for name, collection in data.items():
        if name == USER_COLLECTION and not args.include_user_context:
            print(f"  ↷ skipping {name} (smoke-test data; pass --include-user-context to import)")
            continue

        docs = collection.get("documents") or []
        if not docs:
            print(f"  · {name}: empty")
            continue

        imported = 0
        for start in range(0, len(docs), BATCH):
            window = docs[start : start + BATCH]
            ids, texts, embeddings, metadatas = [], [], [], []
            for doc in window:
                embedding = doc.get("embedding")
                text = doc.get("text")
                if not embedding or not text:
                    continue
                ids.append(doc["id"])
                texts.append(text)
                embeddings.append(embedding)
                metadatas.append(doc.get("metadata") or {})

            if ids:
                store.add_documents(
                    name,
                    ids=ids,
                    documents=texts,
                    embeddings=embeddings,
                    metadatas=metadatas,
                )
                imported += len(ids)

        total += imported
        print(f"  ✓ {name}: {imported} documents")

    print(f"\nImported {total} documents into {store.get_client()}")
    print("Counts now:")
    for name, count in store.stats().items():
        print(f"  {name}: {count}")

    if store.stats().get(store.Collections.BUSINESS_PLAN, 0) == 0:
        print(
            "\n⚠ business_plan_sections is still empty — run "
            "`python scripts/seed_knowledge.py` (needs GEMINI_API_KEY) so the "
            "BMC → business plan retrieval has guidance to draw on."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
