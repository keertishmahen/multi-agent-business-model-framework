import { pathFromState, stateFromPath, normalizeHash, routesEqual } from "./appRoutes";
import { STEP_ORDER } from "../hooks/useWorkflow";

describe("appRoutes", () => {
  describe("normalizeHash", () => {
    it("strips hash and trailing slash", () => {
      expect(normalizeHash("#/guided/")).toBe("/guided");
      expect(normalizeHash("/onboarding")).toBe("/onboarding");
      expect(normalizeHash("")).toBe("/");
      expect(normalizeHash("#")).toBe("/");
    });
  });

  describe("pathFromState", () => {
    it("maps onboarding and guided phases", () => {
      expect(pathFromState({ phase: "onboarding" })).toBe("#/onboarding");
      expect(pathFromState({ phase: "guided-input" })).toBe("#/guided");
    });

    it("maps each workflow step", () => {
      for (const step of STEP_ORDER) {
        expect(pathFromState({ phase: "workflow", currentStep: step })).toBe(
          `#/workflow/${step}`
        );
      }
    });

    it("falls back to story for unknown workflow step", () => {
      expect(pathFromState({ phase: "workflow", currentStep: "nope" })).toBe(
        "#/workflow/story"
      );
    });
  });

  describe("stateFromPath", () => {
    it("parses onboarding variants", () => {
      expect(stateFromPath("#/onboarding")).toEqual({
        phase: "onboarding",
        currentStep: "story",
      });
      expect(stateFromPath("")).toEqual({
        phase: "onboarding",
        currentStep: "story",
      });
      expect(stateFromPath("#/unknown")).toEqual({
        phase: "onboarding",
        currentStep: "story",
      });
    });

    it("parses guided and workflow hashes", () => {
      expect(stateFromPath("#/guided")).toEqual({
        phase: "guided-input",
        currentStep: "story",
      });
      expect(stateFromPath("#/workflow/bmc")).toEqual({
        phase: "workflow",
        currentStep: "bmc",
      });
    });

    it("falls back invalid workflow steps to story", () => {
      expect(stateFromPath("#/workflow/not-a-step")).toEqual({
        phase: "workflow",
        currentStep: "story",
      });
    });
  });

  describe("round-trip", () => {
    it("survives pathFromState → stateFromPath for all steps", () => {
      const phases = [
        { phase: "onboarding", currentStep: "story" },
        { phase: "guided-input", currentStep: "story" },
        ...STEP_ORDER.map((currentStep) => ({ phase: "workflow", currentStep })),
      ];
      for (const state of phases) {
        expect(stateFromPath(pathFromState(state))).toEqual(
          state.phase === "workflow"
            ? state
            : { phase: state.phase, currentStep: "story" }
        );
      }
    });
  });

  describe("routesEqual", () => {
    it("compares workflow by step and other phases by phase only", () => {
      expect(
        routesEqual(
          { phase: "guided-input", currentStep: "story" },
          { phase: "guided-input", currentStep: "story" }
        )
      ).toBe(true);
      expect(
        routesEqual(
          { phase: "workflow", currentStep: "focus" },
          { phase: "workflow", currentStep: "issues" }
        )
      ).toBe(false);
    });
  });
});
