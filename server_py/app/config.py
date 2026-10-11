"""Runtime configuration, read once from the environment."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# ── Gemini ────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

# Kept identical to the Node implementation so prompts and the persisted
# vectors stay valid across the migration.
CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")

# ── Server ────────────────────────────────────────────────────────
PORT = int(os.getenv("PORT", "3002"))
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")

# ── Vector store ──────────────────────────────────────────────────
# A real persistent Chroma client, unlike the Node version which only ever
# had an in-memory store behind a Chroma-shaped interface.
BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_PATH = os.getenv("CHROMA_PATH", str(BASE_DIR / "chroma"))
KNOWLEDGE_DIR = Path(__file__).resolve().parent / "knowledge"

# ── Agent behaviour ───────────────────────────────────────────────
# 30s was too tight: the feedback deck shows "Financial Modelling — Agent failed:
# Agent timed out after 30000ms". Specialists now also get one retry, so this
# covers two round trips.
AGENT_TIMEOUT_SECONDS = float(os.getenv("AGENT_TIMEOUT_SECONDS", "90"))
MAX_REWRITES = 2

# Retrieval: cosine distance above this is treated as irrelevant.
RELEVANCE_DISTANCE_CUTOFF = 1.5
