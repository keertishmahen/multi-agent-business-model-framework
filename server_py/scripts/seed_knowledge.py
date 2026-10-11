"""Seed the knowledge collections from app/knowledge/*.json.

Ports server/services/knowledgeSeeder.js chunking so documents keep the same ids
and text, which means re-seeding is idempotent and matches the imported vectors.

Requires GEMINI_API_KEY (it embeds each chunk).

    python scripts/seed_knowledge.py                 # only what is missing
    python scripts/seed_knowledge.py --only business_plan_sections
    python scripts/seed_knowledge.py --force         # re-embed everything
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import KNOWLEDGE_DIR  # noqa: E402
from app.services import chroma_store as store  # noqa: E402
from app.services.gemini_client import generate_embedding  # noqa: E402

Chunk = dict[str, str]


def _load(name: str) -> dict[str, Any]:
    path = KNOWLEDGE_DIR / name
    return json.loads(path.read_text(encoding="utf-8"))


def _humanize(key: str) -> str:
    out = []
    for ch in key:
        if ch.isupper():
            out.append(" ")
        out.append(ch)
    return "".join(out).strip().title()


def _slug(text: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in text.lower()).strip("_")


def _flatten(value: Any) -> str:
    """Render a nested knowledge blob into a single readable paragraph."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return " ".join(part for part in (_flatten(v) for v in value) if part)
    if isinstance(value, dict):
        parts = []
        for key, val in value.items():
            text = _flatten(val)
            if text:
                parts.append(f"{_humanize(str(key))}: {text}")
        return " ".join(parts)
    return str(value)


def chunk_frameworks(data: dict[str, Any]) -> list[Chunk]:
    chunks: list[Chunk] = []
    for key, value in data.items():
        title = _humanize(key)
        body = _flatten(value)
        if body:
            chunks.append({"id": _slug(key), "title": title, "text": f"{title}: {body}"})
    return chunks


def chunk_sdgs(data: dict[str, Any]) -> list[Chunk]:
    chunks: list[Chunk] = []
    for goal in data.get("goals", []):
        number = goal.get("number") or goal.get("id")
        title = goal.get("title") or goal.get("name") or f"SDG {number}"
        body = _flatten({k: v for k, v in goal.items() if k not in {"number", "id"}})
        chunks.append(
            {"id": f"sdg_{number}", "title": f"SDG {number} - {title}", "text": f"SDG {number} {title}: {body}"}
        )
    return chunks


def chunk_industry(data: dict[str, Any]) -> list[Chunk]:
    chunks: list[Chunk] = []
    for group, value in data.items():
        if isinstance(value, dict):
            for key, inner in value.items():
                body = _flatten(inner)
                if not body:
                    continue
                label = f"{_humanize(group)} - {_humanize(key)}"
                chunks.append(
                    {"id": _slug(f"{group}_{key}"), "title": label, "text": f"{label}: {body}"}
                )
        else:
            body = _flatten(value)
            if body:
                chunks.append(
                    {"id": _slug(group), "title": _humanize(group), "text": f"{_humanize(group)}: {body}"}
                )
    return chunks


def chunk_plan_sections(data: dict[str, Any]) -> list[Chunk]:
    """Mirrors knowledgeSeeder.chunkBusinessPlanSections exactly."""
    chunks: list[Chunk] = []
    for section in data.get("sections", []):
        text = (
            f"Business Plan Section {section['number']}. {section['title']}: "
            f"{section['purpose']} "
            f"Key questions: {' '.join(section.get('keyQuestions', []))} "
            f"Example metrics: {', '.join(section.get('exampleMetrics', []))}. "
            f"Anti-hallucination rules: {' '.join(section.get('antiHallucinationRules', []))}"
        )
        chunks.append(
            {
                "id": f"plan_section_{section['id']}",
                "title": f"Business Plan - {section['title']}",
                "text": text,
            }
        )
    return chunks


SOURCES = {
    store.Collections.FRAMEWORKS: ("frameworks.json", chunk_frameworks),
    store.Collections.SDGS: ("sdgs.json", chunk_sdgs),
    store.Collections.INDUSTRY: ("industry.json", chunk_industry),
    store.Collections.BUSINESS_PLAN: ("business_plan_sections.json", chunk_plan_sections),
}


async def seed_collection(name: str, chunks: list[Chunk]) -> int:
    stored = 0
    for chunk in chunks:
        try:
            embedding = await generate_embedding(chunk["text"])
        except Exception as exc:  # noqa: BLE001
            print(f"    ✗ {chunk['id']}: {exc}")
            continue
        store.add_documents(
            name,
            ids=[chunk["id"]],
            documents=[chunk["text"]],
            embeddings=[embedding],
            metadatas=[{"title": chunk.get("title", chunk["id"])}],
        )
        stored += 1
    return stored


async def main_async(only: str | None, force: bool) -> int:
    counts = store.stats()
    total = 0

    for name, (filename, chunker) in SOURCES.items():
        if only and name != only:
            continue
        if not force and counts.get(name, 0) > 0:
            print(f"  ↷ {name}: already has {counts[name]} documents (use --force to re-seed)")
            continue

        chunks = chunker(_load(filename))
        print(f"  → {name}: embedding {len(chunks)} chunks …")
        stored = await seed_collection(name, chunks)
        total += stored
        print(f"  ✓ {name}: {stored} documents")

    print("\nCounts now:")
    for name, count in store.stats().items():
        print(f"  {name}: {count}")
    return 0 if total or only is None else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", choices=list(SOURCES.keys()), default=None)
    parser.add_argument("--force", action="store_true", help="re-seed even if populated")
    args = parser.parse_args()
    return asyncio.run(main_async(args.only, args.force))


if __name__ == "__main__":
    raise SystemExit(main())
