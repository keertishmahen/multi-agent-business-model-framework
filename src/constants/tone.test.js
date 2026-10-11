import { TONES, DEFAULT_TONE, getTone, applyTone } from "./tone";

describe("tone", () => {
  it("offers a plain, balanced and formal register", () => {
    expect(TONES.map((t) => t.id)).toEqual(["plain", "balanced", "formal"]);
  });

  it("every tone carries a directive the model can act on", () => {
    TONES.forEach((t) => {
      expect(t.directive).toMatch(/^TONE:/);
      expect(t.label).toBeTruthy();
    });
  });

  it("falls back to the default for an unknown id", () => {
    expect(getTone("nonsense").id).toBe(DEFAULT_TONE);
    expect(getTone(undefined).id).toBe(DEFAULT_TONE);
  });

  it("appends the directive to a prompt", () => {
    const result = applyTone("Write the plan.", "plain");
    expect(result).toContain("Write the plan.");
    expect(result).toContain("plain, everyday English");
  });

  it("leaves an empty prompt alone", () => {
    expect(applyTone("", "plain")).toBe("");
    expect(applyTone(null, "plain")).toBe(null);
  });

  it("uses the default directive when no tone is given", () => {
    expect(applyTone("Draft.", undefined)).toContain(getTone(DEFAULT_TONE).directive);
  });
});
