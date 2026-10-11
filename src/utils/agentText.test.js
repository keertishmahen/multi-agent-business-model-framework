import {
  formatAgentText,
  formatAgentTextList,
  sanitizeAgentMetadata,
  collectRagSourcesFromMetadata,
  formatSourceLabel,
} from "./agentText";

describe("collectRagSourcesFromMetadata", () => {
  it("returns retrieval sources from the backend", () => {
    const sources = collectRagSourcesFromMetadata({
      sources: ["user_context:bmc_channels", "sdg_knowledge:sdg_7"],
    });
    expect(sources).toEqual(["user_context:bmc_channels", "sdg_knowledge:sdg_7"]);
  });

  it("merges specialist-cited sources after retrieval sources", () => {
    const sources = collectRagSourcesFromMetadata({
      sources: ["business_frameworks:bmc_overview"],
      specialists: { market: { sources: ["Industry report 2025"] } },
    });
    expect(sources[0]).toBe("business_frameworks:bmc_overview");
    expect(sources).toContain("Industry report 2025");
  });

  it("de-duplicates", () => {
    const sources = collectRagSourcesFromMetadata({
      sources: ["sdg_knowledge:sdg_7"],
      specialists: { sdg: { sources: ["sdg_knowledge:sdg_7"] } },
    });
    expect(sources).toHaveLength(1);
  });

  it("handles missing or empty metadata", () => {
    expect(collectRagSourcesFromMetadata(null)).toEqual([]);
    expect(collectRagSourcesFromMetadata({})).toEqual([]);
  });
});

describe("formatSourceLabel", () => {
  it("names the user's own BMC blocks", () => {
    expect(formatSourceLabel("user_context:bmc_value_propositions")).toBe(
      "Your Business Model Canvas · value propositions"
    );
  });

  it("names earlier workflow steps", () => {
    expect(formatSourceLabel("user_context:swot")).toBe("Your earlier step · swot");
  });

  it("labels each knowledge collection readably", () => {
    expect(formatSourceLabel("business_plan_sections:Executive Summary")).toContain(
      "Business plan guidance"
    );
    expect(formatSourceLabel("sdg_knowledge:sdg_7")).toContain("UN SDG reference");
    expect(formatSourceLabel("industry_patterns:market_tam")).toContain("Industry pattern");
  });

  it("falls back gracefully for unknown shapes", () => {
    expect(formatSourceLabel("something_else")).toBe("something else");
    expect(formatSourceLabel("")).toBe("");
  });
});

describe("formatAgentText", () => {
  it("returns strings unchanged", () => {
    expect(formatAgentText("SDG 7 alignment")).toBe("SDG 7 alignment");
  });

  it("formats SDG warning objects", () => {
    const result = formatAgentText({
      type: "greenwashing",
      flag: "high",
      explanation: "Claims lack measurable data",
      impact_metrics_recommendation: "Track kg CO2 saved per unit",
    });
    expect(result).toContain("greenwashing");
    expect(result).toContain("Claims lack measurable data");
    expect(result).toContain("Track kg CO2 saved");
  });

  it("formats generic objects via JSON fallback", () => {
    expect(formatAgentText({ foo: "bar" })).toBe('{"foo":"bar"}');
  });

  it("formatAgentTextList filters empty values", () => {
    expect(formatAgentTextList(["a", null, "", { explanation: "warn" }])).toEqual(["a", "warn"]);
  });

  it("sanitizeAgentMetadata converts nested specialist objects to strings", () => {
    const sanitized = sanitizeAgentMetadata({
      specialists: {
        sdg: {
          insights: [{ explanation: "SDG 7: Clean energy", type: "alignment" }],
          warnings: [{
            type: "greenwashing",
            flag: "high",
            explanation: "No evidence",
            impact_metrics_recommendation: "Track emissions",
          }],
          confidence: 0.9,
        },
      },
      conflicts: [{ description: { explanation: "Conflict found" }, resolution: "Resolve it" }],
    });

    expect(sanitized.specialists.sdg.insights[0]).toContain("SDG 7");
    expect(typeof sanitized.specialists.sdg.warnings[0]).toBe("string");
    expect(sanitized.conflicts[0].description).toContain("Conflict found");
  });
});
