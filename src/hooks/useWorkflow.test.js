import { workflowReducer, initialState, STEP_ORDER } from "./useWorkflow";

describe("workflowReducer", () => {
  describe("initial state", () => {
    it("has correct defaults", () => {
      expect(initialState.phase).toBe("onboarding");
      expect(initialState.currentStep).toBe("story");
      expect(initialState.completedSteps).toEqual([]);
      expect(initialState.outputs).toEqual({});
      expect(initialState.story).toBe("");
      expect(initialState.loading).toBe(false);
      expect(initialState.error).toBeNull();
    });
  });

  describe("STEP_ORDER", () => {
    it("contains exactly 10 steps in fixed order", () => {
      expect(STEP_ORDER).toHaveLength(10);
      expect(STEP_ORDER).toEqual([
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
      ]);
    });
  });

  describe("SET_PHASE", () => {
    it("updates the phase", () => {
      const result = workflowReducer(initialState, {
        type: "SET_PHASE",
        payload: "workflow",
      });
      expect(result.phase).toBe("workflow");
    });
  });

  describe("SET_STEP", () => {
    it("updates currentStep for a valid step", () => {
      const result = workflowReducer(initialState, {
        type: "SET_STEP",
        payload: "focus",
      });
      expect(result.currentStep).toBe("focus");
    });

    it("ignores invalid step IDs", () => {
      const result = workflowReducer(initialState, {
        type: "SET_STEP",
        payload: "nonexistent",
      });
      expect(result.currentStep).toBe("story");
    });
  });

  describe("COMPLETE_STEP", () => {
    it("adds current step to completedSteps and advances", () => {
      const result = workflowReducer(initialState, { type: "COMPLETE_STEP" });
      expect(result.completedSteps).toContain("story");
      expect(result.currentStep).toBe("focus");
    });

    it("does not duplicate steps in completedSteps", () => {
      const state = { ...initialState, completedSteps: ["story"] };
      const result = workflowReducer(state, { type: "COMPLETE_STEP" });
      expect(result.completedSteps.filter((s) => s === "story")).toHaveLength(1);
    });

    it("stays on the last step when completing it", () => {
      const state = { ...initialState, currentStep: "plan" };
      const result = workflowReducer(state, { type: "COMPLETE_STEP" });
      expect(result.completedSteps).toContain("plan");
      expect(result.currentStep).toBe("plan");
    });

    it("advances through all 10 steps sequentially", () => {
      let state = { ...initialState };
      for (let i = 0; i < STEP_ORDER.length - 1; i++) {
        state = workflowReducer(state, { type: "COMPLETE_STEP" });
        expect(state.currentStep).toBe(STEP_ORDER[i + 1]);
      }
      // Final step stays in place
      state = workflowReducer(state, { type: "COMPLETE_STEP" });
      expect(state.currentStep).toBe("plan");
      expect(state.completedSteps).toHaveLength(10);
    });

    it("story submit sequence lands on focus without skipping it", () => {
      let state = initialState;
      state = workflowReducer(state, { type: "SET_STORY", payload: "Eco packaging startup" });
      state = workflowReducer(state, { type: "SET_PHASE", payload: "workflow" });
      state = workflowReducer(state, {
        type: "SET_OUTPUT",
        payload: { stepId: "story", data: { text: "Eco packaging startup" } },
      });
      state = workflowReducer(state, { type: "COMPLETE_STEP" });

      expect(state.currentStep).toBe("focus");
      expect(state.completedSteps).toContain("story");
      expect(state.completedSteps).not.toContain("focus");
    });

    it("premature SET_STEP before COMPLETE_STEP skips focus (regression guard)", () => {
      let state = initialState;
      state = workflowReducer(state, { type: "SET_STORY", payload: "Eco packaging startup" });
      state = workflowReducer(state, { type: "SET_PHASE", payload: "workflow" });
      state = workflowReducer(state, { type: "SET_STEP", payload: "focus" });
      state = workflowReducer(state, {
        type: "SET_OUTPUT",
        payload: { stepId: "story", data: { text: "Eco packaging startup" } },
      });
      state = workflowReducer(state, { type: "COMPLETE_STEP" });

      expect(state.currentStep).toBe("issues");
      expect(state.completedSteps).toContain("focus");
      expect(state.completedSteps).not.toContain("story");
    });
  });

  describe("SET_OUTPUT", () => {
    it("stores output for a given step", () => {
      const data = { drivers: ["People", "Planet"] };
      const result = workflowReducer(initialState, {
        type: "SET_OUTPUT",
        payload: { stepId: "focus", data },
      });
      expect(result.outputs.focus).toEqual(data);
    });

    it("preserves existing outputs", () => {
      const state = {
        ...initialState,
        outputs: { story: "my story" },
      };
      const result = workflowReducer(state, {
        type: "SET_OUTPUT",
        payload: { stepId: "focus", data: { x: 1 } },
      });
      expect(result.outputs.story).toBe("my story");
      expect(result.outputs.focus).toEqual({ x: 1 });
    });
  });

  describe("SET_STORY", () => {
    it("sets the story text", () => {
      const result = workflowReducer(initialState, {
        type: "SET_STORY",
        payload: "A new business idea",
      });
      expect(result.story).toBe("A new business idea");
    });
  });

  describe("SET_LOADING", () => {
    it("sets loading to true", () => {
      const result = workflowReducer(initialState, {
        type: "SET_LOADING",
        payload: true,
      });
      expect(result.loading).toBe(true);
    });

    it("sets loading to false", () => {
      const state = { ...initialState, loading: true };
      const result = workflowReducer(state, {
        type: "SET_LOADING",
        payload: false,
      });
      expect(result.loading).toBe(false);
    });
  });

  describe("SET_ERROR", () => {
    it("sets an error message", () => {
      const result = workflowReducer(initialState, {
        type: "SET_ERROR",
        payload: "Something went wrong",
      });
      expect(result.error).toBe("Something went wrong");
    });

    it("clears error with null", () => {
      const state = { ...initialState, error: "old error" };
      const result = workflowReducer(state, {
        type: "SET_ERROR",
        payload: null,
      });
      expect(result.error).toBeNull();
    });
  });

  describe("NAVIGATE_BACK", () => {
    it("navigates to a previous step without losing outputs", () => {
      const state = {
        ...initialState,
        currentStep: "tensions",
        completedSteps: ["story", "focus", "issues"],
        outputs: { story: "s", focus: "f", issues: "i" },
      };
      const result = workflowReducer(state, {
        type: "NAVIGATE_BACK",
        payload: "focus",
      });
      expect(result.currentStep).toBe("focus");
      expect(result.outputs).toEqual(state.outputs);
      expect(result.completedSteps).toEqual(state.completedSteps);
    });

    it("ignores invalid step IDs", () => {
      const state = { ...initialState, currentStep: "focus" };
      const result = workflowReducer(state, {
        type: "NAVIGATE_BACK",
        payload: "invalid",
      });
      expect(result.currentStep).toBe("focus");
    });
  });

  describe("Navigation preserves all outputs (Req 7.3, 7.4, 7.5)", () => {
    const stateWithMultipleOutputs = {
      ...initialState,
      phase: "workflow",
      currentStep: "dilemmas",
      completedSteps: ["story", "focus", "issues", "tensions", "dilemmas"],
      outputs: {
        story: { text: "My business story" },
        focus: { drivers: ["People", "Planet", "Prosperity"] },
        issues: { issues: [{ title: "Issue A" }, { title: "Issue B" }] },
        tensions: { matrix: [[1, 2], [3, 4]] },
        dilemmas: { ranked: [{ score: 8 }, { score: 5 }] },
      },
    };

    it("NAVIGATE_BACK preserves all output entries unchanged", () => {
      const outputsBefore = { ...stateWithMultipleOutputs.outputs };
      const result = workflowReducer(stateWithMultipleOutputs, {
        type: "NAVIGATE_BACK",
        payload: "story",
      });
      expect(result.currentStep).toBe("story");
      expect(result.outputs).toEqual(outputsBefore);
    });

    it("SET_STEP (forward navigation) preserves all output entries", () => {
      // Navigate back first
      const afterBack = workflowReducer(stateWithMultipleOutputs, {
        type: "NAVIGATE_BACK",
        payload: "focus",
      });
      // Then navigate forward via SET_STEP
      const afterForward = workflowReducer(afterBack, {
        type: "SET_STEP",
        payload: "dilemmas",
      });
      expect(afterForward.currentStep).toBe("dilemmas");
      expect(afterForward.outputs).toEqual(stateWithMultipleOutputs.outputs);
    });

    it("multiple back-and-forward navigations preserve all outputs", () => {
      const originalOutputs = { ...stateWithMultipleOutputs.outputs };
      let state = stateWithMultipleOutputs;

      // Navigate back to story
      state = workflowReducer(state, { type: "NAVIGATE_BACK", payload: "story" });
      expect(state.outputs).toEqual(originalOutputs);

      // Navigate forward to issues
      state = workflowReducer(state, { type: "SET_STEP", payload: "issues" });
      expect(state.outputs).toEqual(originalOutputs);

      // Navigate back to focus
      state = workflowReducer(state, { type: "NAVIGATE_BACK", payload: "focus" });
      expect(state.outputs).toEqual(originalOutputs);

      // Navigate forward to dilemmas
      state = workflowReducer(state, { type: "SET_STEP", payload: "dilemmas" });
      expect(state.outputs).toEqual(originalOutputs);

      // All outputs still intact
      expect(state.outputs.story).toEqual({ text: "My business story" });
      expect(state.outputs.focus).toEqual({ drivers: ["People", "Planet", "Prosperity"] });
      expect(state.outputs.issues).toEqual({ issues: [{ title: "Issue A" }, { title: "Issue B" }] });
      expect(state.outputs.tensions).toEqual({ matrix: [[1, 2], [3, 4]] });
      expect(state.outputs.dilemmas).toEqual({ ranked: [{ score: 8 }, { score: 5 }] });
    });

    it("NAVIGATE_BACK does not modify completedSteps", () => {
      const completedBefore = [...stateWithMultipleOutputs.completedSteps];
      const result = workflowReducer(stateWithMultipleOutputs, {
        type: "NAVIGATE_BACK",
        payload: "story",
      });
      expect(result.completedSteps).toEqual(completedBefore);
    });

    it("COMPLETE_STEP does not clear previously stored outputs", () => {
      // At 'dilemmas' with multiple outputs populated
      const result = workflowReducer(stateWithMultipleOutputs, {
        type: "COMPLETE_STEP",
      });
      // All previous outputs should remain
      expect(result.outputs.story).toEqual({ text: "My business story" });
      expect(result.outputs.focus).toEqual({ drivers: ["People", "Planet", "Prosperity"] });
      expect(result.outputs.issues).toEqual({ issues: [{ title: "Issue A" }, { title: "Issue B" }] });
      expect(result.outputs.tensions).toEqual({ matrix: [[1, 2], [3, 4]] });
      expect(result.outputs.dilemmas).toEqual({ ranked: [{ score: 8 }, { score: 5 }] });
    });

    it("revisiting a step displays its existing output (output accessible via state.outputs[stepId])", () => {
      // After navigating back, the output for that step is still in state.outputs
      const result = workflowReducer(stateWithMultipleOutputs, {
        type: "NAVIGATE_BACK",
        payload: "focus",
      });
      // The step component will render state.outputs[currentStep]
      expect(result.outputs[result.currentStep]).toEqual({ drivers: ["People", "Planet", "Prosperity"] });
    });
  });

  describe("RESET", () => {
    it("returns to initial state", () => {
      const state = {
        ...initialState,
        phase: "workflow",
        currentStep: "swot",
        completedSteps: ["story", "focus"],
        outputs: { story: "data" },
        story: "something",
        loading: true,
        error: "error",
      };
      const result = workflowReducer(state, { type: "RESET" });
      expect(result).toEqual(initialState);
    });
  });

  describe("agent state", () => {
    it("SET_AGENT_STATUS updates agentStatuses", () => {
      const result = workflowReducer(initialState, {
        type: "SET_AGENT_STATUS",
        payload: { agentId: "market", status: "running" },
      });
      expect(result.agentState.agentStatuses.market).toBe("running");
    });

    it("SET_AGENT_METADATA stores pipeline metadata", () => {
      const metadata = { stages: ["market", "synthesis"], totalTimeMs: 5000 };
      const result = workflowReducer(initialState, {
        type: "SET_AGENT_METADATA",
        payload: metadata,
      });
      expect(result.agentState.lastMetadata).toEqual(metadata);
      expect(result.agentState.activeStage).toBeNull();
    });

    it("RESET_AGENT_STATE clears agent state", () => {
      const state = {
        ...initialState,
        agentState: {
          activeStage: "market",
          agentStatuses: { market: "running" },
          agentConfidences: {},
          activityEvents: [{ name: "market" }],
          lastMetadata: { stages: [] },
        },
      };
      const result = workflowReducer(state, { type: "RESET_AGENT_STATE" });
      expect(result.agentState.activityEvents).toEqual([]);
      expect(result.agentState.lastMetadata).toBeNull();
    });

    it("INIT_MIA_AGENTS sets active agents to queued and inactive to standby", () => {
      const state = {
        ...initialState,
        agentState: {
          ...initialState.agentState,
          agentStatuses: { sdg: "error", financial: "error" },
          agentConfidences: { sdg: 0 },
        },
      };
      const result = workflowReducer(state, {
        type: "INIT_MIA_AGENTS",
        payload: ["market", "sdg"],
      });

      expect(result.agentState.agentStatuses.market).toBe("queued");
      expect(result.agentState.agentStatuses.sdg).toBe("queued");
      expect(result.agentState.agentStatuses.financial).toBe("standby");
      expect(result.agentState.agentStatuses.critique).toBe("standby");
      expect(result.agentState.agentConfidences).toEqual({});
      expect(result.agentState.activityEvents).toEqual([]);
    });
  });

  describe("APPLY_AGENT_PROGRESS", () => {
    it("batches stage, status, activity, and specialist updates", () => {
      const state = {
        ...initialState,
        agentState: {
          ...initialState.agentState,
          agentStatuses: { market: "queued" },
        },
      };

      const result = workflowReducer(state, {
        type: "APPLY_AGENT_PROGRESS",
        payload: {
          activeStage: "market",
          statusUpdates: [{ agentId: "market", status: "running", confidence: 0.8 }],
          activityEvents: [{ name: "market", status: "running", timestamp: 1 }],
          specialistUpserts: [{ agentId: "market", result: { insights: ["A"], confidence: 0.8 } }],
        },
      });

      expect(result.agentState.activeStage).toBe("market");
      expect(result.agentState.agentStatuses.market).toBe("running");
      expect(result.agentState.agentConfidences.market).toBe(0.8);
      expect(result.agentState.activityEvents).toHaveLength(1);
      expect(result.agentState.lastMetadata?.specialists?.market?.insights).toEqual(["A"]);
    });

    it("merges completion metadata and clears active stage", () => {
      const state = {
        ...initialState,
        agentState: {
          ...initialState.agentState,
          activeStage: "writer",
          lastMetadata: {
            specialists: {
              market: { insights: ["Existing"], confidence: 0.7 },
            },
          },
        },
      };

      const result = workflowReducer(state, {
        type: "APPLY_AGENT_PROGRESS",
        payload: {
          metadata: {
            specialists: {
              market: { insights: ["New"], confidence: 0.9 },
            },
            synthesisNotes: "Done",
          },
          activeStage: null,
          statusUpdates: [{ agentId: "market", status: "complete", confidence: 0.9 }],
        },
      });

      expect(result.agentState.activeStage).toBeNull();
      expect(result.agentState.lastMetadata.synthesisNotes).toBe("Done");
      expect(result.agentState.agentStatuses.market).toBe("complete");
    });
  });

  describe("unknown action", () => {
    it("returns state unchanged", () => {
      const result = workflowReducer(initialState, { type: "UNKNOWN_ACTION" });
      expect(result).toEqual(initialState);
    });
  });
});
