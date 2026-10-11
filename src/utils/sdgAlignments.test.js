import {
  alignmentsFromSpecialist,
  mergeSdgAlignments,
  normalizeSdgMapping,
  hasSdgMapping,
  countWithLocalRelevance,
} from "./sdgAlignments";

describe("sdgAlignments", () => {
  it("parses SDG numbers from specialist insights", () => {
    const alignments = alignmentsFromSpecialist({
      insights: [
        "SDG 7: Affordable and Clean Energy — solar packaging reduces grid reliance",
        "SDG 12: Responsible Consumption — recyclable materials",
      ],
      confidence: 0.9,
    });

    expect(alignments).toHaveLength(2);
    expect(alignments[0].sdgNumber).toBe(7);
    expect(alignments[0].name).toBe("Affordable and Clean Energy");
    expect(alignments[1].sdgNumber).toBe(12);
    expect(alignments[1].name).toBe("Responsible Consumption and Production");
  });

  it("parses SDG numbers from object specialist insights", () => {
    const alignments = alignmentsFromSpecialist({
      insights: [{
        type: "alignment",
        explanation: "SDG 12: Responsible consumption through recyclable packaging",
      }],
      confidence: 0.9,
    });

    expect(alignments).toHaveLength(1);
    expect(alignments[0].sdgNumber).toBe(12);
    expect(typeof alignments[0].evidenceSource).toBe("string");
  });

  it("merges mapping alignments as primary source", () => {
    const merged = mergeSdgAlignments(
      [{
        sdgNumber: 3,
        name: "Good Health",
        status: "undecided",
        nonAlignmentReason: "Not a health business",
        localRelevance: "Australia",
      }],
      [{ sdgNumber: 3, name: "Good Health", status: "strong", evidenceSource: "Health program" }],
      { insights: ["SDG 7: Clean energy alignment"], confidence: 0.8 }
    );

    expect(merged.find((a) => a.sdgNumber === 3).status).toBe("undecided");
    expect(merged.find((a) => a.sdgNumber === 3).localRelevance).toBe("Australia");
    expect(merged.find((a) => a.sdgNumber === 7)).toBeTruthy();
  });

  it("fills gaps from dilemma alignments when mapping missing", () => {
    const merged = mergeSdgAlignments(
      [],
      [{ sdgNumber: 3, name: "Good Health", status: "strong", evidenceSource: "Health program" }],
      { insights: ["SDG 7: Clean energy alignment"], confidence: 0.8 }
    );

    expect(merged).toHaveLength(2);
    expect(merged.find((a) => a.sdgNumber === 3).status).toBe("strong");
  });

  it("normalizes sdg_mapping output", () => {
    const mapping = normalizeSdgMapping({
      sdg_alignments: [
        {
          sdgNumber: 5,
          status: "undecided",
          localRelevance: "Australia",
          nonAlignmentReason: "Not a gender-focused business",
        },
      ],
    });

    expect(mapping.sdg_alignments).toHaveLength(1);
    expect(mapping.sdg_alignments[0].name).toBe("Gender Equality");
    expect(mapping.sdg_alignments[0].localRelevance).toBe("Australia");
  });

  it("defaults missing localRelevance to Global", () => {
    const mapping = normalizeSdgMapping({
      sdg_alignments: [{ sdgNumber: 3, status: "inferred" }],
    });
    expect(mapping.sdg_alignments[0].localRelevance).toBe("Global");
  });

  it("detects sdg mapping presence", () => {
    expect(hasSdgMapping(null)).toBe(false);
    expect(hasSdgMapping({ sdg_alignments: [] })).toBe(false);
    expect(hasSdgMapping({ sdg_alignments: [{ sdgNumber: 1 }] })).toBe(true);
  });

  it("counts alignments with local relevance", () => {
    expect(countWithLocalRelevance([
      { localRelevance: "Australia" },
      { localRelevance: "Global" },
      {},
    ])).toBe(2);
  });
});
