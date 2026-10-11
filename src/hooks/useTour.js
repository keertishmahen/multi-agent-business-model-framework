import { useState, useCallback, useMemo } from "react";

/**
 * Guided tour steps: onboarding + dashboard + DTM deep-dive + 9 workflow steps.
 */
export const TOUR_STEPS = [
  {
    id: 1,
    title: "Welcome & Onboarding",
    description:
      "The onboarding page introduces Business Model Studio: who we are, the platform, process, values, and why it matters. Use Start creating to begin co-creating, or take this tour first.",
    exampleData: {
      bullets: [
        "Brand hero with a clear outcome in ~30 minutes",
        "Sections: Who, Platform, Process, Values, Why",
        "Key terms glossary for SWOT, SDG, BMC, DTM, and more",
        "Start creating begins guided input; Tour explains the method",
      ],
    },
    targetStep: null,
  },
  {
    id: 2,
    title: "Your Dashboard",
    description:
      "After you share your story, the MIA dashboard is your workspace: step navigation, agent activity, the main canvas for each output, and a feedback dock to refine results.",
    exampleData: {
      bullets: [
        "Step nav — jump between completed workflow stages",
        "Agents panel — see specialists running critique, SDG, and more",
        "Main canvas — review and edit the current step’s output",
        "Feedback dock — refine generation without starting over",
      ],
    },
    targetStep: null,
  },
  {
    id: 3,
    title: "Dilemma Triangle Method",
    description:
      "The Dilemma Triangle Method (DTM) is a People–Planet–Prosperity framework for surfacing strategic trade-offs in SDG-aligned planning — so growth, equity, and environment stay visible together.",
    exampleData: {
      bullets: [
        "People — equity, access, and community outcomes",
        "Planet — climate, resources, and environmental impact",
        "Prosperity — viability, jobs, and sustainable growth",
        "DTM makes conflicts explicit instead of burying them in slides",
      ],
    },
    targetStep: null,
  },
  {
    id: 4,
    title: "The Triangle",
    description:
      "Each corner of the triangle is a driver. Tensions appear on the edges — for example faster growth (Prosperity) versus lower emissions (Planet). Business Model Studio helps you name and rank those dilemmas.",
    exampleData: {
      dtmTriangle: true,
    },
    targetStep: null,
  },
  {
    id: 5,
    title: "DTM step by step",
    description:
      "In Business Model Studio, DTM runs through the workflow as a clear sequence — from your story to a model you can act on.",
    exampleData: {
      steps: [
        "Tell your story and who you serve",
        "Extract People · Planet · Prosperity focus areas",
        "Surface issues and the tension matrix",
        "Rank dilemmas 1–N with rationale; drag to reorder",
        "Choose value propositions and build SWOT → BMC → plan",
      ],
    },
    targetStep: null,
  },
  {
    id: 6,
    title: "Tell Your Story",
    description:
      "Start by describing your business idea. You can type or use voice input to share your goals, with your target users/prospective users, and the problems you're solving.",
    exampleData: {
      story:
        "I want to create a community-owned solar energy cooperative that provides affordable clean energy to low-income neighborhoods while creating local green jobs.",
    },
    targetStep: "story",
  },
  {
    id: 7,
    title: "Driver & Focus",
    description:
      "The AI analyzes your story through the People–Planet–Prosperity lens (DTM) and extracts three focus areas that drive your plan.",
    exampleData: {
      drivers: [
        { driver: "People", focus: "Empower low-income communities with affordable energy access" },
        { driver: "Planet", focus: "Reduce carbon emissions through local solar generation" },
        { driver: "Prosperity", focus: "Create sustainable green jobs and community wealth" },
      ],
    },
    targetStep: "focus",
  },
  {
    id: 8,
    title: "Issues Generation",
    description:
      "For each focus area, the AI identifies 3–4 concrete issues or risks that your plan needs to address.",
    exampleData: {
      issues: [
        "High upfront capital costs for solar installations",
        "Regulatory barriers in energy markets",
        "Skill gaps in the local workforce for green jobs",
      ],
    },
    targetStep: "issues",
  },
  {
    id: 9,
    title: "Tension Matrix",
    description:
      "See where your goals pull in different directions across the Dilemma Triangle. The tension matrix highlights conflicts between focus areas so you can plan accordingly.",
    exampleData: {
      tensions: [
        { pair: "Affordability vs. Quality installations", severity: "Medium" },
        { pair: "Fast growth vs. Community ownership", severity: "High" },
      ],
    },
    targetStep: "tensions",
  },
  {
    id: 10,
    title: "Dilemmas & Ranking",
    description:
      "Trade-offs ranked 1–N with a written explanation for each priority. Drag to reorder, then approve — severity, reversibility, and reach show the evidence behind each rank.",
    exampleData: {
      dilemmas: [
        { title: "Speed vs. Inclusivity", rank: 1 },
        { title: "Cost vs. Sustainability", rank: 2 },
      ],
    },
    targetStep: "dilemmas",
  },
  {
    id: 11,
    title: "Value Propositions",
    description:
      "Proposed solutions that address your dilemmas while balancing People, Planet, and Prosperity drivers.",
    exampleData: {
      values: [
        "Community-financed micro-solar grids with tiered pricing",
        "Green apprenticeship program partnered with local colleges",
      ],
    },
    targetStep: "values",
  },
  {
    id: 12,
    title: "SWOT Analysis",
    description:
      "A strengths, weaknesses, opportunities, and threats analysis for each value proposition. Select the one you want to build your model around.",
    exampleData: {
      swot: {
        strengths: ["Strong community trust", "Growing demand for clean energy"],
        weaknesses: ["Limited initial capital", "Complex regulatory landscape"],
        opportunities: ["Government green subsidies", "Corporate ESG partnerships"],
        threats: ["Utility company competition", "Policy changes"],
      },
    },
    targetStep: "swot",
  },
  {
    id: 13,
    title: "Business Model Canvas",
    description:
      "Your full expanded business model in 11 blocks — including social and environmental impact — generated from your selected value proposition. Edit each block inline on the dashboard.",
    exampleData: {
      bmcCanvas: true,
    },
    targetStep: "bmc",
  },
  {
    id: 14,
    title: "RAG Evidence",
    description:
      "Before the plan is written, retrieval-augmented generation (RAG) gathers your canvas blocks, earlier steps and the SDG and framework knowledge base. Review what was found, untick anything you don't want, and the MIA agents write the plan from exactly this evidence.",
    exampleData: {
      bullets: [
        "11/11 BMC blocks matched exactly by block",
        "Earlier steps: Story, Focus, Values, SWOT…",
        "Knowledge base: SDG 12 targets · 78% match",
        "Each item shows which MIA agents receive it",
      ],
    },
    targetStep: "rag",
  },
  {
    id: 15,
    title: "Business Plan",
    description:
      "A complete, exportable business plan synthesizing everything above into a structured 10-section document. Export to Word or PDF.",
    exampleData: {
      sections: [
        "Executive Summary",
        "Problem Statement",
        "Solution Overview",
        "Market Analysis",
        "Business Model",
        "Operations Plan",
        "Financial Projections",
        "Impact Assessment",
        "Risk Mitigation",
        "Implementation Timeline",
      ],
    },
    targetStep: "plan",
  },
];

const TOTAL_STEPS = TOUR_STEPS.length;

/**
 * useTour — manages guided tour state.
 */
export function useTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const next = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }, []);

  const back = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const exit = useCallback(() => {
    setIsActive(false);
    setCurrentStep(1);
  }, []);

  const start = useCallback(() => {
    setIsActive(true);
    setCurrentStep(1);
  }, []);

  const stepData = useMemo(() => TOUR_STEPS[currentStep - 1], [currentStep]);

  return {
    isActive,
    currentStep,
    totalSteps: TOTAL_STEPS,
    stepData,
    next,
    back,
    exit,
    start,
  };
}

export default useTour;
