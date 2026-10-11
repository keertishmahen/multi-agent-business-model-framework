# Business Model Studio RAG + MIA backend (Python / FastAPI)

Replaces the Node/Express server in `../server`. Same routes, same payloads — the
React client only needs a different base URL.

## Why it was rewritten

The Node backend declared a ChromaDB-shaped interface but never used ChromaDB:
`server/services/chromaClient.js` was an in-memory dict persisted to a 10 MB
`server/data/vectors.json`, and `server/package.json` pulled in only
`express`, `cors` and `dotenv` — no vector database, no LLM SDK.

Embeddings *were* real (Gemini `gemini-embedding-001`), so the existing vectors
were imported straight into Chroma with no re-embedding cost.

One real bug surfaced during the migration: **`business_plan_sections` had never
been seeded**. The BMC → business plan retrieval queried it on every plan
generation and always got nothing back, which is a large part of why the RAG link
between the canvas and the plan looked missing. It is now seeded (10 documents).

## Layout

```
app/
  main.py                FastAPI app + CORS
  config.py              env-driven settings
  routers/               generate · context · health
  agents/
    base.py              timeouts, fallbacks, output normalisation
    specialists.py       market · financial · sdg · critique
    quality.py           writer · fact-checker · consistency · critic · synthesizer
    orchestrator.py      hub-and-spoke pipeline
  services/
    gemini_client.py     chat + embeddings
    chroma_store.py      real PersistentClient
    rag_service.py       per-step retrieval + BMC→plan hybrid retrieval
  knowledge/*.json       seed corpus
scripts/
  import_existing_vectors.py   load server/data/vectors.json (no API calls)
  seed_knowledge.py            embed + seed from knowledge/*.json
tests/                   pytest, no network
```

## API

| Method | Path | Notes |
|---|---|---|
| `GET`  | `/api/health` | status + per-collection document counts |
| `POST` | `/api/generate` | `{prompt, stepId, sessionId, userStory, options, useAgents}` |
| `POST` | `/api/generate/stream` | SSE; resolves on `event: complete` carrying `response` |
| `POST` | `/api/context/store` | persists a step output; BMC is always chunked per block |

## Local development

```bash
cd server_py
python -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt   # Windows
# source .venv/bin/activate && pip install -r requirements.txt  # macOS/Linux

cp ../server/.env .env          # needs GEMINI_API_KEY
python scripts/import_existing_vectors.py   # 71 docs, no API calls
python scripts/seed_knowledge.py            # fills business_plan_sections

uvicorn app.main:app --reload --port 3002
pytest -q
```

Note: `chromadb` is pinned to **1.x**. The 0.6.x line depends on
`chroma-hnswlib`, which has no prebuilt wheel for Windows / Python 3.13 and
needs a C++ toolchain to build.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | required |
| `GEMINI_CHAT_MODEL` | `gemini-2.5-flash` | |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | changing this invalidates stored vectors |
| `PORT` | `3002` | |
| `CORS_ORIGIN` | `*` | comma-separated frontend origins |
| `CHROMA_PATH` | `./chroma` | **mount a volume here in production** |
| `AGENT_TIMEOUT_SECONDS` | `30` | per specialist |

## Container

```bash
docker build -t bms-api .
docker run -p 3002:3002 -e GEMINI_API_KEY=… -v bms-chroma:/data/chroma bms-api
```
