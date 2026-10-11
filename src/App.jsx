import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import ApiKeyScreen     from "./components/ApiKeyScreen";
import OnboardingScreen from "./components/OnboardingScreen";
import TourWalkthrough  from "./components/TourWalkthrough";
import GuidedInput      from "./components/GuidedInput/GuidedInput";
import StoryStep        from "./components/steps/StoryStep";
import FocusStep        from "./components/steps/FocusStep";
import IssuesStep       from "./components/steps/IssuesStep";
import TensionsStep     from "./components/steps/TensionsStep";
import DilemmasStep     from "./components/steps/DilemmasStep";
import ValuesStep       from "./components/steps/ValuesStep";
import SwotStep         from "./components/steps/SwotStep";
import BMCStep          from "./components/steps/BMCStep";
import BusinessPlanStep from "./components/steps/BusinessPlanStep";
import RagStep, { getCuratedContext } from "./components/steps/RagStep";
import FeedbackBar      from "./components/shared/FeedbackBar";
import FeedbackAcknowledgment from "./components/shared/FeedbackAcknowledgment";
import LoadingState     from "./components/shared/LoadingState";
import BackButton       from "./components/shared/BackButton";
import StoryReadback    from "./components/shared/StoryReadback";
import MIADashboard     from "./components/dashboard/MIADashboard";
import SDGMapperModal   from "./components/dashboard/SDGMapperModal";
import SavedPlansModal   from "./components/shared/SavedPlansModal";
import ConfirmSaveFreshModal from "./components/shared/ConfirmSaveFreshModal";
import { STEPS }        from "./constants/steps";
import { getActiveAgents } from "./constants/agents";
import { mergeSdgAlignments, normalizeSdgMapping, hasSdgMapping } from "./utils/sdgAlignments";
import { getSDGById } from "./constants/sdgs";
import { normalizeDilemmasOutput } from "./utils/dilemmaScore";
import { normalizeBmcOutput, hasBmcContent } from "./utils/bmcFormat";
import { resolveSpecialistStatus, isSpecialistAgent, shouldLogSpecialistStageEvent, buildSpecialistActivityEvent, buildMiaFinalization } from "./utils/agentStatus";
import { PROMPTS }      from "./constants/prompts";
import { applyTone, DEFAULT_TONE } from "./constants/tone";
import { callGemini, parseGeminiJSON, setApiKey } from "./utils/gemini";
import { callRAG, storeStepOutput, retrieveRagContext, suggestRagSources, uploadRagDocuments, listRagDocuments, deleteRagDocument, callMultiAgentStream, shouldUseMultiAgent, isRAGAvailable, isServerManaged } from "./services/geminiClient";
import useWorkflow, { STEP_ORDER } from "./hooks/useWorkflow";
import useLocalStorage  from "./hooks/useLocalStorage";
import useHistorySync, { goBackOr } from "./hooks/useHistorySync";
import {
  listArchives,
  archiveCurrentSession,
  loadArchive,
  deleteArchive,
  restorePersistableState,
} from "./hooks/useSessionArchive";
import { pathFromState } from "./utils/appRoutes";
import { APP_NAME } from "./constants/branding";
import { initialState } from "./hooks/useWorkflow";

function buildFreshOnboardingSnapshot(tourCompleted) {
  return {
    phase: initialState.phase,
    currentStep: initialState.currentStep,
    completedSteps: [],
    outputs: {},
    story: "",
    selectedSwotTitle: "",
    guidedInputResponses: { ...initialState.guidedInputPhases },
    tourCompleted,
  };
}

// ──────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────
function buildContext(story, outputs) {
  const parts = [];
  if (story) parts.push(`ORIGINAL STORY:\n${story}`);
  ["focus","issues","tensions","dilemmas","values","swot","bmc"].forEach(k => {
    if (outputs[k]) parts.push(`${k.toUpperCase()} OUTPUT:\n${JSON.stringify(outputs[k], null, 2)}`);
  });
  if (outputs.plan) parts.push(`PLAN OUTPUT:\n${outputs.plan}`);
  return parts.join("\n\n---\n\n");
}

function buildAgentProgressPatch(progress) {
  const { event, name, status, agentMetadata, result, agentId, confidence, message } = progress;
  const patch = {
    statusUpdates: [],
    activityEvents: [],
    specialistUpserts: [],
  };

  if (event === "stage" && name) {
    // Only a running stage is "active". Leaving activeStage pinned to a
    // specialist that has already finished made the pipeline look stuck.
    patch.activeStage = status === "running" ? name : null;

    if (isSpecialistAgent(name)) {
      if (status) {
        // Terminal specialist stages (complete / degraded / error) used to be
        // dropped here, leaving the card on "Queued" if the separate
        // `specialist` event never arrived.
        patch.statusUpdates.push({ agentId: name, status, confidence });
        if (status === "running") {
          patch.activityEvents.push({ name, status: "running", timestamp: Date.now() });
        }
      }
    } else if (status) {
      patch.statusUpdates.push({ agentId: name, status, confidence });
      if (shouldLogSpecialistStageEvent(name, status)) {
        patch.activityEvents.push({
          name,
          status: status || "running",
          message,
          timestamp: Date.now(),
        });
      }
    }
  }

  if (event === "specialist" && agentId) {
    const specialistStatus = resolveSpecialistStatus(result);
    patch.statusUpdates.push({
      agentId,
      status: specialistStatus,
      confidence: result?.confidence ?? 0,
    });
    patch.activityEvents.push(buildSpecialistActivityEvent(agentId, result));
    if (result) patch.specialistUpserts.push({ agentId, result });
  }

  if (event === "error") {
    patch.activityEvents.push({
      name: "pipeline",
      status: "error",
      message: message || "Generation failed",
      timestamp: Date.now(),
    });
  }

  if (event === "complete" && agentMetadata) {
    patch.metadata = agentMetadata;
    patch.activeStage = null;

    if (agentMetadata.specialists) {
      Object.entries(agentMetadata.specialists).forEach(([id, data]) => {
        if (!data) return;
        patch.statusUpdates.push({
          agentId: id,
          status: data.failed ? "degraded" : "complete",
          confidence: data.confidence ?? 0,
        });
      });
    }

    if (agentMetadata.stagesDetail) {
      agentMetadata.stagesDetail.forEach((s) => {
        if (!s.name || isSpecialistAgent(s.name)) return;
        if (s.status === "complete") {
          patch.statusUpdates.push({
            agentId: s.name,
            status: "complete",
            confidence: s.confidence,
          });
        } else if (s.status === "error" || s.status === "degraded") {
          patch.statusUpdates.push({
            agentId: s.name,
            status: s.status === "degraded" ? "degraded" : "error",
          });
        }
      });
    }
  }

  return patch;
}

function canGenerateSdgMapping(outputs) {
  return hasBmcContent(outputs?.bmc);
}

function parseStepOutput(sid, parsed, bmcContext) {
  if (sid === "dilemmas") return normalizeDilemmasOutput(parsed);
  if (sid === "bmc") return normalizeBmcOutput(parsed, bmcContext);
  return parsed;
}

// ──────────────────────────────────────────────────────────────────
//  Resume Dialog Component (Task 8.4)
// ──────────────────────────────────────────────────────────────────
function ResumeDialog({ onResume, onStartFresh }) {
  const resumeBtnRef = useRef(null);

  // Auto-focus the Resume button on mount for keyboard accessibility
  useEffect(() => {
    if (resumeBtnRef.current) {
      resumeBtnRef.current.focus();
    }
  }, []);

  // Trap keyboard focus within the dialog and handle Escape
  function handleKeyDown(e) {
    if (e.key === "Escape") {
      onStartFresh();
    }
    // Simple focus trap between the two buttons
    if (e.key === "Tab") {
      const buttons = e.currentTarget.querySelectorAll("button");
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div
      className="modal-glass-backdrop"
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Resume session"
      aria-labelledby="resume-dialog-title"
      onKeyDown={handleKeyDown}
    >
      <div className="modal-glass-panel" style={{ maxWidth: 440, textAlign: "center" }}>
        <div className="modal-glass-panel__body">
          <div style={{ fontSize: 32, marginBottom: 16 }} aria-hidden="true">👋</div>
          <h2
            id="resume-dialog-title"
            className="modal-glass-panel__title"
            style={{ marginBottom: 8 }}
          >
            Welcome back!
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 28 }}>
            Would you like to pick up where you left off?
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              className="btn-secondary"
              onClick={onStartFresh}
              style={{ padding: "10px 24px", fontSize: 14 }}
            >
              Start fresh
            </button>
            <button
              ref={resumeBtnRef}
              className="btn-primary"
              onClick={onResume}
              style={{ padding: "10px 24px", fontSize: 14 }}
            >
              Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
//  App
// ──────────────────────────────────────────────────────────────────
export default function App() {
  // ── Core hooks ─────────────────────────────────────────────────
  const { state, dispatch, setPhase, completeStep, setOutput, setLoading: setWorkflowLoading, setError: setWorkflowError, reset, setAgentMetadata, resetAgentState, initMiaAgents } = useWorkflow();

  // Manual API key state (for fallback when env var not set)
  const [manualApiKey, setManualApiKey] = useState("");

  // Session ID for RAG context tracking
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  // ARIA live region for step transitions (Task 18.5)
  const prevStepRef = useRef(null);
  const [stepAnnouncement, setStepAnnouncement] = useState("");

  // Determine if API key is available (env, manual, or production RAG backend)
  const envApiKey = process.env.REACT_APP_GEMINI_API_KEY || "";
  const [ragBackendReady, setRagBackendReady] = useState(!isServerManaged());

  useEffect(() => {
    if (!isServerManaged()) return;
    isRAGAvailable().then(setRagBackendReady);
  }, []);

  const apiKeyAvailable = Boolean(envApiKey) || Boolean(manualApiKey)
    || (isServerManaged() && ragBackendReady);

  // Local state for things not in the workflow reducer
  const [selectedSwotTitle, setSelectedSwotTitle] = useState("");
  const [ragBusy, setRagBusy] = useState(false);
  // Always the current RAG step output, for merges that finish after awaits.
  const ragOutputRef = useRef(null);
  ragOutputRef.current = state.outputs.rag;
  // Output register for generated content (capstone feedback #1).
  const [tone, setTone] = useState(DEFAULT_TONE);

  // Feedback acknowledgment message state (Task 9.3)
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // SDG Mapper overlay
  const [showSDGMapper, setShowSDGMapper] = useState(false);
  const [sdgMappingLoading, setSdgMappingLoading] = useState(false);
  const [sdgMappingError, setSdgMappingError] = useState(null);
  const [sdgMappingWarning, setSdgMappingWarning] = useState(null);

  useEffect(() => {
    const swotOutput = state.outputs.swot;
    if (!swotOutput?.swot?.length || selectedSwotTitle) return;
    const recommended = swotOutput.recommended_title;
    const fallback = swotOutput.swot[0]?.title;
    const title = recommended || fallback;
    if (title) setSelectedSwotTitle(title);
  }, [state.outputs.swot, selectedSwotTitle]);

  // Tour overlay state (Task 2.5)
  const [showTour, setShowTour] = useState(false);

  // Tour completed state (persisted, Task 8.3)
  const [tourCompleted, setTourCompleted] = useState(false);

  // Track active MIA agents for the current generation run (SSE error handling)
  const activeMiaAgentsRef = useRef([]);

  // Local storage persistence (Task 16.1 / 16.2 / 8.3)
  const persistableState = useMemo(() => ({
    phase: state.phase,
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    outputs: state.outputs,
    story: state.story,
    selectedSwotTitle,
    guidedInputResponses: state.guidedInputPhases,
    tourCompleted,
    tone,
  }), [
    state.phase,
    state.currentStep,
    state.completedSteps,
    state.outputs,
    state.story,
    selectedSwotTitle,
    state.guidedInputPhases,
    tourCompleted,
    tone,
  ]);
  const { hasSavedState, resume, clearState, flushState } = useLocalStorage("nexus-mia-state", persistableState);

  // Resume dialog state (Task 16.2)
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeHandled, setResumeHandled] = useState(false);

  // Archived session list (saved plans)
  const [archivedPlans, setArchivedPlans] = useState(() => listArchives());
  const [showSavedPlansModal, setShowSavedPlansModal] = useState(false);
  const [showConfirmSaveFresh, setShowConfirmSaveFresh] = useState(false);

  const refreshArchives = useCallback(() => {
    setArchivedPlans(listArchives());
  }, []);

  // Hash history: sync after resume/API gate so restore/deep-links don't fight
  useHistorySync({
    phase: state.phase,
    currentStep: state.currentStep,
    dispatch,
    enabled: resumeHandled && apiKeyAvailable,
  });

  // Show resume dialog on mount if saved state exists
  useEffect(() => {
    if (!resumeHandled && hasSavedState) {
      setShowResumeDialog(true);
    } else if (!resumeHandled) {
      setResumeHandled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSavedState]);

  // Announce step transitions for screen readers (Task 18.5)
  useEffect(() => {
    if (prevStepRef.current !== null && prevStepRef.current !== state.currentStep) {
      const idx = STEPS.findIndex(s => s.id === state.currentStep);
      if (idx >= 0) {
        setStepAnnouncement(`Step ${idx + 1} of ${STEPS.length}: ${STEPS[idx].label}`);
      }
      // Dismiss feedback acknowledgment on navigation (Task 9.3)
      setFeedbackMessage("");
    }
    prevStepRef.current = state.currentStep;
  }, [state.currentStep]);

  // ── Resume / Start Fresh handlers (Task 16.2) ─────────────────
  function applyPersistableState(saved) {
    const route = restorePersistableState(saved, {
      dispatch,
      setSelectedSwotTitle,
      setTourCompleted,
      setTone,
    });
    if (route) {
      window.history.replaceState(
        { appRoute: true, appRouteIdx: 0 },
        "",
        pathFromState(route)
      );
    }
  }

  function handleResume() {
    const saved = resume();
    if (saved) {
      applyPersistableState(saved);
    }
    setShowResumeDialog(false);
    setResumeHandled(true);
  }

  function handleStartFresh() {
    clearState();
    reset();
    setSelectedSwotTitle("");
    setTourCompleted(false);
    setShowResumeDialog(false);
    setResumeHandled(true);
    window.history.replaceState({ appRoute: true, appRouteIdx: 0 }, "", "#/onboarding");
  }

  function handleSaveAndStartFresh() {
    archiveCurrentSession(persistableState);
    refreshArchives();
    clearState();
    reset();
    resetAgentState();
    setSelectedSwotTitle("");
    setShowSavedPlansModal(false);
    setShowConfirmSaveFresh(false);
    flushState(buildFreshOnboardingSnapshot(tourCompleted));
    window.history.replaceState({ appRoute: true, appRouteIdx: 0 }, "", "#/onboarding");
  }

  function handleRestoreArchivedPlan(archiveId) {
    const entry = loadArchive(archiveId);
    if (!entry?.persistableState) return;

    clearState();
    reset();
    resetAgentState();
    applyPersistableState(entry.persistableState);
    flushState(entry.persistableState);
    setShowSavedPlansModal(false);
    setResumeHandled(true);
  }

  function handleDeleteArchivedPlan(archiveId) {
    deleteArchive(archiveId);
    refreshArchives();
  }

  // ── API key submission (Task 16.3) ─────────────────────────────
  function handleApiKeySubmit(key) {
    setManualApiKey(key);
    setApiKey(key);
  }

  // Get the effective API key for calls
  const effectiveApiKey = envApiKey || manualApiKey;

  // ── Derived ────────────────────────────────────────────────────
  const stepIdx  = STEPS.findIndex(s => s.id === state.currentStep);
  const stepMeta = STEPS[stepIdx];
  const isLast   = stepIdx === STEPS.length - 1;

  const selectedSwot = state.outputs.swot?.swot?.find(s => s.title === selectedSwotTitle) || null;

  const bmcContext = useMemo(
    () => ({ outputs: state.outputs, selectedSwotTitle }),
    [state.outputs, selectedSwotTitle],
  );

  const normalizedBmcData = useMemo(() => {
    if (!state.outputs.bmc) return null;
    return normalizeBmcOutput(state.outputs.bmc, bmcContext);
  }, [state.outputs.bmc, bmcContext]);

  // ── MIA agent progress handler (SSE-driven) ───────────────────
  const handleAgentProgress = useCallback((progress) => {
    const patch = buildAgentProgressPatch(progress);

    if (progress.event === "error") {
      if (activeMiaAgentsRef.current.length > 0) {
        const { updates, activityEvent } = buildMiaFinalization(activeMiaAgentsRef.current, "error");
        patch.statusUpdates = [...patch.statusUpdates, ...updates];
        patch.activityEvents = [...patch.activityEvents, activityEvent];
      }
      patch.activeStage = null;
    }

    dispatch({ type: "APPLY_AGENT_PROGRESS", payload: patch });
  }, [dispatch]);

  // ── Execute generation with MIA or RAG ────────────────────────
  const executeGeneration = useCallback(async (sid, rawPrompt) => {
    const useMIA = shouldUseMultiAgent(sid);
    const swotEntry = state.outputs.swot?.swot?.find((s) => s.title === selectedSwotTitle) || null;
    // Tone is applied centrally so a single control steers all ten steps
    // (capstone feedback #1 — output read as "posh and uptight").
    const prompt = applyTone(rawPrompt, tone);
    const genOptions = {
      stepId: sid,
      sessionId,
      userStory: state.story,
      options: {
        temperature: 0.7,
        maxTokens: sid === "plan" ? 8192 : 4096,
        selectedVpTitle: swotEntry?.title || "",
        tone,
      },
    };
    // The plan is grounded on exactly the evidence approved in the RAG step;
    // the MIA agents receive it as their retrieval context.
    if (sid === "plan" && state.outputs.rag) {
      genOptions.options.curatedContext = getCuratedContext(state.outputs.rag);
    }

    if (useMIA) {
      const activeIds = getActiveAgents(sid);
      activeMiaAgentsRef.current = activeIds;
      resetAgentState();
      initMiaAgents(activeIds);
      const { response, agentMetadata } = await callMultiAgentStream(
        prompt,
        genOptions,
        handleAgentProgress
      );
      if (agentMetadata) {
        setAgentMetadata(agentMetadata);
      } else {
        const { updates, activityEvent } = buildMiaFinalization(activeIds, "fallback");
        dispatch({
          type: "APPLY_AGENT_PROGRESS",
          payload: {
            activeStage: null,
            statusUpdates: updates,
            activityEvents: [activityEvent],
          },
        });
      }
      return response;
    }

    return callRAG(prompt, genOptions);
  }, [sessionId, state.story, state.outputs.swot, state.outputs.rag, selectedSwotTitle, tone, handleAgentProgress, initMiaAgents, setAgentMetadata, resetAgentState, dispatch]);

  const generateSdgMapping = useCallback(async (outputsOverride) => {
    const outputs = outputsOverride || state.outputs;
    if (!canGenerateSdgMapping(outputs)) return null;
    setSdgMappingLoading(true);
    setSdgMappingError(null);
    setSdgMappingWarning(null);
    try {
      const ctx = buildContext(state.story, outputs);
      const prompt = PROMPTS.sdgMapping(ctx);
      const raw = await callRAG(prompt, {
        stepId: "sdg_mapping",
        sessionId,
        userStory: state.story,
        options: { temperature: 0.3, maxTokens: 8192 },
      });
      const parsed = parseGeminiJSON(raw);
      if (!parsed) throw new Error("SDG mapping returned an unexpected response.");
      const mapping = normalizeSdgMapping(parsed);
      if (mapping.sdg_alignments.length < 17) {
        setSdgMappingWarning(
          `Partial mapping (${mapping.sdg_alignments.length}/17 SDGs). Geographic filter may be incomplete.`
        );
      }
      setOutput("sdg_mapping", mapping);
      storeStepOutput(sessionId, "sdg_mapping", mapping);
      return mapping;
    } catch (e) {
      const message = e.message || "Could not generate SDG mapping.";
      setSdgMappingError(message);
      console.warn("[SDG Mapping]", message);
      return null;
    } finally {
      setSdgMappingLoading(false);
    }
  }, [state.story, state.outputs, sessionId, setOutput]);

  // ── RAG step: sync every output, then retrieve the plan's evidence ──
  // Re-storing first means canvas edits and resumed sessions (new sessionId)
  // are reflected, and BMC is guaranteed stored before it is looked up.
  // `quiet` keeps the step mounted (no global loading screen) when re-running
  // after an upload or delete; `resync` skips re-storing unchanged outputs.
  const runRagRetrieval = useCallback(async ({ resync = true, quiet = false, afterDelete = false } = {}) => {
    if (!quiet) setWorkflowLoading(true);
    setWorkflowError(null);
    const prevRag = ragOutputRef.current || {};
    try {
      if (resync) {
        const writes = [storeStepOutput(sessionId, "story", state.story)];
        STEP_ORDER.forEach((sid) => {
          if (sid === "story" || sid === "rag" || sid === "plan") return;
          if (state.outputs[sid]) writes.push(storeStepOutput(sessionId, sid, state.outputs[sid]));
        });
        if (state.outputs.sdg_mapping) {
          writes.push(storeStepOutput(sessionId, "sdg_mapping", state.outputs.sdg_mapping));
        }
        await Promise.all(writes);
      }

      // Upload suggestions are generated once per session and cached, unlike the
      // SunMoksha reference which regenerated them on every rerun.
      const needSuggestions = !prevRag.suggestions?.length && state.outputs.bmc;
      const [result, documents, suggestions] = await Promise.all([
        retrieveRagContext(sessionId, {
          selectedVpTitle: selectedSwotTitle || "",
          prompt: `Business plan for: ${String(state.story || "").slice(0, 300)}`,
        }),
        listRagDocuments(sessionId).catch(() => prevRag.documents || []),
        needSuggestions
          ? suggestRagSources(sessionId, { bmc: state.outputs.bmc, story: state.story }).catch(() => null)
          : Promise.resolve(prevRag.suggestions || []),
      ]);

      // Keep earlier exclusions for items that were retrieved again. Read the
      // latest RAG output (not the one captured before the awaits) so a toggle
      // made while this request was in flight is not reverted.
      const latestRag = ragOutputRef.current || prevRag;
      const ids = new Set(
        [...result.bmcBlocks, ...result.priorSteps, ...(result.uploads || []), ...result.knowledge].map((i) => i.id)
      );
      const excluded = (latestRag.excluded || []).filter((id) => ids.has(id));
      const output = {
        ...result,
        excluded,
        documents,
        suggestions: suggestions || [],
        suggestionsError: suggestions === null,
        // The server's per-session store is wiped on restart; tell the user
        // rather than silently planning without their documents.
        uploadsLost: !afterDelete && (prevRag.documents || []).length > 0 && documents.length === 0,
      };
      setOutput("rag", output);
      if (!quiet) setWorkflowLoading(false);
      return output;
    } catch (e) {
      setWorkflowError(`RAG retrieval failed: ${e.message}`);
      if (!quiet) setWorkflowLoading(false);
      return null;
    }
  }, [sessionId, state.story, state.outputs, selectedSwotTitle, setOutput, setWorkflowLoading, setWorkflowError]);

  // While an upload/delete and its follow-up retrieval run, the evidence
  // toggles, Re-run and Approve are locked so nothing races the refresh.
  const handleRagUpload = useCallback(async ({ files, text }) => {
    setRagBusy(true);
    try {
      await uploadRagDocuments(sessionId, { files, text });
      await runRagRetrieval({ resync: false, quiet: true });
    } finally {
      setRagBusy(false);
    }
  }, [sessionId, runRagRetrieval]);

  const handleRagDelete = useCallback(async (docId) => {
    setRagBusy(true);
    try {
      await deleteRagDocument(sessionId, docId);
    } catch (e) {
      // Already gone (server restart, or a resumed session with a new id):
      // refresh the list instead of leaving a Remove button that always fails.
      if (!/not found/i.test(e.message || "")) {
        setRagBusy(false);
        throw e;
      }
    }
    try {
      await runRagRetrieval({ resync: false, quiet: true, afterDelete: true });
    } finally {
      setRagBusy(false);
    }
  }, [sessionId, runRagRetrieval]);

  // ── Generate for a given step (Task 16.4) ─────────────────────
  const generate = useCallback(async (sid, opts = {}) => {
    if (sid === "rag") return runRagRetrieval();
    setWorkflowLoading(true);
    setWorkflowError(null);
    try {
      const ctx = buildContext(state.story, state.outputs);
      const swot = state.outputs.swot?.swot?.find(s => s.title === selectedSwotTitle) || null;
      let prompt;

      if (sid === "focus")    prompt = PROMPTS.focus(state.story);
      else if (sid === "issues")   prompt = PROMPTS.issues(ctx);
      else if (sid === "tensions") prompt = PROMPTS.tensions(ctx);
      else if (sid === "dilemmas") prompt = PROMPTS.dilemmas(ctx);
      else if (sid === "values")   prompt = PROMPTS.values(ctx);
      else if (sid === "swot")     prompt = PROMPTS.swot(ctx);
      else if (sid === "bmc")      prompt = PROMPTS.bmc(ctx, swot);
      else if (sid === "plan")     prompt = PROMPTS.plan(ctx, swot);

      // Refine mode
      if (opts.feedback && sid !== "plan") {
        prompt = PROMPTS.refine(state.outputs[sid], opts.feedback, stepMeta?.label || sid, ctx);
      } else if (opts.feedback && sid === "plan") {
        prompt = PROMPTS.refinePlan(state.outputs.plan, opts.feedback);
      }

      if (!prompt) { setWorkflowLoading(false); return null; }

      const raw = await executeGeneration(sid, prompt);
      let result;

      if (sid === "plan") {
        result = raw;
        setOutput(sid, raw);
        storeStepOutput(sessionId, sid, raw);
        const mapping = await generateSdgMapping({ ...state.outputs, plan: raw });
        if (mapping) storeStepOutput(sessionId, "sdg_mapping", mapping);
      } else {
        const parsed = parseGeminiJSON(raw);
        if (!parsed) throw new Error("The AI returned an unexpected response. Please try generating again.");
        result = parseStepOutput(sid, parsed, bmcContext);
        setOutput(sid, result);
        storeStepOutput(sessionId, sid, result);
        if (sid === "swot" && !selectedSwotTitle) {
          const pick = result.recommended_title || result.swot?.[0]?.title;
          if (pick) setSelectedSwotTitle(pick);
        }
        if (sid === "bmc") {
          await generateSdgMapping({ ...state.outputs, bmc: result });
        }
      }

      dispatch({ type: "APPLY_AGENT_PROGRESS", payload: { activeStage: null } });
      setWorkflowLoading(false);
      return result;
    } catch (e) {
      setWorkflowError(e.message || "Unknown error. Please try again.");
      if (shouldUseMultiAgent(sid)) {
        const { updates, activityEvent } = buildMiaFinalization(getActiveAgents(sid), "error");
        dispatch({
          type: "APPLY_AGENT_PROGRESS",
          payload: {
            activeStage: null,
            statusUpdates: updates,
            activityEvents: [activityEvent],
          },
        });
      } else {
        dispatch({ type: "APPLY_AGENT_PROGRESS", payload: { activeStage: null } });
      }
      setWorkflowLoading(false);
      return null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveApiKey, state.story, state.outputs, selectedSwotTitle, stepMeta, executeGeneration, dispatch, generateSdgMapping, runRagRetrieval]);

  // ── Story submitted → transition to workflow phase ─────────────
  async function handleStorySubmit(text) {
    dispatch({ type: "SET_STORY", payload: text });
    dispatch({ type: "SET_PHASE", payload: "workflow" });
    dispatch({ type: "SET_OUTPUT", payload: { stepId: "story", data: { text } } });
    // Deliberately no COMPLETE_STEP here. Step 1 now ends with the story
    // readback (feedback p31), and only advances once the user confirms it —
    // see handleStoryReadbackConfirm. This also removes one of the two
    // independent advance paths that made navigation hard to reason about.

    // Store user story in RAG vector DB for all subsequent steps to reference
    storeStepOutput(sessionId, "story", text);

    // Auto-generate focus using MIA pipeline (SDG agent)
    setWorkflowLoading(true);
    setWorkflowError(null);
    try {
      const raw = await executeGeneration("focus", PROMPTS.focus(text));
      const parsed = parseGeminiJSON(raw);
      if (!parsed) throw new Error("The AI returned an unexpected response. Please try generating again.");
      dispatch({ type: "SET_OUTPUT", payload: { stepId: "focus", data: parsed } });

      storeStepOutput(sessionId, "focus", parsed);
    } catch (e) {
      setWorkflowError(e.message);
    }
    setWorkflowLoading(false);
  }

  // ── Story readback confirmed → Step 1 complete, advance to Step 2 ──
  // The user may have corrected what we read out of their story; persist the
  // corrections onto the focus output before moving on so every later step
  // builds on the confirmed version.
  function handleStoryReadbackConfirm(confirmedInferences) {
    const focusData = state.outputs.focus;
    if (focusData) {
      const updated = { ...focusData, inferences: confirmedInferences };
      dispatch({ type: "SET_OUTPUT", payload: { stepId: "focus", data: updated } });
      storeStepOutput(sessionId, "focus", updated);
    }
    dispatch({ type: "COMPLETE_STEP" }); // story → focus
  }

  // ── Guided input completion → same as story submit ─────────────
  function handleGuidedInputComplete(compiledStory) {
    handleStorySubmit(compiledStory);
  }

  // ── Onboarding → transition to guided input ────────────────────
  function handleStartCreating() {
    setPhase("guided-input");
  }

  function handleTakeTour() {
    setShowTour(true);
  }

  // ── Tour complete/exit → return to onboarding (Task 2.5) ───────
  function handleTourComplete() {
    setShowTour(false);
    setTourCompleted(true);
  }

  function handleTourExit() {
    setShowTour(false);
  }

  // ── Approve current step, advance (Task 16.4) ──────────────────
  async function handleApprove() {
    if (state.currentStep === "swot" && !selectedSwotTitle) {
      setWorkflowError("Please select a value proposition before continuing.");
      return;
    }

    const currentStepId = state.currentStep;
    // Mark as completed and advance
    completeStep();

    const nextIdx = STEP_ORDER.indexOf(currentStepId) + 1;
    if (nextIdx >= STEP_ORDER.length) return;

    const nextStepId = STEP_ORDER[nextIdx];
    setWorkflowError(null);

    // Auto-generate next step (Task 16.4)
    await generateForStep(nextStepId);
  }

  // Helper that generates for a specific step with latest state
  // Uses RAG backend for context-enriched generation (especially BMC → Plan)
  async function generateForStep(sid) {
    if (sid === "rag") {
      await runRagRetrieval();
      return;
    }
    setWorkflowLoading(true);
    setWorkflowError(null);
    try {
      const ctx = buildContext(state.story, state.outputs);
      const swot = state.outputs.swot?.swot?.find(s => s.title === selectedSwotTitle) || null;
      let prompt;

      if (sid === "focus")         prompt = PROMPTS.focus(state.story);
      else if (sid === "issues")   prompt = PROMPTS.issues(ctx);
      else if (sid === "tensions") prompt = PROMPTS.tensions(ctx);
      else if (sid === "dilemmas") prompt = PROMPTS.dilemmas(ctx);
      else if (sid === "values")   prompt = PROMPTS.values(ctx);
      else if (sid === "swot")     prompt = PROMPTS.swot(ctx);
      else if (sid === "bmc")      prompt = PROMPTS.bmc(ctx, swot);
      else if (sid === "plan")     prompt = PROMPTS.plan(ctx, swot);

      if (!prompt) { setWorkflowLoading(false); return; }

      const raw = await executeGeneration(sid, prompt);

      if (sid === "plan") {
        setOutput(sid, raw);
        storeStepOutput(sessionId, sid, raw);
        const mapping = await generateSdgMapping({ ...state.outputs, plan: raw });
        if (mapping) storeStepOutput(sessionId, "sdg_mapping", mapping);
      } else {
        const parsed = parseGeminiJSON(raw);
        if (!parsed) throw new Error("The AI returned an unexpected response. Please try generating again.");
        const output = parseStepOutput(sid, parsed, bmcContext);
        setOutput(sid, output);
        storeStepOutput(sessionId, sid, output);
        if (sid === "swot" && !selectedSwotTitle) {
          const pick =
            output.recommended_title ||
            output.swot?.[0]?.title;
          if (pick) setSelectedSwotTitle(pick);
        }
        if (sid === "bmc") {
          const mapping = await generateSdgMapping({ ...state.outputs, bmc: output });
          if (mapping) storeStepOutput(sessionId, "sdg_mapping", mapping);
        }
      }
    } catch (e) {
      setWorkflowError(e.message);
    }
    setWorkflowLoading(false);
  }

  // ── Refine current step ────────────────────────────────────────
  async function handleRefine(feedback) {
    // Save original output before refinement (Task 9.3)
    const originalOutput = state.currentStep === "plan"
      ? state.outputs.plan
      : state.outputs[state.currentStep];

    // Clear any previous acknowledgment
    setFeedbackMessage("");

    const refinedOutput = await generate(state.currentStep, { feedback });

    // After successful refinement, generate feedback acknowledgment (Task 9.3)
    if (refinedOutput && originalOutput) {
      try {
        const originalStr = typeof originalOutput === "string"
          ? originalOutput
          : JSON.stringify(originalOutput, null, 2);
        const refinedStr = typeof refinedOutput === "string"
          ? refinedOutput
          : JSON.stringify(refinedOutput, null, 2);

        // Only call acknowledgment if content actually changed
        if (originalStr !== refinedStr) {
          const ackPrompt = PROMPTS.feedbackAcknowledgment(originalStr, refinedStr, feedback);
          const ackMessage = isServerManaged()
            ? await callRAG(ackPrompt, {
                stepId: state.currentStep,
                sessionId,
                userStory: state.story,
                options: { temperature: 0.7, maxTokens: 512 },
              })
            : await callGemini(effectiveApiKey, ackPrompt);
          if (ackMessage && ackMessage.trim()) {
            setFeedbackMessage(ackMessage.trim());
          }
        } else {
          // Refinement produced identical output — cannot be meaningfully applied (Req 10.4)
          setFeedbackMessage(
            "Your feedback could not be meaningfully applied to this content. Try being more specific about what you'd like changed, or suggest a different angle."
          );
        }
      } catch {
        // If the acknowledgment LLM call fails, don't block the refinement (Task 9.3)
        // Just don't show the banner
      }
    } else if (!refinedOutput && originalOutput) {
      // Refinement itself failed — the error state is already set by generate()
      // Display a message explaining why (Req 10.4)
      setFeedbackMessage(
        "The refinement could not be completed. Try rephrasing your feedback or providing more specific guidance on what to change."
      );
    }
  }

  // ── Retry ──────────────────────────────────────────────────────
  async function handleRetry() {
    setWorkflowError(null);
    await generateForStep(state.currentStep);
  }

  const agentStateForDashboard = useMemo(() => ({
    agentStatuses: state.agentState.agentStatuses,
    agentConfidences: state.agentState.agentConfidences,
    activityEvents: state.agentState.activityEvents,
    lastMetadata: state.agentState.lastMetadata,
    activeStage: state.agentState.activeStage,
    onAgentClick: undefined,
  }), [
    state.agentState.agentStatuses,
    state.agentState.agentConfidences,
    state.agentState.activityEvents,
    state.agentState.lastMetadata,
    state.agentState.activeStage,
  ]);

  const handleDashboardStepClick = useCallback((stepId) => {
    resetAgentState();
    dispatch({ type: "NAVIGATE_BACK", payload: stepId });
  }, [resetAgentState, dispatch]);

  // ──────────────────────────────────────────────────────────────
  //  Rendering Logic — Route based on phase state (Task 16.1)
  // ──────────────────────────────────────────────────────────────

  // Show resume dialog (Task 16.2)
  if (showResumeDialog) {
    return <ResumeDialog onResume={handleResume} onStartFresh={handleStartFresh} />;
  }

  // If no API key available, show ApiKeyScreen (Task 16.3)
  if (!apiKeyAvailable) {
    if (isServerManaged() && !ragBackendReady) {
      return (
        <LoadingState label="Connecting to Business Model Studio server…" />
      );
    }
    return <ApiKeyScreen onSubmit={handleApiKeySubmit} />;
  }

  // Phase-based routing (Task 16.1)
  if (state.phase === "onboarding") {
    return (
      <>
        <OnboardingScreen
          onStartCreating={handleStartCreating}
          onTakeTour={handleTakeTour}
          savedPlansCount={archivedPlans.length}
          onViewSavedPlans={() => setShowSavedPlansModal(true)}
        />
        {showTour && (
          <TourWalkthrough
            onComplete={handleTourComplete}
            onExit={handleTourExit}
          />
        )}
        <SavedPlansModal
          isOpen={showSavedPlansModal}
          onClose={() => setShowSavedPlansModal(false)}
          archives={archivedPlans}
          onRestore={handleRestoreArchivedPlan}
          onDelete={handleDeleteArchivedPlan}
        />
        <ConfirmSaveFreshModal
          isOpen={showConfirmSaveFresh}
          onClose={() => setShowConfirmSaveFresh(false)}
          onConfirm={handleSaveAndStartFresh}
        />
      </>
    );
  }

  if (state.phase === "guided-input") {
    return (
      <>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <div className="entry-screen entry-screen--wide">
          <main id="main-content" role="main">
            <GuidedInput
              onComplete={handleGuidedInputComplete}
              onBack={() => goBackOr(() => setPhase("onboarding"))}
            />
          </main>
        </div>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {stepAnnouncement}
        </div>
      </>
    );
  }

  // ── Workflow phase (MIA Dashboard) ─────────────────────────────
  const hasOutput = state.currentStep === "plan" ? !!state.outputs.plan : !!state.outputs[state.currentStep];
  const showFeedbackDock = !state.loading
    && hasOutput
    && state.currentStep !== "plan"
    && state.currentStep !== "rag"
    && state.currentStep !== "story";

  const sdgAlignments = mergeSdgAlignments(
    state.outputs.sdg_mapping?.sdg_alignments || [],
    state.outputs.dilemmas?.sdg_alignments || [],
    state.agentState.lastMetadata?.specialists?.sdg
  );
  const sdgMappingReady = hasSdgMapping(state.outputs.sdg_mapping);
  const sdgFilterCanUnlock = canGenerateSdgMapping(state.outputs);

  async function handleSDGMapperOpen() {
    setShowSDGMapper(true);
    if (!sdgMappingReady && sdgFilterCanUnlock) {
      await generateSdgMapping();
    }
  }

  function handleSdgStatusChange(sdgNumber, newStatus) {
    const prev = state.outputs.sdg_mapping || { sdg_alignments: [] };
    const alignments = [...(prev.sdg_alignments || [])];
    const idx = alignments.findIndex((a) => a.sdgNumber === sdgNumber);
    const def = getSDGById(sdgNumber);
    if (idx >= 0) {
      alignments[idx] = { ...alignments[idx], status: newStatus };
    } else {
      alignments.push({
        sdgNumber,
        name: def?.name || `SDG ${sdgNumber}`,
        status: newStatus,
      });
    }
    setOutput("sdg_mapping", { ...prev, sdg_alignments: alignments });
  }

  const workflowContent = (
    <>
      {state.currentStep === "story" && (
        <>
          <StoryStep onSubmit={handleStorySubmit} initialText={state.story} />
          {/* Step 1 closes with what we understood, for the user to confirm or
              correct, before the Dilemma Triangle Method starts (p31). */}
          {state.outputs.focus?.inferences && !state.loading && (
            <StoryReadback
              inferences={state.outputs.focus.inferences}
              onConfirm={handleStoryReadbackConfirm}
            />
          )}
        </>
      )}

      {state.currentStep !== "story" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <BackButton
              onBack={() => {
                goBackOr(() => {
                  const currentIdx = STEP_ORDER.indexOf(state.currentStep);
                  const prevStep = currentIdx > 0 ? STEP_ORDER[currentIdx - 1] : null;
                  if (prevStep) {
                    dispatch({ type: "NAVIGATE_BACK", payload: prevStep });
                  } else {
                    setPhase("guided-input");
                  }
                });
              }}
            />
          </div>

          {state.loading && (
            <LoadingState label={`MIA agents generating ${stepMeta?.label}…`} />
          )}

          {state.error && (
            <div role="alert" className="glass-info-card--danger" style={{ marginBottom: 16 }}>
              <p className="glass-info-card--danger__title">Generation error</p>
              <p className="glass-info-card--danger__text">{state.error}</p>
              {hasOutput && (
                <p style={{ fontSize: 11, color: "#6B3A3A", margin: "0 0 10px", fontStyle: "italic" }}>
                  Your previous content is preserved below.
                </p>
              )}
              <button onClick={handleRetry} className="btn-secondary" style={{ fontSize: 12 }}>
                Try again
              </button>
            </div>
          )}

          {!state.loading && hasOutput && (
            <>
              <FeedbackAcknowledgment
                message={feedbackMessage}
                onDismiss={() => setFeedbackMessage("")}
              />

              {state.currentStep === "focus"    && (
                <FocusStep data={state.outputs.focus} />
              )}
              {state.currentStep === "issues"   && <IssuesStep   data={state.outputs.issues} />}
              {state.currentStep === "tensions" && (
                <TensionsStep
                  data={state.outputs.tensions}
                  onResolve={(index) => {
                    const current = state.outputs.tensions;
                    if (!current?.tensions) return;
                    setOutput("tensions", {
                      ...current,
                      tensions: current.tensions.map((t, i) =>
                        i === index ? { ...t, resolved: true } : t
                      ),
                    });
                  }}
                />
              )}
              {state.currentStep === "dilemmas" && (
                <DilemmasStep
                  data={state.outputs.dilemmas}
                  onReorder={(dilemmas) =>
                    setOutput("dilemmas", { ...state.outputs.dilemmas, dilemmas })
                  }
                />
              )}
              {state.currentStep === "values"   && (
                <ValuesStep
                  data={state.outputs.values}
                  dilemmasData={state.outputs.dilemmas}
                />
              )}
              {state.currentStep === "swot"     && (
                <SwotStep
                  data={state.outputs.swot}
                  selectedTitle={selectedSwotTitle}
                  onSelect={title => { setSelectedSwotTitle(title); setWorkflowError(null); }}
                  onEdit={(localItems, title) => {
                    const prev = state.outputs.swot;
                    if (!prev?.swot?.length) return;
                    const updatedSwot = prev.swot.map((entry) => {
                      if (entry.title !== title) return entry;
                      return {
                        ...entry,
                        S: localItems.strengths.map((i) => i.text),
                        W: localItems.weaknesses.map((i) => i.text),
                        O: localItems.opportunities.map((i) => i.text),
                        T: localItems.threats.map((i) => i.text),
                      };
                    });
                    setOutput("swot", { ...prev, swot: updatedSwot });
                  }}
                />
              )}
              {state.currentStep === "bmc"  && (
                <BMCStep
                  data={normalizedBmcData || state.outputs.bmc}
                  onEdit={(updated) => setOutput("bmc", updated)}
                />
              )}
              {state.currentStep === "rag" && (
                <RagStep
                  data={state.outputs.rag}
                  onChange={(updated) => setOutput("rag", updated)}
                  onRerun={() => runRagRetrieval()}
                  onUpload={handleRagUpload}
                  onDeleteDocument={handleRagDelete}
                  onApprove={handleApprove}
                  loading={state.loading || ragBusy}
                />
              )}
              {state.currentStep === "plan" && (
                <BusinessPlanStep
                  planText={state.outputs.plan}
                  selectedVP={selectedSwot}
                  story={state.story}
                  swotData={state.outputs.swot}
                  bmcData={normalizedBmcData || state.outputs.bmc}
                  outputs={state.outputs}
                  onRefine={handleRefine}
                  loading={state.loading}
                  onRequestSaveAndStartFresh={() => setShowConfirmSaveFresh(true)}
                  savedPlansCount={archivedPlans.length}
                  onViewSavedPlans={() => setShowSavedPlansModal(true)}
                />
              )}

              {state.currentStep === "swot" && !selectedSwotTitle && (
                <p style={{ fontSize: 12, color: "#A32D2D", marginTop: 14, fontWeight: 500 }}>
                  Please select a value proposition above before continuing.
                </p>
              )}
            </>
          )}

          {!state.loading && !hasOutput && !state.error && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 20 }}>
                Ready to generate {stepMeta?.label} with MIA agents.
              </p>
              <button className="btn-primary" onClick={handleRetry} style={{ padding: "11px 32px", fontSize: 15 }}>
                Generate {stepMeta?.label}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <a href="#main-content" className="skip-to-content">Skip to content</a>

      <MIADashboard
        currentStepId={state.currentStep}
        completedSteps={state.completedSteps}
        onStepClick={handleDashboardStepClick}
        onSDGMapperOpen={handleSDGMapperOpen}
        agentState={agentStateForDashboard}
        loading={state.loading}
        stepMeta={stepMeta}
        stepIdx={stepIdx}
        tone={tone}
        onToneChange={setTone}
        feedbackSlot={
          showFeedbackDock ? (
            <FeedbackBar
              stepLabel={stepMeta?.label}
              onRefine={handleRefine}
              onApprove={handleApprove}
              loading={state.loading}
              isLastStep={isLast}
            />
          ) : null
        }
      >
        {workflowContent}
      </MIADashboard>

      {showSDGMapper && (
        <SDGMapperModal
          isOpen={showSDGMapper}
          onClose={() => setShowSDGMapper(false)}
          alignments={sdgAlignments}
          onStatusChange={handleSdgStatusChange}
          mappingReady={sdgMappingReady}
          mappingLoading={sdgMappingLoading}
          canUnlockFilter={sdgFilterCanUnlock}
          mappingError={sdgMappingError}
          mappingWarning={sdgMappingWarning}
          onRetryMapping={generateSdgMapping}
        />
      )}

      <SavedPlansModal
        isOpen={showSavedPlansModal}
        onClose={() => setShowSavedPlansModal(false)}
        archives={archivedPlans}
        onRestore={handleRestoreArchivedPlan}
        onDelete={handleDeleteArchivedPlan}
      />

      <ConfirmSaveFreshModal
        isOpen={showConfirmSaveFresh}
        onClose={() => setShowConfirmSaveFresh(false)}
        onConfirm={handleSaveAndStartFresh}
      />

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {stepAnnouncement}
      </div>
    </>
  );
}
