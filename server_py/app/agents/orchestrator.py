"""MIA hub-and-spoke orchestrator.

Flow: RAG → parallel specialists → synthesis → QA pipeline.
Ported from server/agents/orchestrator.js, preserving STEP_AGENT_MAP, the stage
names emitted over SSE, and the agentMetadata shape the frontend reducer reads.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Awaitable, Callable

from ..config import MAX_REWRITES
from ..services.rag_service import retrieve_context
from . import quality
from .base import AgentTimeout, create_fallback_result, normalize_agent_output, run_with_timeout
from .specialists import analyze as run_specialist

log = logging.getLogger(__name__)

ProgressFn = Callable[[dict[str, Any]], Awaitable[None] | None]

# Which specialists run per workflow step.
#
# MUST stay in sync with STEP_AGENTS in src/constants/agents.js — the frontend
# uses its copy to seed the agent panel before streaming starts, so any drift
# shows up as cards that never leave "Standby".
#
# All four specialists now contribute to every generating step. Previously
# Market and Financial only ran on bmc/plan, which left two of the four cards
# idle for most of the workflow and read as the agents being broken. They run
# concurrently, so wall-clock cost is roughly flat.
_ALL_SPECIALISTS = {"market": True, "financial": True, "sdg": True, "critique": True}

STEP_AGENT_MAP: dict[str, dict[str, bool]] = {
    "focus": dict(_ALL_SPECIALISTS),
    "issues": dict(_ALL_SPECIALISTS),
    "tensions": dict(_ALL_SPECIALISTS),
    "dilemmas": dict(_ALL_SPECIALISTS),
    "values": dict(_ALL_SPECIALISTS),
    "swot": dict(_ALL_SPECIALISTS),
    "bmc": dict(_ALL_SPECIALISTS),
    "plan": dict(_ALL_SPECIALISTS),
}

CONSISTENCY_STEPS = {
    "tensions",
    "dilemmas",
    "values",
    "swot",
    "bmc",
    "plan",
    "businessplan",
    "sdg",
}
CRITIC_STEPS = {"bmc", "plan", "businessplan"}


def should_use_mia(step_id: str) -> bool:
    return step_id in STEP_AGENT_MAP


async def _emit(on_progress: ProgressFn | None, event: str, data: dict[str, Any]) -> None:
    if on_progress is None:
        return
    payload = {"event": event, **data, "timestamp": int(time.time() * 1000)}
    result = on_progress(payload)
    if asyncio.iscoroutine(result):
        await result


def _push_stage(stages: list[dict[str, Any]], name: str, status: str, **extra) -> dict[str, Any]:
    stage = {"name": name, "status": status, "timestamp": int(time.time() * 1000), **extra}
    stages.append(stage)
    return stage


async def _run_specialists(
    agent_config: dict[str, bool],
    params: dict[str, Any],
    stages: list[dict[str, Any]],
    on_progress: ProgressFn | None,
) -> dict[str, Any]:
    """Run the step's specialists concurrently; one failure never sinks the rest."""
    agent_ids = [agent_id for agent_id, enabled in agent_config.items() if enabled]

    async def run_one(agent_id: str) -> tuple[str, dict[str, Any]]:
        stage = _push_stage(stages, agent_id, "running")
        await _emit(on_progress, "stage", {"name": agent_id, "status": "running"})

        try:
            result = await run_with_timeout(
                lambda: run_specialist(
                    agent_id,
                    prompt=params["prompt"],
                    rag_context=params["ragContext"],
                    user_story=params["userStory"],
                    step_id=params["stepId"],
                )
            )
        except AgentTimeout as exc:
            log.error("[Orchestrator] %s agent timed out: %s", agent_id, exc)
            result = create_fallback_result(agent_id, str(exc))
        except Exception as exc:  # noqa: BLE001
            log.error("[Orchestrator] %s agent failed: %s", agent_id, exc)
            result = create_fallback_result(agent_id, str(exc))

        status = "degraded" if result.get("failed") else "complete"
        stage["status"] = status
        stage["confidence"] = result.get("confidence")
        if result.get("failed"):
            stage["error"] = result.get("warnings", [""])[0] if result.get("warnings") else ""

        await _emit(on_progress, "specialist", {"agentId": agent_id, "result": result})
        await _emit(
            on_progress,
            "stage",
            {"name": agent_id, "status": status, "confidence": result.get("confidence")},
        )
        return agent_id, result

    settled = await asyncio.gather(*(run_one(a) for a in agent_ids), return_exceptions=True)

    specialists: dict[str, Any] = {}
    for item in settled:
        if isinstance(item, BaseException):
            log.error("[Orchestrator] specialist task raised: %s", item)
            continue
        agent_id, result = item
        specialists[agent_id] = result
    return specialists


async def _run_qa_pipeline(
    content: str,
    params: dict[str, Any],
    stages: list[dict[str, Any]],
    on_progress: ProgressFn | None,
) -> dict[str, Any]:
    """Fact-check → consistency → critic, each able to trigger one rewrite."""
    rewrite_count = 0
    step_id = params["stepId"]
    session_id = params["sessionId"]
    rag_context = params["ragContext"]

    stage = _push_stage(stages, "fact-checker", "running")
    await _emit(on_progress, "stage", {"name": "fact-checker", "status": "running"})
    fact_check = await quality.fact_check(content, rag_context)
    stage["status"] = "complete"
    stage["issues"] = len(fact_check["issues"])
    await _emit(on_progress, "stage", {"name": "fact-checker", "status": "complete"})

    if fact_check["issues"] and rewrite_count < MAX_REWRITES:
        stage = _push_stage(stages, "writer-revision-factcheck", "running")
        await _emit(on_progress, "stage", {"name": "writer-revision-factcheck", "status": "running"})
        content = await quality.revise(content, fact_check["corrections"])
        rewrite_count += 1
        stage["status"] = "complete"
        await _emit(
            on_progress, "stage", {"name": "writer-revision-factcheck", "status": "complete"}
        )

    consistency = None
    if step_id in CONSISTENCY_STEPS:
        stage = _push_stage(stages, "consistency", "running")
        await _emit(on_progress, "stage", {"name": "consistency", "status": "running"})
        consistency = await quality.consistency_check(content, session_id)
        stage["status"] = "complete"
        stage["conflicts"] = len(consistency["conflicts"])
        await _emit(on_progress, "stage", {"name": "consistency", "status": "complete"})

        if consistency["conflicts"] and rewrite_count < MAX_REWRITES:
            stage = _push_stage(stages, "writer-revision-consistency", "running")
            await _emit(
                on_progress, "stage", {"name": "writer-revision-consistency", "status": "running"}
            )
            content = await quality.revise(content, consistency["suggestions"])
            rewrite_count += 1
            stage["status"] = "complete"
            await _emit(
                on_progress, "stage", {"name": "writer-revision-consistency", "status": "complete"}
            )

    critic = None
    if step_id in CRITIC_STEPS:
        stage = _push_stage(stages, "critic", "running")
        await _emit(on_progress, "stage", {"name": "critic", "status": "running"})
        critic = await quality.critic_review(content)
        stage["status"] = "complete"
        stage["quality"] = critic["quality"]
        await _emit(on_progress, "stage", {"name": "critic", "status": "complete"})

        if critic["quality"] == "low" and rewrite_count < MAX_REWRITES:
            stage = _push_stage(stages, "writer-revision-critic", "running")
            await _emit(
                on_progress, "stage", {"name": "writer-revision-critic", "status": "running"}
            )
            improvements = list(critic["improvements"]) + [
                f"Fill gap: {gap}" for gap in critic["gaps"]
            ]
            content = await quality.revise(content, improvements)
            rewrite_count += 1
            stage["status"] = "complete"
            await _emit(
                on_progress, "stage", {"name": "writer-revision-critic", "status": "complete"}
            )

    return {
        "content": content,
        "factCheck": fact_check,
        "consistencyCheck": consistency,
        "criticReview": critic,
        "rewriteCount": rewrite_count,
    }


async def orchestrate(
    *,
    prompt: str,
    step_id: str,
    session_id: str = "default",
    user_story: str = "",
    options: dict[str, Any] | None = None,
    on_progress: ProgressFn | None = None,
) -> dict[str, Any]:
    """Run the full pipeline for one step and return the frontend payload."""
    options = options or {}
    stages: list[dict[str, Any]] = []
    started = time.time()
    agent_config = STEP_AGENT_MAP.get(step_id)

    log.info("[Orchestrator] Starting MIA pipeline for step: %s", step_id)

    await _emit(on_progress, "stage", {"name": "context-retrieval", "status": "running"})
    stage = _push_stage(stages, "context-retrieval", "running")
    rag_context = await retrieve_context(
        prompt,
        step_id,
        session_id,
        {
            "selectedVpTitle": options.get("selectedVpTitle", ""),
            # Evidence the user approved in the RAG step (plan only).
            "curatedContext": options.get("curatedContext"),
        },
    )
    stage["status"] = "complete"
    await _emit(on_progress, "stage", {"name": "context-retrieval", "status": "complete"})

    specialists: dict[str, Any] = {}
    conflicts: list[dict[str, str]] = []
    synthesis_notes = ""

    if agent_config:
        specialists = await _run_specialists(
            agent_config,
            {
                "prompt": prompt,
                "ragContext": rag_context,
                "userStory": user_story,
                "stepId": step_id,
            },
            stages,
            on_progress,
        )

        conflicts = quality.detect_conflicts(specialists)

        stage = _push_stage(stages, "synthesis", "running")
        await _emit(on_progress, "stage", {"name": "synthesis", "status": "running"})
        synthesis = await quality.synthesize(
            prompt=prompt,
            specialists=specialists,
            conflicts=conflicts,
            rag_context=rag_context,
            user_story=user_story,
            step_id=step_id,
        )
        content = synthesis["content"]
        synthesis_notes = synthesis["synthesisNotes"]
        stage["status"] = "complete"
        await _emit(on_progress, "stage", {"name": "synthesis", "status": "complete"})
    else:
        stage = _push_stage(stages, "writer", "running")
        await _emit(on_progress, "stage", {"name": "writer", "status": "running"})
        content = await quality.write(prompt, rag_context, user_story)
        stage["status"] = "complete"
        await _emit(on_progress, "stage", {"name": "writer", "status": "complete"})

    qa = await _run_qa_pipeline(
        content,
        {"stepId": step_id, "sessionId": session_id, "ragContext": rag_context},
        stages,
        on_progress,
    )
    content = qa["content"]

    # Belt and braces: everything the frontend renders must be string-safe.
    for agent_id, spec in list(specialists.items()):
        if spec and not spec.get("failed"):
            specialists[agent_id] = normalize_agent_output(spec, agent_id)

    total_ms = int((time.time() - started) * 1000)
    log.info("[Orchestrator] Pipeline complete in %dms", total_ms)

    critic = qa["criticReview"] or {}
    consistency = qa["consistencyCheck"] or {}

    agent_metadata = {
        "stages": [s["name"] for s in stages],
        "stagesDetail": stages,
        "specialists": specialists,
        "synthesisNotes": synthesis_notes,
        "conflicts": conflicts,
        "factCheckIssues": len(qa["factCheck"]["issues"]),
        "factCheckCorrections": qa["factCheck"]["corrections"],
        "consistencyConflicts": len(consistency.get("conflicts", [])),
        "consistencyConflictDetails": consistency.get("conflicts", []),
        "quality": critic.get("quality", "high"),
        "criticGaps": critic.get("gaps", []),
        "rewriteCount": qa["rewriteCount"],
        "totalTimeMs": total_ms,
        "coverageReport": rag_context.get("coverageReport"),
    }

    await _emit(on_progress, "complete", {"agentMetadata": agent_metadata})

    return {
        "response": content,
        "sources": rag_context.get("sources", []),
        "contextUsed": {
            "knowledgeDocs": len(rag_context.get("knowledge", [])),
            "userHistoryDocs": len(rag_context.get("userHistory", [])),
        },
        "agentMetadata": agent_metadata,
    }
