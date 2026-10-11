"""Writer plus the QA agents: fact-checker, consistency, critic, synthesizer.

Ported from server/agents/{writerAgent,factCheckerAgent,consistencyAgent,
criticAgent,synthesizer}.js. Every QA agent fails open — if the model errors or
returns unparseable output we report "nothing wrong found" rather than blocking
the user's step on a checker.
"""

from __future__ import annotations

import logging
from typing import Any

from ..services import chroma_store as store
from ..services.gemini_client import generate_text, parse_json_response
from .base import format_rag_context, normalize_agent_item

log = logging.getLogger(__name__)

# ── Writer ────────────────────────────────────────────────────────

WRITER_SYSTEM_PROMPT = """You are an expert business plan writer. Generate detailed, professional content based on the provided context. Be specific to the user's business — avoid generic advice. Structure your output clearly. Reference the user's actual data (business name, industry, customer segments, etc.) throughout.

Guidelines:
- Use concrete numbers, specific market references, and actionable strategies
- If the prompt contains an explicit "TONE:" instruction, follow it exactly; it
  overrides any default register. Otherwise write as a professional business document.
- Organize output with clear headings and structured sections
- Draw directly from the grounding knowledge provided
- Maintain consistency with any previously generated content for this user"""


async def write(prompt: str, rag_context: dict[str, Any], user_story: str) -> str:
    """Single-agent generation for steps with no specialist panel."""
    grounding = format_rag_context(rag_context)
    parts = []
    if grounding:
        parts.append(grounding)
    if user_story:
        parts.append(f"USER'S BUSINESS STORY:\n{user_story}")
    parts.append(prompt)

    return await generate_text(
        "\n\n".join(parts),
        system_prompt=WRITER_SYSTEM_PROMPT,
        temperature=0.7,
        max_output_tokens=8192,
    )


async def revise(original_content: str, corrections: list[str]) -> str:
    """Apply QA corrections while preserving the original structure and tone."""
    if not corrections:
        return original_content

    bullets = "\n".join(f"- {normalize_agent_item(c)}" for c in corrections if c)
    prompt = (
        "Revise the content below so it addresses every correction listed.\n"
        "Preserve the original structure, formatting and tone. Change only what the "
        "corrections require. Return the full revised content and nothing else.\n\n"
        f"=== CORRECTIONS ===\n{bullets}\n\n"
        f"=== CONTENT ===\n{original_content}"
    )

    try:
        return await generate_text(
            prompt,
            system_prompt=WRITER_SYSTEM_PROMPT,
            temperature=0.4,
            max_output_tokens=8192,
        )
    except Exception as exc:  # noqa: BLE001 - a failed revision keeps the original
        log.warning("[WriterAgent] revision failed, keeping original: %s", exc)
        return original_content


# ── Fact checker ──────────────────────────────────────────────────

_FACT_CHECK_PROMPT = """You are a rigorous fact-checker for business plans. Your job is to verify:
1. SDG references match actual UN SDG definitions (e.g., SDG 1 = No Poverty, SDG 7 = Affordable and Clean Energy)
2. Business model claims are logically sound and internally consistent
3. Market claims are reasonable and not wildly exaggerated
4. Financial logic is consistent (revenue projections align with pricing and customer numbers)

For each issue found, provide the exact claim that's wrong and the correction.

IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences. Use this exact structure:
{
  "verified": true/false,
  "issues": ["description of each issue found"],
  "corrections": ["specific correction for each issue"]
}

If everything checks out, return: { "verified": true, "issues": [], "corrections": [] }"""

_CLEAN_FACT_CHECK = {"verified": True, "issues": [], "corrections": []}


async def fact_check(content: str, rag_context: dict[str, Any]) -> dict[str, Any]:
    grounding = format_rag_context(rag_context)
    user_content = (
        (f"=== REFERENCE KNOWLEDGE ===\n{grounding}\n\n" if grounding else "")
        + f"=== CONTENT TO VERIFY ===\n{content}"
    )

    try:
        raw = await generate_text(
            user_content,
            system_prompt=_FACT_CHECK_PROMPT,
            temperature=0.1,
            max_output_tokens=4096,
            json_mode=True,
            disable_thinking=True,
        )
        parsed = parse_json_response(raw)
        if not isinstance(parsed, dict):
            return dict(_CLEAN_FACT_CHECK)
        return {
            "verified": bool(parsed.get("verified", True)),
            "issues": [normalize_agent_item(i) for i in (parsed.get("issues") or []) if i],
            "corrections": [
                normalize_agent_item(c) for c in (parsed.get("corrections") or []) if c
            ],
        }
    except Exception as exc:  # noqa: BLE001 - fail open
        log.warning("[FactChecker] %s", exc)
        return dict(_CLEAN_FACT_CHECK)


# ── Consistency ───────────────────────────────────────────────────

_CONSISTENCY_PROMPT = """You are a consistency reviewer for business plans. Compare the NEW content against the user's PREVIOUS outputs from earlier steps. Check for:
1. Same business name, industry, and target audience referenced throughout
2. Value propositions match what was defined in earlier steps (SWOT/Values)
3. No contradictions between steps (e.g., story says "B2C" but plan mentions "enterprise clients")
4. BMC blocks align with the selected value proposition and customer segments
5. Financial projections are consistent with the business model described

IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences. Use this exact structure:
{
  "consistent": true/false,
  "conflicts": ["description of each conflict found"],
  "suggestions": ["specific suggestion to resolve each conflict"]
}

If everything is consistent, return: { "consistent": true, "conflicts": [], "suggestions": [] }"""

_CLEAN_CONSISTENCY = {"consistent": True, "conflicts": [], "suggestions": []}


async def consistency_check(content: str, session_id: str) -> dict[str, Any]:
    """Compare against this session's earlier step outputs held in Chroma."""
    if not session_id:
        return dict(_CLEAN_CONSISTENCY)

    previous = store.query_by_metadata(
        store.Collections.USER_CONTEXT, {"sessionId": session_id}, limit=20
    )
    if not previous:
        return dict(_CLEAN_CONSISTENCY)

    history = "\n".join(
        f"• [Step: {doc.get('metadata', {}).get('stepId', 'unknown')}] {doc.get('text', '')}"
        for doc in previous
    )
    user_content = (
        f"=== PREVIOUS STEP OUTPUTS ===\n{history}\n\n=== NEW CONTENT ===\n{content}"
    )

    try:
        raw = await generate_text(
            user_content,
            system_prompt=_CONSISTENCY_PROMPT,
            temperature=0.1,
            max_output_tokens=4096,
            json_mode=True,
            disable_thinking=True,
        )
        parsed = parse_json_response(raw)
        if not isinstance(parsed, dict):
            return dict(_CLEAN_CONSISTENCY)
        return {
            "consistent": bool(parsed.get("consistent", True)),
            "conflicts": [normalize_agent_item(c) for c in (parsed.get("conflicts") or []) if c],
            "suggestions": [
                normalize_agent_item(s) for s in (parsed.get("suggestions") or []) if s
            ],
        }
    except Exception as exc:  # noqa: BLE001 - fail open
        log.warning("[ConsistencyAgent] %s", exc)
        return dict(_CLEAN_CONSISTENCY)


# ── Critic ────────────────────────────────────────────────────────

_CRITIC_PROMPT = """You are a senior business consultant reviewing a business plan section. Your role is to rate quality and identify gaps. Evaluate:

1. SPECIFICITY: Is the content specific to this particular business, or is it generic advice that could apply to anyone?
2. COMPLETENESS: Are all required elements present for this type of section?
3. PROFESSIONALISM: Is the language clear, professional, and well-structured?
4. LOGIC: Are there logical gaps, unsupported claims, or missing data?
5. ACTIONABILITY: Could someone actually execute on this plan as written?

Be constructively critical — identify real weaknesses, not nitpicks.

IMPORTANT: Output ONLY valid JSON with no markdown formatting, no code fences. Use this exact structure:
{
  "quality": "high" | "medium" | "low",
  "gaps": ["description of each gap or missing element"],
  "improvements": ["specific actionable improvement suggestion"]
}"""

_NEUTRAL_CRITIC = {"quality": "medium", "gaps": [], "improvements": []}


async def critic_review(content: str) -> dict[str, Any]:
    try:
        raw = await generate_text(
            f"=== CONTENT TO REVIEW ===\n{content}",
            system_prompt=_CRITIC_PROMPT,
            temperature=0.2,
            max_output_tokens=4096,
            json_mode=True,
            disable_thinking=True,
        )
        parsed = parse_json_response(raw)
        if not isinstance(parsed, dict):
            return dict(_NEUTRAL_CRITIC)
        quality = str(parsed.get("quality", "medium")).lower()
        if quality not in {"high", "medium", "low"}:
            quality = "medium"
        return {
            "quality": quality,
            "gaps": [normalize_agent_item(g) for g in (parsed.get("gaps") or []) if g],
            "improvements": [
                normalize_agent_item(i) for i in (parsed.get("improvements") or []) if i
            ],
        }
    except Exception as exc:  # noqa: BLE001 - fail open
        log.warning("[CriticAgent] %s", exc)
        return dict(_NEUTRAL_CRITIC)


# ── Synthesizer ───────────────────────────────────────────────────

_SYNTH_SYSTEM_PROMPT = """You are the synthesis layer of a Multi-Intelligence Agent system. Several specialist agents have analysed the same business from different angles. Merge their findings into one coherent answer to the task.

Rules:
- Produce the deliverable the task asks for, in exactly the format it requests.
- Where specialists agree, state it once. Where they conflict, prefer the better-evidenced position and note the trade-off rather than averaging them away.
- Never mention the agents, the synthesis process, or that multiple analyses existed.
- If the task asks for JSON, output ONLY valid JSON with no markdown fences."""


def detect_conflicts(specialists: dict[str, Any]) -> list[dict[str, str]]:
    """Surface disagreements worth showing in the Agent Context panel.

    Mirrors synthesizer.detectConflicts: a warning raised by one specialist that
    another's insights do not acknowledge is reported as a conflict, and low
    confidence alongside high confidence is itself a signal.
    """
    conflicts: list[dict[str, str]] = []
    active = {k: v for k, v in specialists.items() if v and not v.get("failed")}

    for agent_id, result in active.items():
        for warning in result.get("warnings") or []:
            for other_id, other in active.items():
                if other_id == agent_id:
                    continue
                if (other.get("confidence") or 0) >= 0.7:
                    conflicts.append(
                        {
                            "between": f"{agent_id} vs {other_id}",
                            "issue": warning,
                            "resolution": (
                                f"{agent_id} flagged this while {other_id} reported high "
                                "confidence; the warning is retained in the output."
                            ),
                        }
                    )
                    break

    # De-duplicate on the issue text — several agents often raise the same point.
    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for conflict in conflicts:
        if conflict["issue"] in seen:
            continue
        seen.add(conflict["issue"])
        unique.append(conflict)
    return unique[:5]


async def synthesize(
    *,
    prompt: str,
    specialists: dict[str, Any],
    conflicts: list[dict[str, str]],
    rag_context: dict[str, Any],
    user_story: str,
    step_id: str,
) -> dict[str, Any]:
    """Merge specialist findings into the step's deliverable."""
    blocks: list[str] = []

    grounding = format_rag_context(rag_context)
    if grounding:
        blocks.append(grounding)
    if user_story:
        blocks.append(f"=== USER'S BUSINESS STORY ===\n{user_story}")

    for agent_id, result in specialists.items():
        if not result or result.get("failed"):
            continue
        lines = [f"=== {agent_id.upper()} SPECIALIST (confidence {result.get('confidence', 0)}) ==="]
        for insight in result.get("insights") or []:
            lines.append(f"• {insight}")
        for warning in result.get("warnings") or []:
            lines.append(f"⚠ {warning}")
        blocks.append("\n".join(lines))

    if conflicts:
        lines = ["=== UNRESOLVED CONFLICTS ==="]
        for conflict in conflicts:
            lines.append(f"• [{conflict['between']}] {conflict['issue']}")
        blocks.append("\n".join(lines))

    blocks.append(f"=== WORKFLOW STEP ===\n{step_id}")
    blocks.append(f"=== TASK ===\n{prompt}")

    content = await generate_text(
        "\n\n".join(blocks),
        system_prompt=_SYNTH_SYSTEM_PROMPT,
        temperature=0.7,
        max_output_tokens=8192,
    )

    active = [a for a, r in specialists.items() if r and not r.get("failed")]
    if conflicts:
        notes = (
            f"Resolved {len(conflicts)} conflict(s) between specialist agents. "
            "Critique/SDG warnings prioritized where applicable."
        )
    elif active:
        notes = f"All specialist agents aligned; outputs merged without conflicts ({', '.join(active)})."
    else:
        notes = "No specialist agents available; content written directly."

    return {"content": content, "synthesisNotes": notes}
