# Multi-agent business model framework

A multi-agent LLM system that drafts business models and then argues with itself about them. Specialist agents
produce candidate content in parallel, a synthesis step merges it, and a quality layer — fact-checker,
consistency checker, critic — attacks the result and can send it back for a bounded number of rewrites.

Built as an MSc project at Cranfield University. React frontend, FastAPI backend, Gemini for generation,
ChromaDB for retrieval.

---

## The interesting part: generation is cheap, critique is the hard bit

Getting an LLM to write a plausible business model takes one prompt. The output is fluent and frequently wrong
in ways that are invisible unless you check — invented market sizes, financials inconsistent with the strategy
three sections earlier, claims with no support in the user's own inputs. The whole design here is about
catching that.

**Pipeline** (`server_py/app/agents/`):

```
          user input + uploaded documents
                        │
                        ▼
      ┌─────────── RAG retrieval ───────────┐     hybrid: metadata-filtered exact lookup of
      │        (services/rag_service.py)    │     prior steps + semantic sweep of the knowledge base
      └────────────────┬────────────────────┘
                       ▼
        ┌──────────────┴───────────────┐
        │   four specialists, parallel │   market · financial · SDG alignment · critique
        │      (agents/specialists.py) │
        └──────────────┬───────────────┘
                       ▼
                   synthesis
                       ▼
        ┌──────────────┴───────────────┐
        │   QA layer (agents/quality.py)│  fact-checker · consistency · critic
        └──────────────┬───────────────┘
                       │  fails → rewrite (bounded by MAX_REWRITES)
                       ▼
                    output
```

Design decisions worth pointing at:

- **Agents are grounded, not freewheeling.** Every specialist reads the retrieved evidence for the current step.
  When the user has curated evidence in the RAG step, the agents are grounded on exactly that, not on a fresh
  retrieval — so what the user approved is what the model reasons over.
- **QA agents fail open** (`agents/quality.py`). If the fact-checker itself errors or times out, the pipeline
  degrades to the unchecked draft rather than dropping the user's work. That is a deliberate trade-off and it is
  documented in the code, because the alternative — failing closed on a flaky model call — made the product
  unusable.
- **The rewrite loop is bounded.** `MAX_REWRITES` exists because critic-driven rewriting does not reliably
  converge; without a cap, agents will cheerfully revise each other in circles.
- **`STEP_AGENT_MAP` must stay in sync with the frontend's `src/constants/agents.js`** — noted in
  `orchestrator.py`, because the two drifting apart was a real bug.

## An honest note on the retrieval layer

An earlier version of this project used a Node backend whose "Chroma client" was, on inspection, an in-memory
dictionary with no persistence and no embedding model — it looked like vector search and was not. A second bug
meant one collection was never seeded at all, so retrieval over it silently returned nothing and the agents
filled the gap with invention.

Neither failure threw an error. Both produced confident, plausible output. That is the reason this rewrite
(`server_py/`) uses a real persisted Chroma store, returns `sources` to the frontend so retrieved evidence is
visible in the UI, and has regression tests around the retrieval path. `server_py/README.md` has the longer
write-up.

## Layout

| Path | What |
|---|---|
| `server_py/app/agents/` | `base.py` (timeouts, fallbacks, output normalisation), `specialists.py`, `quality.py`, `orchestrator.py` |
| `server_py/app/services/` | `gemini_client.py`, `chroma_store.py`, `rag_service.py`, `document_ingest.py` |
| `server_py/app/routers/` | `generate.py` (incl. SSE streaming), `rag.py`, `context.py` |
| `server_py/tests/` | pytest, `asyncio_mode=auto`, no network calls |
| `src/` | React app — step workflow, agent progress, evidence display |

Python code uses `from __future__ import annotations`, type hints throughout, and module-level docstrings that
explain the reasoning rather than restating the code.

## Running it

Requires Python 3.11+, Node 18+, and a Google Gemini API key.

```bash
# backend
cd server_py
pip install -r requirements.txt
cp .env.example .env            # add your GEMINI_API_KEY
python scripts/seed_knowledge.py
uvicorn app.main:app --reload --port 3002

# frontend
npm install
npm start                       # :3000
```

Tests:

```bash
cd server_py && pytest          # backend
npm test                        # frontend
```

## Status

Research prototype. The agent pipeline, retrieval layer and QA loop work end to end. There is no CI and no
Python linter config yet, and `rag_service.py` is longer than it should be.

## Licence

MIT — see [LICENSE](LICENSE).
