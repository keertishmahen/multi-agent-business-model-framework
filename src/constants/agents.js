import { TrendingUp, Calculator, Globe, Scale } from "lucide-react";

/** Sub-status copy shown while an agent is running (Figma sidebar). */
export const AGENT_RUNNING_SUBSTATUS = {
  market: "analysing TAM",
  financial: "modelling unit economics",
  sdg: "mapping SDGs",
  critique: "diagnosing tensions",
};

export const AGENT_CONFIG = {
  market: {
    id: "market",
    label: "Market Research",
    subtitle: "Sizing, segments, competitors",
    Icon: TrendingUp,
    color: "#185FA5",
    bg: "rgba(24, 95, 165, 0.08)",
  },
  financial: {
    id: "financial",
    label: "Financial Modelling",
    subtitle: "Unit economics & runway",
    Icon: Calculator,
    color: "#854F0B",
    bg: "rgba(133, 79, 11, 0.08)",
  },
  sdg: {
    id: "sdg",
    label: "SDG Alignment",
    subtitle: "UN SDG mapping",
    Icon: Globe,
    // Matches the Planet driver leaf green; distinct from the emerald brand chrome
    color: "#357A26",
    bg: "rgba(53, 122, 38, 0.08)",
  },
  critique: {
    id: "critique",
    label: "Critique & Diagnosis",
    subtitle: "Tensions & dilemmas",
    Icon: Scale,
    color: "#7C3AED",
    bg: "rgba(124, 58, 237, 0.08)",
  },
};

export const ALL_AGENT_IDS = Object.keys(AGENT_CONFIG);

/**
 * Which agents are active for each workflow step.
 *
 * MUST stay in sync with STEP_AGENT_MAP in
 * server_py/app/agents/orchestrator.py. This copy seeds the agent panel before
 * streaming starts, so drift shows up as cards stuck on "Standby".
 *
 * All four specialists contribute to every generating step. Market and
 * Financial previously ran only on bmc/plan, leaving half the panel idle for
 * most of the workflow; they run concurrently so wall-clock cost is ~flat.
 */
export const STEP_AGENTS = {
  focus: [...ALL_AGENT_IDS],
  issues: [...ALL_AGENT_IDS],
  tensions: [...ALL_AGENT_IDS],
  dilemmas: [...ALL_AGENT_IDS],
  values: [...ALL_AGENT_IDS],
  swot: [...ALL_AGENT_IDS],
  bmc: [...ALL_AGENT_IDS],
  plan: [...ALL_AGENT_IDS],
};

export function getActiveAgents(stepId) {
  return STEP_AGENTS[stepId] || [];
}
