import { STEP_ORDER } from "../hooks/useWorkflow";

export const PHASE_ONBOARDING = "onboarding";
export const PHASE_GUIDED = "guided-input";
export const PHASE_WORKFLOW = "workflow";

/**
 * Normalize a location hash into a path like `/onboarding`.
 * @param {string} [hash]
 * @returns {string}
 */
export function normalizeHash(hash = "") {
  let path = String(hash || "").trim();
  if (path.startsWith("#")) path = path.slice(1);
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

/**
 * Build a hash URL from workflow state.
 * @param {{ phase: string, currentStep?: string }} state
 * @returns {string} e.g. `#/workflow/focus`
 */
export function pathFromState({ phase, currentStep }) {
  if (phase === PHASE_GUIDED) return "#/guided";
  if (phase === PHASE_WORKFLOW) {
    const step = STEP_ORDER.includes(currentStep) ? currentStep : "story";
    return `#/workflow/${step}`;
  }
  return "#/onboarding";
}

/**
 * Parse a hash / path into workflow phase + step.
 * Invalid values fall back to onboarding.
 * @param {string} hashOrPath
 * @returns {{ phase: string, currentStep: string }}
 */
export function stateFromPath(hashOrPath) {
  const path = normalizeHash(hashOrPath);
  const segments = path.split("/").filter(Boolean);

  if (segments[0] === "guided") {
    return { phase: PHASE_GUIDED, currentStep: "story" };
  }

  if (segments[0] === "workflow") {
    const step = segments[1];
    if (STEP_ORDER.includes(step)) {
      return { phase: PHASE_WORKFLOW, currentStep: step };
    }
    return { phase: PHASE_WORKFLOW, currentStep: "story" };
  }

  if (segments[0] === "onboarding" || segments.length === 0) {
    return { phase: PHASE_ONBOARDING, currentStep: "story" };
  }

  return { phase: PHASE_ONBOARDING, currentStep: "story" };
}

/**
 * True when the two route states represent the same screen.
 */
export function routesEqual(a, b) {
  if (!a || !b) return false;
  if (a.phase !== b.phase) return false;
  if (a.phase === PHASE_WORKFLOW) return a.currentStep === b.currentStep;
  return true;
}
