import { MIA_STEPS, shouldUseMultiAgent } from "./geminiClient";

describe("geminiClient MIA helpers", () => {
  it("shouldUseMultiAgent returns true for MIA steps", () => {
    expect(shouldUseMultiAgent("bmc")).toBe(true);
    expect(shouldUseMultiAgent("plan")).toBe(true);
    expect(shouldUseMultiAgent("focus")).toBe(true);
    expect(shouldUseMultiAgent("tensions")).toBe(true);
  });

  it("shouldUseMultiAgent returns false for story", () => {
    expect(shouldUseMultiAgent("story")).toBe(false);
  });

  it("MIA_STEPS includes all routed workflow steps", () => {
    expect(MIA_STEPS).toContain("focus");
    expect(MIA_STEPS).toContain("bmc");
    expect(MIA_STEPS).toContain("plan");
    expect(MIA_STEPS).not.toContain("story");
  });
});
