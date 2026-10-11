import {
  normalizeDimension,
  computeDilemmaScore,
  normalizeDilemma,
  normalizeDilemmasOutput,
  sortDilemmasByScore,
  sortDilemmasByRank,
  applyRanksFromOrder,
  hasRankedDilemmas,
  getLegacyRankingRationale,
} from "./dilemmaScore";

describe("dilemmaScore", () => {
  describe("normalizeDimension", () => {
    it("clamps values to 1–4", () => {
      expect(normalizeDimension(0)).toBe(1);
      expect(normalizeDimension(5)).toBe(4);
      expect(normalizeDimension(3)).toBe(3);
    });

    it("parses string numbers", () => {
      expect(normalizeDimension("3")).toBe(3);
    });

    it("defaults invalid values to 2", () => {
      expect(normalizeDimension(null)).toBe(2);
      expect(normalizeDimension("abc")).toBe(2);
    });
  });

  describe("computeDilemmaScore", () => {
    it("maps 4×3×3=36 to scaled priority", () => {
      const result = computeDilemmaScore({ severity: 4, reversibility: 3, reach: 3 });
      expect(result.product).toBe(36);
      expect(result.score).toBe(6);
    });

    it("maps minimum 1×1×1 to priority 1", () => {
      const result = computeDilemmaScore({ severity: 1, reversibility: 1, reach: 1 });
      expect(result.product).toBe(1);
      expect(result.score).toBe(1);
    });

    it("maps maximum 4×4×4 to priority 10", () => {
      const result = computeDilemmaScore({ severity: 4, reversibility: 4, reach: 4 });
      expect(result.product).toBe(64);
      expect(result.score).toBe(10);
    });
  });

  describe("normalizeDilemma", () => {
    it("overwrites LLM-provided score with computed value", () => {
      const normalized = normalizeDilemma({
        title: "A vs B",
        severity: 4,
        reversibility: 3,
        reach: 3,
        score: 10,
      });
      expect(normalized.score).toBe(6);
      expect(normalized.scoreProduct).toBe(36);
    });
  });

  describe("normalizeDilemmasOutput", () => {
    it("normalizes all dilemmas in output", () => {
      const result = normalizeDilemmasOutput({
        dilemmas: [
          { title: "A", severity: 2, reversibility: 2, reach: 2, score: 99 },
          { title: "B", severity: 4, reversibility: 4, reach: 4, score: 5 },
        ],
      });
      expect(result.dilemmas[0].score).not.toBe(99);
      expect(result.dilemmas[1].score).toBe(10);
    });
  });

  describe("sortDilemmasByScore", () => {
    it("sorts by score descending with title tie-break", () => {
      const sorted = sortDilemmasByScore([
        { title: "Beta", score: 8 },
        { title: "Alpha", score: 10 },
        { title: "Gamma", score: 10 },
      ]);
      expect(sorted[0].title).toBe("Alpha");
      expect(sorted[1].title).toBe("Gamma");
      expect(sorted[2].title).toBe("Beta");
    });
  });

  describe("sortDilemmasByRank", () => {
    it("sorts by rank ascending", () => {
      const sorted = sortDilemmasByRank([
        { title: "C", rank: 3 },
        { title: "A", rank: 1 },
        { title: "B", rank: 2 },
      ]);
      expect(sorted.map((d) => d.title)).toEqual(["A", "B", "C"]);
    });

    it("falls back to score sort when ranks are missing", () => {
      const sorted = sortDilemmasByRank([
        { title: "Low", score: 3 },
        { title: "High", score: 9 },
      ]);
      expect(sorted[0].title).toBe("High");
    });
  });

  describe("applyRanksFromOrder", () => {
    it("assigns ranks 1–N and marks userReordered", () => {
      const result = applyRanksFromOrder([
        { title: "Second" },
        { title: "First" },
      ]);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result.every((d) => d.userReordered)).toBe(true);
    });
  });

  describe("hasRankedDilemmas", () => {
    it("detects valid ranks", () => {
      expect(hasRankedDilemmas([{ rank: 2 }])).toBe(true);
      expect(hasRankedDilemmas([{ score: 8 }])).toBe(false);
    });
  });

  describe("getLegacyRankingRationale", () => {
    it("mentions supporting metrics", () => {
      const text = getLegacyRankingRationale({
        severity: 4,
        reversibility: 3,
        reach: 2,
      });
      expect(text).toContain("severity (4/4)");
      expect(text).toContain("Regenerate or refine");
    });
  });
});
