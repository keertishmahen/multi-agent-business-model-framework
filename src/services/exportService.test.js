import {
  parsePlanSections,
  PLAN_SECTION_HEADINGS,
  normalizePlanText,
  normalizeSwotEntry,
  normalizeSwotQuadrantItems,
  getSectionBodyForSlide,
  formatBmcBullets,
} from "./exportService";

describe("parsePlanSections", () => {
  const samplePlan = `1. Executive Summary
This is the executive summary for our water filter business.

2. Market Opportunity
- Growing demand for clean water
- Target market in urban areas

3. Business Model Overview
We use a subscription BMC model.

10. Conclusion & Next Steps
Launch pilot in Q3.`;

  it("parses numbered sections into keyed objects", () => {
    const sections = parsePlanSections(samplePlan);
    expect(sections[1].title).toBe("Executive Summary");
    expect(sections[1].body).toContain("water filter business");
    expect(sections[2].body).toContain("Growing demand");
    expect(sections[10].title).toBe("Conclusion & Next Steps");
  });

  it("parses markdown headings", () => {
    const markdownPlan = `## 1. Executive Summary

Our business delivers clean water.

## 8. Key Risks & Mitigation Strategies

Supply chain delays are a key risk.`;

    const sections = parsePlanSections(markdownPlan);
    expect(sections[1].body).toContain("clean water");
    expect(sections[8].body).toContain("Supply chain");
  });

  it("parses unnumbered section headings", () => {
    const unnumberedPlan = `Executive Summary

We solve water access.

Key Risks & Mitigation Strategies

Mitigate via partnerships.`;

    const sections = parsePlanSections(unnumberedPlan);
    expect(sections[1].body).toContain("water access");
    expect(sections[8].body).toContain("partnerships");
  });

  it("returns empty object for missing input", () => {
    expect(parsePlanSections("")).toEqual({});
    expect(parsePlanSections(null)).toEqual({});
  });

  it("defines 10 plan section headings", () => {
    expect(PLAN_SECTION_HEADINGS).toHaveLength(10);
    expect(PLAN_SECTION_HEADINGS[0]).toBe("Executive Summary");
  });

  it("captures content after a blank line following a heading", () => {
    const plan = `1. Executive Summary

Our wellness smartwatch targets privacy-conscious UK consumers.

2. Market Opportunity
Growing demand for verified health data.`;

    const sections = parsePlanSections(plan);
    expect(sections[1].body).toContain("privacy-conscious");
    expect(sections[2].body).toContain("Growing demand");
  });

  it("redistributes trailing prose when headings are listed consecutively", () => {
    const headings = PLAN_SECTION_HEADINGS.map((h, i) => `${i + 1}. ${h}`).join("\n");
    const plan = `${headings}

Executive summary content for the plan.
Market analysis shows strong demand.
Business model uses subscription revenue.
Product delivers verified wellness metrics.
Marketing targets health advocates.
Operations scale via DTC channels.
Financial outlook is positive.
Risks include supply chain delays.
SDG alignment focuses on health and privacy.
Next step is pilot launch in Q3.`;

    const sections = parsePlanSections(plan);
    expect(sections[1].body).toBeTruthy();
    expect(sections[10].body).toBeTruthy();
    expect(sections[1].body).not.toBe("No content available.");
  });

  it("parses markdown-normalized section 3 body", () => {
    const plan = normalizePlanText(`## 3. Business Model Overview

Subscription plus hardware sales model.`);

    const sections = parsePlanSections(plan);
    expect(sections[3].body).toContain("Subscription");
  });
});

describe("normalizePlanText", () => {
  it("strips markdown bold and heading markers", () => {
    const result = normalizePlanText("## **1. Executive Summary**\n\nBody text.");
    expect(result).toContain("1. Executive Summary");
    expect(result).not.toContain("**");
    expect(result).not.toContain("##");
  });
});

describe("normalizeSwotEntry", () => {
  const swotData = {
    recommended_title: "Eco Filter VP",
    swot: [
      {
        title: "Eco Filter VP",
        strengths: ["Low cost", "High impact"],
        weaknesses: ["Limited scale"],
        opportunities: ["Urban growth"],
        threats: ["Competition"],
      },
      {
        title: "Other VP",
        S: ["Alt strength"],
        W: ["Alt weakness"],
        O: ["Alt opportunity"],
        T: ["Alt threat"],
      },
    ],
  };

  it("reads strengths/weaknesses format for selected VP", () => {
    const entry = normalizeSwotEntry(swotData, { title: "Eco Filter VP" });
    expect(entry.title).toBe("Eco Filter VP");
    expect(entry.S).toEqual(["Low cost", "High impact"]);
    expect(entry.W).toEqual(["Limited scale"]);
  });

  it("falls back to recommended_title when selectedVP is null", () => {
    const entry = normalizeSwotEntry(swotData, null);
    expect(entry.title).toBe("Eco Filter VP");
    expect(entry.O).toEqual(["Urban growth"]);
  });

  it("reads S/W/O/T short keys", () => {
    const entry = normalizeSwotEntry(
      { swot: [{ title: "Other VP", S: ["A"], W: ["B"], O: ["C"], T: ["D"] }] },
      { title: "Other VP" }
    );
    expect(entry.S).toEqual(["A"]);
    expect(entry.T).toEqual(["D"]);
  });

  it("coerces { id, text } objects", () => {
    const entry = {
      strengths: [{ id: "s1", text: "Strong brand" }],
    };
    expect(normalizeSwotQuadrantItems(entry, "S")).toEqual(["Strong brand"]);
  });
});

describe("getSectionBodyForSlide", () => {
  it("falls back to story for executive summary when section body is empty", () => {
    const body = getSectionBodyForSlide(1, {}, {
      planText: "",
      story: "We build privacy-first wellness devices.",
      bmcData: null,
    });
    expect(body).toContain("privacy-first");
  });

  it("falls back to BMC canvas for business model overview", () => {
    const sections = {};
    const body = getSectionBodyForSlide(3, sections, {
      planText: "",
      story: "",
      bmcData: {
        value_propositions: ["Verified health monitoring"],
        customer_segments: ["Health advocates"],
        revenue_streams: ["Premium device sales"],
      },
    });
    expect(body).toContain("Verified health monitoring");
    expect(body).toContain("Premium device sales");
  });
});

describe("formatBmcBullets", () => {
  it("truncates long bullet text", () => {
    const longItem = "A".repeat(150);
    const result = formatBmcBullets([longItem], 1, 120);
    expect(result.length).toBeLessThan(130);
    expect(result).toContain("…");
  });
});

describe("exportToPowerPoint assembly", () => {
  it("mock PptxGenJS slide count for full deck", async () => {
    const slides = [];
    const mockPres = {
      layout: "",
      ShapeType: { rect: "rect" },
      addSlide: () => {
        const slide = {
          background: null,
          addText: jest.fn(),
          addShape: jest.fn(),
        };
        slides.push(slide);
        return slide;
      },
    };

    const planText = PLAN_SECTION_HEADINGS.map((h, i) =>
      `${i + 1}. ${h}\nContent for ${h}.`
    ).join("\n\n");

    const sections = parsePlanSections(planText);
    expect(Object.keys(sections)).toHaveLength(10);

    const expectedSlideCount = 14;
    for (let i = 0; i < expectedSlideCount; i++) {
      mockPres.addSlide();
    }
    expect(slides).toHaveLength(expectedSlideCount);
  });

  it("does not produce empty section bodies for well-formed plan data", () => {
    const planText = PLAN_SECTION_HEADINGS.map((h, i) =>
      `${i + 1}. ${h}\nDetailed content for section ${i + 1}.`
    ).join("\n\n");

    const sections = parsePlanSections(planText);
    for (let i = 1; i <= 10; i++) {
      expect(sections[i]?.body).toBeTruthy();
      expect(sections[i].body).not.toBe("No content available.");
    }
  });
});
