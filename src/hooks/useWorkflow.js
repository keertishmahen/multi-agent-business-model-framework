import { useReducer } from "react";
import { sanitizeAgentMetadata, sanitizeSpecialistData } from "../utils/agentText";
import { ALL_AGENT_IDS } from "../constants/agents";

/**
 * The fixed 10-step sequence for the workflow.
 */
export const STEP_ORDER = [
  "story",
  "focus",
  "issues",
  "tensions",
  "dilemmas",
  "values",
  "swot",
  "bmc",
  "rag",
  "plan",
];

/**
 * Initial state for the workflow reducer.
 */
export const initialState = {
  phase: "onboarding",
  currentStep: "story",
  completedSteps: [],
  outputs: {},
  story: "",
  guidedInputPhases: { basics: "", problem: "", customers: "" },
  inferences: {
    sector: "",
    audience: "",
    sdg_focus: "",
    stage: "",
    hidden_stakeholder: "",
  },
  selectedSwotTitle: "",
  loading: false,
  error: null,
  agentState: {
    activeStage: null,
    agentStatuses: {},
    agentConfidences: {},
    activityEvents: [],
    lastMetadata: null,
  },
};

/**
 * Returns the next step in the sequence after the given step,
 * or null if the given step is the last one.
 */
function getNextStep(stepId) {
  const index = STEP_ORDER.indexOf(stepId);
  if (index === -1 || index === STEP_ORDER.length - 1) return null;
  return STEP_ORDER[index + 1];
}

function mergeAgentMetadata(prev, incomingRaw) {
  const incoming = sanitizeAgentMetadata(incomingRaw) || {};
  let specialists = incoming.specialists;
  if (prev?.specialists && incoming.specialists) {
    specialists = { ...incoming.specialists };
    Object.entries(prev.specialists).forEach(([id, existing]) => {
      const next = specialists[id];
      if (!next) {
        specialists[id] = existing;
        return;
      }
      if ((existing?.insights?.length || 0) > (next?.insights?.length || 0)) {
        specialists[id] = { ...next, ...existing, insights: existing.insights };
      }
    });
  }
  return { ...incoming, specialists: specialists || incoming.specialists };
}

function upsertSpecialistInMetadata(prevMetadata, agentId, result) {
  if (!agentId || !result) return prevMetadata;
  const prev = prevMetadata || {};
  const prevSpecs = prev.specialists || {};
  const incoming = sanitizeSpecialistData(result);
  const existing = prevSpecs[agentId];
  const preferIncoming =
    !existing ||
    (incoming?.insights?.length || 0) >= (existing?.insights?.length || 0);

  return {
    ...prev,
    specialists: {
      ...prevSpecs,
      [agentId]: preferIncoming ? { ...existing, ...incoming } : existing,
    },
  };
}

/**
 * Apply a batched agent progress patch in one state transition.
 */
export function applyAgentProgressPatch(state, patch = {}) {
  if (!patch || typeof patch !== "object") return state;

  let nextAgentState = state.agentState;
  let agentStateChanged = false;

  const touchAgentState = (updater) => {
    const updated = updater(nextAgentState);
    if (updated !== nextAgentState) {
      nextAgentState = updated;
      agentStateChanged = true;
    }
  };

  if (Object.prototype.hasOwnProperty.call(patch, "activeStage")) {
    touchAgentState((agentState) => ({
      ...agentState,
      activeStage: patch.activeStage,
    }));
  }

  if (Array.isArray(patch.statusUpdates) && patch.statusUpdates.length > 0) {
    touchAgentState((agentState) => {
      let agentStatuses = agentState.agentStatuses;
      let agentConfidences = agentState.agentConfidences;
      patch.statusUpdates.forEach(({ agentId, status, confidence }) => {
        if (!agentId || !status) return;
        agentStatuses = { ...agentStatuses, [agentId]: status };
        if (confidence != null) {
          agentConfidences = { ...agentConfidences, [agentId]: confidence };
        }
      });
      return { ...agentState, agentStatuses, agentConfidences };
    });
  }

  if (Array.isArray(patch.activityEvents) && patch.activityEvents.length > 0) {
    touchAgentState((agentState) => ({
      ...agentState,
      activityEvents: [...agentState.activityEvents, ...patch.activityEvents].slice(-30),
    }));
  }

  if (Array.isArray(patch.specialistUpserts) && patch.specialistUpserts.length > 0) {
    touchAgentState((agentState) => {
      let lastMetadata = agentState.lastMetadata;
      patch.specialistUpserts.forEach(({ agentId, result }) => {
        lastMetadata = upsertSpecialistInMetadata(lastMetadata, agentId, result);
      });
      return { ...agentState, lastMetadata };
    });
  }

  if (patch.metadata) {
    touchAgentState((agentState) => ({
      ...agentState,
      lastMetadata: mergeAgentMetadata(agentState.lastMetadata, patch.metadata),
      activeStage: Object.prototype.hasOwnProperty.call(patch, "activeStage")
        ? patch.activeStage
        : null,
    }));
  }

  return agentStateChanged ? { ...state, agentState: nextAgentState } : state;
}

/**
 * Workflow reducer handling all state transitions.
 */
export function workflowReducer(state, action) {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.payload };

    case "SET_STEP": {
      // Only allow navigating to a valid step
      if (!STEP_ORDER.includes(action.payload)) return state;
      return { ...state, currentStep: action.payload };
    }

    case "COMPLETE_STEP": {
      const stepToComplete = state.currentStep;
      const completedSteps = state.completedSteps.includes(stepToComplete)
        ? state.completedSteps
        : [...state.completedSteps, stepToComplete];

      const nextStep = getNextStep(stepToComplete);
      return {
        ...state,
        completedSteps,
        currentStep: nextStep || state.currentStep,
      };
    }

    case "SET_OUTPUT":
      return {
        ...state,
        outputs: {
          ...state.outputs,
          [action.payload.stepId]: action.payload.data,
        },
      };

    case "SET_STORY":
      return { ...state, story: action.payload };

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_AGENT_STAGE":
      return {
        ...state,
        agentState: { ...state.agentState, activeStage: action.payload },
      };

    case "SET_AGENT_STATUS":
      return {
        ...state,
        agentState: {
          ...state.agentState,
          agentStatuses: {
            ...state.agentState.agentStatuses,
            [action.payload.agentId]: action.payload.status,
          },
          agentConfidences: action.payload.confidence != null
            ? { ...state.agentState.agentConfidences, [action.payload.agentId]: action.payload.confidence }
            : state.agentState.agentConfidences,
        },
      };

    case "ADD_ACTIVITY_EVENT":
      return {
        ...state,
        agentState: {
          ...state.agentState,
          activityEvents: [...state.agentState.activityEvents, action.payload].slice(-30),
        },
      };

    case "SET_AGENT_METADATA": {
      const incoming = sanitizeAgentMetadata(action.payload) || {};
      const prev = state.agentState.lastMetadata;
      return {
        ...state,
        agentState: {
          ...state.agentState,
          lastMetadata: mergeAgentMetadata(prev, incoming),
          activeStage: null,
        },
      };
    }

    case "UPSERT_AGENT_SPECIALIST": {
      const { agentId, result } = action.payload || {};
      if (!agentId || !result) return state;
      return {
        ...state,
        agentState: {
          ...state.agentState,
          lastMetadata: upsertSpecialistInMetadata(
            state.agentState.lastMetadata,
            agentId,
            result
          ),
        },
      };
    }

    case "APPLY_AGENT_PROGRESS":
      return applyAgentProgressPatch(state, action.payload);

    case "RESET_AGENT_STATE":
      return {
        ...state,
        agentState: {
          activeStage: null,
          agentStatuses: {},
          agentConfidences: {},
          activityEvents: [],
          lastMetadata: null,
        },
      };

    case "INIT_MIA_AGENTS": {
      const activeIds = Array.isArray(action.payload) ? action.payload : [];
      const agentStatuses = {};
      ALL_AGENT_IDS.forEach((id) => {
        agentStatuses[id] = activeIds.includes(id) ? "queued" : "standby";
      });
      return {
        ...state,
        agentState: {
          activeStage: "context-retrieval",
          agentStatuses,
          agentConfidences: {},
          activityEvents: [],
          lastMetadata: null,
        },
      };
    }

    case "NAVIGATE_BACK": {
      // Navigate to a previous step without modifying outputs or completedSteps
      const targetStep = action.payload;
      if (!STEP_ORDER.includes(targetStep)) return state;
      return { ...state, currentStep: targetStep };
    }

    case "RESTORE_COMPLETED": {
      // Bulk restore completed steps (used when resuming from localStorage)
      const steps = Array.isArray(action.payload) ? action.payload : [];
      const validSteps = steps.filter(s => STEP_ORDER.includes(s));
      return { ...state, completedSteps: validSteps };
    }

    case "RESET":
      return { ...initialState };

    default:
      return state;
  }
}

/**
 * useWorkflow — manages the 10-step business plan co-creation workflow.
 *
 * Returns the current state and a dispatch function.
 * Also provides convenience action creators.
 */
export default function useWorkflow() {
  const [state, dispatch] = useReducer(workflowReducer, initialState);

  const actions = {
    setPhase: (phase) => dispatch({ type: "SET_PHASE", payload: phase }),
    setStep: (stepId) => dispatch({ type: "SET_STEP", payload: stepId }),
    completeStep: () => dispatch({ type: "COMPLETE_STEP" }),
    setOutput: (stepId, data) =>
      dispatch({ type: "SET_OUTPUT", payload: { stepId, data } }),
    setStory: (story) => dispatch({ type: "SET_STORY", payload: story }),
    setLoading: (loading) =>
      dispatch({ type: "SET_LOADING", payload: loading }),
    setError: (error) => dispatch({ type: "SET_ERROR", payload: error }),
    setAgentStage: (stage) => dispatch({ type: "SET_AGENT_STAGE", payload: stage }),
    setAgentStatus: (agentId, status, confidence) =>
      dispatch({ type: "SET_AGENT_STATUS", payload: { agentId, status, confidence } }),
    addActivityEvent: (event) => dispatch({ type: "ADD_ACTIVITY_EVENT", payload: event }),
    setAgentMetadata: (metadata) => dispatch({ type: "SET_AGENT_METADATA", payload: metadata }),
    upsertAgentSpecialist: (agentId, result) =>
      dispatch({ type: "UPSERT_AGENT_SPECIALIST", payload: { agentId, result } }),
    applyAgentProgress: (patch) =>
      dispatch({ type: "APPLY_AGENT_PROGRESS", payload: patch }),
    resetAgentState: () => dispatch({ type: "RESET_AGENT_STATE" }),
    initMiaAgents: (agentIds) => dispatch({ type: "INIT_MIA_AGENTS", payload: agentIds }),
    navigateBack: (stepId) =>
      dispatch({ type: "NAVIGATE_BACK", payload: stepId }),
    reset: () => dispatch({ type: "RESET" }),
  };

  return { state, dispatch, ...actions };
}
