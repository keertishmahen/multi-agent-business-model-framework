import { ALL_AGENT_IDS } from "../constants/agents";

const SPECIALIST_IDS = new Set(ALL_AGENT_IDS);

/** Friendly labels for pipeline stage events in the activity feed. */
export const PIPELINE_STAGE_LABELS = {
  "context-retrieval": "Retrieving context",
  starting: "Initializing pipeline",
  fallback: "Direct generation",
  "mia-unreachable": "MIA agents offline",
  synthesis: "Synthesizing insights",
  "fact-checker": "Fact checking",
  consistency: "Consistency check",
  critic: "Quality review",
  writer: "Drafting content",
  complete: "Pipeline complete",
};

export function getPipelineStageLabel(name) {
  if (!name) return "System";
  return PIPELINE_STAGE_LABELS[name] || name.replace(/-/g, " ");
}

/**
 * Resolve agent card status for the current step.
 * Inactive agents always show standby — never stale error/unavailable.
 */
export function resolveAgentDisplayStatus(agentId, agentStatuses, activeAgentIds) {
  const stored = agentStatuses[agentId];

  // The stored status is authoritative and can never be stale: RESET_AGENT_STATE
  // clears the map and INIT_MIA_AGENTS re-seeds every agent at the start of each
  // run ("queued" if active, "standby" if not).
  //
  // This used to short-circuit to "standby" whenever the agent was missing from
  // activeAgentIds, which threw away a real "complete". That list is derived from
  // state.currentStep, and during the story -> focus auto-generation currentStep
  // is still "story", which has no entry — so every card was forced to Standby
  // even as the activity feed reported the agent finishing.
  if (stored) return stored;

  return activeAgentIds.includes(agentId) ? "idle" : "standby";
}

/**
 * Map specialist result to UI status (soft fallback vs success).
 */
export function resolveSpecialistStatus(result) {
  if (result?.failed) return "degraded";
  return "complete";
}

export function isSpecialistAgent(agentId) {
  return SPECIALIST_IDS.has(agentId);
}

/** Whether a specialist stage SSE event should be logged to the activity feed. */
export function shouldLogSpecialistStageEvent(name, status) {
  if (!isSpecialistAgent(name)) return true;
  return status === "running";
}

/** Build a single activity event from a specialist result. */
export function buildSpecialistActivityEvent(agentId, result) {
  const status = resolveSpecialistStatus(result);
  return {
    name: agentId,
    status,
    message: status === "degraded" ? "Limited analysis" : undefined,
    timestamp: Date.now(),
  };
}

/** Keep the latest event per name for a cleaner timeline. */
export function collapseActivityEvents(events) {
  const lastIndexByName = new Map();
  events.forEach((event, i) => lastIndexByName.set(event.name, i));
  return events.filter((event, i) => lastIndexByName.get(event.name) === i);
}

/**
 * Build agent status updates when MIA pipeline ends without metadata (RAG fallback).
 * Active agents become "error" (Unavailable / Direct mode) — never standby.
 */
export function buildMiaFinalization(activeAgentIds = [], mode = "fallback") {
  const ids = Array.isArray(activeAgentIds) ? activeAgentIds : [];
  const updates = [];

  if (mode === "fallback") {
    ids.forEach((agentId) => {
      updates.push({ agentId, status: "error" });
    });
  } else if (mode === "error") {
    ids.forEach((agentId) => {
      updates.push({ agentId, status: "degraded" });
    });
  }

  const activityEvent = {
    name: mode === "fallback" ? "fallback" : "pipeline",
    status: mode === "error" ? "error" : "complete",
    message:
      mode === "fallback"
        ? "Direct generation — MIA agents offline"
        : mode === "error"
          ? "Generation failed"
          : "Pipeline complete",
    timestamp: Date.now(),
  };

  return { updates, activityEvent };
}

/**
 * Apply MIA finalization via workflow action callbacks.
 */
export function finalizeMiaRun(activeAgentIds, mode, { setAgentStatus, addActivityEvent, setAgentStage }) {
  const { updates, activityEvent } = buildMiaFinalization(activeAgentIds, mode);
  updates.forEach(({ agentId, status }) => setAgentStatus(agentId, status));
  addActivityEvent(activityEvent);
  if (setAgentStage) setAgentStage(null);
}
