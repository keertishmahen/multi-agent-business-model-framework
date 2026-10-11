import { renderHook, act } from "@testing-library/react";
import { useTour, TOUR_STEPS } from "./useTour";

const WORKFLOW_TARGETS = [
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

describe("useTour", () => {
  it("starts inactive with currentStep 1", () => {
    const { result } = renderHook(() => useTour());
    expect(result.current.isActive).toBe(false);
    expect(result.current.currentStep).toBe(1);
    expect(result.current.totalSteps).toBe(TOUR_STEPS.length);
  });

  it("start() sets isActive to true and currentStep to 1", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    expect(result.current.isActive).toBe(true);
    expect(result.current.currentStep).toBe(1);
  });

  it("next() increments currentStep", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    act(() => result.current.next());
    expect(result.current.currentStep).toBe(2);
  });

  it("next() clamps at the last step", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    for (let i = 0; i < TOUR_STEPS.length + 2; i++) {
      act(() => result.current.next());
    }
    expect(result.current.currentStep).toBe(TOUR_STEPS.length);
  });

  it("back() decrements currentStep", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.currentStep).toBe(3);
    act(() => result.current.back());
    expect(result.current.currentStep).toBe(2);
  });

  it("back() clamps at 1", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    act(() => result.current.back());
    expect(result.current.currentStep).toBe(1);
  });

  it("exit() sets isActive to false and resets to step 1", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.currentStep).toBe(3);
    act(() => result.current.exit());
    expect(result.current.isActive).toBe(false);
    expect(result.current.currentStep).toBe(1);
  });

  it("stepData returns the correct TOUR_STEPS entry for currentStep", () => {
    const { result } = renderHook(() => useTour());
    act(() => result.current.start());
    expect(result.current.stepData).toEqual(TOUR_STEPS[0]);
    act(() => result.current.next());
    expect(result.current.stepData).toEqual(TOUR_STEPS[1]);
  });

  it("includes intro/DTM slides then all 10 workflow targets", () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(14);
    const workflowTargets = TOUR_STEPS.map((s) => s.targetStep).filter(Boolean);
    expect(workflowTargets).toEqual(WORKFLOW_TARGETS);
    expect(TOUR_STEPS.slice(0, 5).every((s) => s.targetStep === null)).toBe(true);
  });

  it("each TOUR_STEP has id, title, description, exampleData, and targetStep", () => {
    TOUR_STEPS.forEach((step) => {
      expect(step).toHaveProperty("id");
      expect(step).toHaveProperty("title");
      expect(step).toHaveProperty("description");
      expect(step).toHaveProperty("exampleData");
      expect(step).toHaveProperty("targetStep");
      expect(step.title).not.toBe("");
      expect(step.description).not.toBe("");
    });
  });

  it("includes DTM triangle and BMC canvas figure steps", () => {
    expect(TOUR_STEPS.some((s) => s.exampleData?.dtmTriangle)).toBe(true);
    expect(TOUR_STEPS.some((s) => s.exampleData?.bmcCanvas)).toBe(true);
  });
});
