"""Shared agent helpers.

Ported from server/agents/baseAgent.js: timeout wrapping, graceful fallback
results, and normalisation of model output into frontend-safe strings.

The output shape here is load-bearing — src/App.jsx and the dashboard panels
read `agentId`, `insights`, `warnings`, `sources`, `confidence` (a number in
0..1) and `failed` directly. Anything else renders as "[object Object]".
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Awaitable, Callable, TypeVar

from ..config import AGENT_TIMEOUT_SECONDS

log = logging.getLogger(__name__)

T = TypeVar("T")

# Keys the model might use instead of "insights", tried in order.
_INSIGHT_ALIASES = (
    "findings",
    "tensions",
    "dilemmas",
    "observations",
    "keyInsights",
    "analysis",
    "points",
    "items",
)
_PROSE_ALIASES = ("summary", "narrative", "output")
_ITEM_TEXT_KEYS = ("text", "message", "description", "content", "insight", "warning", "label")


class AgentTimeout(RuntimeError):
    pass


async def run_with_timeout(
    factory: Callable[[], Awaitable[T]],
    seconds: float | None = None,
) -> T:
    """Await a coroutine, raising AgentTimeout if it overruns."""
    limit = AGENT_TIMEOUT_SECONDS if seconds is None else seconds
    try:
        return await asyncio.wait_for(factory(), timeout=limit)
    except asyncio.TimeoutError as exc:
        raise AgentTimeout(f"Agent timed out after {int(limit * 1000)}ms") from exc


def create_fallback_result(agent_id: str, error_message: str) -> dict[str, Any]:
    """Degraded-but-usable result so one failing specialist cannot sink a step."""
    return {
        "agentId": agent_id,
        "insights": [],
        "confidence": 0,
        "sources": [],
        "warnings": [f"Agent failed: {error_message}"],
        "failed": True,
    }


def normalize_agent_item(item: Any) -> str:
    """Flatten one insight/warning/source entry to a plain string."""
    if item is None:
        return ""
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, bool):
        return "true" if item else "false"
    if isinstance(item, (int, float)):
        return str(item)

    if isinstance(item, dict):
        # The SDG agent in particular emits structured greenwashing flags.
        explanation = item.get("explanation")
        if explanation:
            parts: list[str] = []
            if item.get("type"):
                parts.append(f"[{item['type']}]")
            if item.get("flag"):
                parts.append(str(item["flag"]))
            parts.append(str(explanation))
            if item.get("impact_metrics_recommendation"):
                parts.append(f"Metrics: {item['impact_metrics_recommendation']}")
            return " ".join(parts).strip()

        for key in _ITEM_TEXT_KEYS:
            value = item.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        try:
            return json.dumps(item)
        except (TypeError, ValueError):
            return ""

    return str(item)


def _to_string_list(value: Any) -> list[str]:
    if not value:
        return []
    items = value if isinstance(value, list) else [value]
    return [s for s in (normalize_agent_item(i) for i in items) if s]


def normalize_agent_output(raw: Any, agent_id: str) -> dict[str, Any]:
    """Coerce whatever the model returned into the shape the frontend expects."""
    parsed: dict[str, Any] = raw if isinstance(raw, dict) else {}

    confidence = parsed.get("confidence")
    if not isinstance(confidence, (int, float)) or isinstance(confidence, bool):
        confidence = 0.5
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.5
    if confidence != confidence:  # NaN
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))

    insights = _to_string_list(parsed.get("insights"))
    if not insights:
        for key in _INSIGHT_ALIASES:
            if parsed.get(key) is None:
                continue
            insights = _to_string_list(parsed[key])
            if insights:
                break
    if not insights:
        for key in _PROSE_ALIASES:
            value = parsed.get(key)
            if isinstance(value, str) and value.strip():
                insights = [value.strip()]
                break

    return {
        "agentId": agent_id,
        "insights": insights,
        "warnings": _to_string_list(parsed.get("warnings")),
        "sources": _to_string_list(parsed.get("sources")),
        "confidence": confidence,
        "failed": False,
    }


def validate_agent_output(raw: Any, agent_id: str) -> dict[str, Any]:
    """Normalise plus a record of what had to be coerced (used in tests/logs)."""
    normalized = normalize_agent_output(raw, agent_id)
    errors: list[str] = []

    if isinstance(raw, dict):
        for field in ("insights", "warnings", "sources"):
            value = raw.get(field)
            if value is None:
                continue
            if not isinstance(value, list):
                errors.append(f"{field} coerced from non-array")
            elif any(isinstance(i, (dict, list)) for i in value):
                errors.append(f"{field} contained nested objects — normalized to strings")
    else:
        errors.append("Output is not an object")

    return {"valid": not errors, "errors": errors, "normalized": normalized}


def format_rag_context(rag_context: dict[str, Any]) -> str:
    """Render retrieved context into the grounding block given to the writer."""
    if not rag_context:
        return ""

    # The plan step builds a richer block in plan_rag_service.
    pre_rendered = rag_context.get("planRagText")
    if pre_rendered:
        return pre_rendered

    sections: list[str] = []

    knowledge = rag_context.get("knowledge") or []
    if knowledge:
        body = "\n".join(f"- {item.get('text', '')}" for item in knowledge)
        sections.append(f"GROUNDING KNOWLEDGE:\n{body}")

    history = rag_context.get("userHistory") or []
    if history:
        body = "\n".join(
            f"- [{item.get('step', 'unknown')}] {item.get('text', '')}" for item in history
        )
        sections.append(f"THIS USER'S EARLIER STEPS:\n{body}")

    uploads = rag_context.get("uploads") or []
    if uploads:
        from ..services.rag_service import format_uploads_block  # local: keeps base import-light

        sections.append(format_uploads_block(uploads))

    return "\n\n".join(sections)
