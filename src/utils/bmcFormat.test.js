import {
  normalizeBlocks,
  blocksToCanvas,
  getBmcCanvas,
  hasBmcContent,
  normalizeBmcOutput,
  deriveImpactBlocks,
  coerceCanvasItems,
  canonicalizeCanvas,
} from "./bmcFormat";

describe("bmcFormat", () => {
  const llmCanvas11 = {
    key_partners: ["Partner A"],
    key_activities: ["Activity A"],
    key_resources: ["Resource A"],
    value_propositions: ["VP A"],
    customer_relationships: ["Relationship A"],
    channels: ["Channel A"],
    customer_segments: ["Segment A"],
    revenue_streams: ["Revenue A"],
    cost_structure: ["Cost A"],
    social_environmental_cost: ["Emissions from manufacturing"],
    social_environmental_benefit: ["Safe water access for 10k households"],
  };

  const workflowContext = {
    outputs: {
      swot: {
        swot: [{
          title: "Transparent Purity",
          S: ["Strong AI validation"],
          W: ["High manufacturing cost"],
          O: ["Growing demand for safe water"],
          T: ["Competitor price pressure"],
        }],
      },
      values: {
        value_propositions: [{
          title: "Transparent Purity",
          benefits: ["Affordable safe water for families"],
          sdgs: ["SDG 6"],
        }],
      },
      dilemmas: {
        dilemmas: [{
          title: "Access vs Profit",
          description: "Balancing affordability with sustainable materials",
          drivers: ["People", "Planet"],
        }],
      },
      focus: {
        focuses: [
          { driver: "Planet", focus: "Reduce filter waste in landfills", sdgs: ["SDG 12"] },
          { driver: "People", focus: "Equitable water access", sdgs: ["SDG 6"] },
        ],
      },
    },
    selectedSwotTitle: "Transparent Purity",
  };

  it("normalizes LLM canvas with all 11 keys", () => {
    const blocks = normalizeBlocks({ bmc: [{ canvas: llmCanvas11 }] });
    expect(blocks.socialEnvironmentalCost).toHaveLength(1);
    expect(blocks.socialEnvironmentalCost[0].text).toBe("Emissions from manufacturing");
    expect(blocks.socialEnvironmentalBenefit[0].text).toBe("Safe water access for 10k households");
  });

  it("normalizes legacy 9-key canvas with empty blocks 10 and 11", () => {
    const legacy = { ...llmCanvas11 };
    delete legacy.social_environmental_cost;
    delete legacy.social_environmental_benefit;

    const blocks = normalizeBlocks({ bmc: [{ canvas: legacy }] }, workflowContext);
    expect(blocks.keyPartners[0].text).toBe("Partner A");
    expect(blocks.socialEnvironmentalCost.length).toBeGreaterThan(0);
    expect(blocks.socialEnvironmentalBenefit.length).toBeGreaterThan(0);
  });

  it("blocksToCanvas round-trips normalized blocks", () => {
    const blocks = normalizeBlocks({ bmc: [{ canvas: llmCanvas11 }] });
    const canvas = blocksToCanvas(blocks);
    expect(canvas.social_environmental_cost).toEqual(["Emissions from manufacturing"]);
    expect(canvas.social_environmental_benefit).toEqual(["Safe water access for 10k households"]);
  });

  it("getBmcCanvas reads LLM format", () => {
    const canvas = getBmcCanvas({ bmc: [{ canvas: llmCanvas11 }] });
    expect(canvas.social_environmental_cost).toHaveLength(1);
  });

  it("getBmcCanvas reads edited blocks format", () => {
    const blocks = normalizeBlocks({ bmc: [{ canvas: llmCanvas11 }] });
    blocks.socialEnvironmentalBenefit.push({
      id: "socialEnvironmentalBenefit-new",
      text: "SDG 6 alignment via clean water",
    });
    const canvas = getBmcCanvas({ blocks });
    expect(canvas.social_environmental_benefit).toContain("SDG 6 alignment via clean water");
  });

  it("hasBmcContent detects both formats", () => {
    expect(hasBmcContent({ bmc: [{ canvas: llmCanvas11 }] })).toBe(true);
    expect(hasBmcContent({ blocks: normalizeBlocks({ bmc: [{ canvas: llmCanvas11 }] }) })).toBe(true);
    expect(hasBmcContent(null)).toBe(false);
  });

  it("coerceCanvasItems handles strings, arrays, and objects", () => {
    expect(coerceCanvasItems("Single impact")).toEqual(["Single impact"]);
    expect(coerceCanvasItems([{ text: "Nested" }, "Plain"])).toEqual(["Nested", "Plain"]);
  });

  it("canonicalizeCanvas maps alias keys", () => {
    const canvas = canonicalizeCanvas({
      key_partners: ["Partner"],
      social_and_environmental_cost: ["Waste from cartridges"],
      social_and_environmental_benefit: ["Clean water access"],
    });
    expect(canvas.social_environmental_cost).toEqual(["Waste from cartridges"]);
    expect(canvas.social_environmental_benefit).toEqual(["Clean water access"]);
  });

  it("deriveImpactBlocks builds cost and benefit items from workflow context", () => {
    const derived = deriveImpactBlocks(workflowContext);
    expect(derived.social_environmental_cost.some((item) => item.includes("High manufacturing cost"))).toBe(true);
    expect(derived.social_environmental_benefit.some((item) => item.includes("Affordable safe water"))).toBe(true);
    expect(derived.social_environmental_benefit.some((item) => item.includes("SDG 6"))).toBe(true);
  });

  it("normalizeBmcOutput backfills missing impact blocks without overwriting LLM content", () => {
    const legacy = { bmc: [{ value_proposition: "VP", canvas: { ...llmCanvas11 } }] };
    delete legacy.bmc[0].canvas.social_environmental_cost;
    delete legacy.bmc[0].canvas.social_environmental_benefit;

    const normalized = normalizeBmcOutput(legacy, workflowContext);
    expect(normalized.bmc[0].canvas.social_environmental_cost.length).toBeGreaterThan(0);
    expect(normalized.bmc[0].canvas.social_environmental_benefit.length).toBeGreaterThan(0);
  });

  it("normalizeBmcOutput preserves existing LLM impact blocks", () => {
    const normalized = normalizeBmcOutput({ bmc: [{ canvas: llmCanvas11 }] }, workflowContext);
    expect(normalized.bmc[0].canvas.social_environmental_cost).toEqual(["Emissions from manufacturing"]);
    expect(normalized.bmc[0].canvas.social_environmental_benefit).toEqual(["Safe water access for 10k households"]);
  });
});
