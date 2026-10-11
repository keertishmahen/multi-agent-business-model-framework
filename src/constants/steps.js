export const STEPS = [
  {
    id: "story",
    label: "Story Input",
    subtitle: "What's your idea? Tell us in your own words.",
    icon: "✦",
    description: "Describe your business idea, initiative, or project. The more context you share — your goals, who you serve, the problems you're solving — the better your plan will be.",
    glimpse: {
      outcome: "Your business idea captured in your own words as the foundation for everything that follows.",
      inputs: "Your guided answers or free-form narrative",
      outputs: "A confirmed story that anchors all AI generation",
    },
  },
  {
    id: "focus",
    label: "Driver & Focus",
    subtitle: "Who & why — the people you serve and your goal",
    icon: "◈",
    description: "The agent applies the Dilemma Triangle (People · Planet · Prosperity) to extract three focus areas from your story.",
    glimpse: {
      outcome: "Three focus areas aligned to People, Planet, and Prosperity.",
      inputs: "Your business story",
      outputs: "Driver-focused areas that guide issues and dilemmas",
    },
  },
  {
    id: "issues",
    label: "Issues Generation",
    subtitle: "The main risks and challenges to plan for",
    icon: "⬡",
    description: "For each focus area, the agent identifies 3–4 concrete issues or risks that need to be addressed in your plan.",
    glimpse: {
      outcome: "Concrete risks and challenges mapped to each focus driver.",
      inputs: "Focus areas from the previous step",
      outputs: "Issue lists that feed the tension matrix",
    },
  },
  {
    id: "tensions",
    label: "Tension Matrix",
    subtitle: "Where your goals pull in different directions",
    icon: "⟳",
    tooltipDef: "A view of where two of your goals push against each other — e.g. faster growth vs. lower carbon.",
    description: "The tension matrix shows where issues from different focus areas conflict with each other. Click any row to see the full explanation.",
    glimpse: {
      outcome: "A matrix showing where your goals conflict with each other.",
      inputs: "Issues from all three focus drivers",
      outputs: "Named tensions that become ranked dilemmas",
    },
  },
  {
    id: "dilemmas",
    label: "Dilemmas & Ranking",
    subtitle: "Which trade-offs to tackle first",
    icon: "⊛",
    tooltipDef: "Ranked trade-offs. Each score reflects severity, reversibility, and reach. Hover to inspect.",
    description: "Dilemmas are ranked by importance (severity × reversibility × reach). Hover or tap any score to see its breakdown.",
    glimpse: {
      outcome: "Prioritised trade-offs scored by severity, reversibility, and reach.",
      inputs: "Tension matrix conflicts",
      outputs: "Ranked dilemmas that shape value propositions",
    },
  },
  {
    id: "values",
    label: "Value Propositions",
    subtitle: "How you'll create value for People · Planet · Prosperity",
    icon: "◉",
    description: "Strategic responses to your ranked dilemmas — 2–3 value propositions that balance People, Planet, and Prosperity.",
    glimpse: {
      outcome: "2–3 strategic value propositions balancing People, Planet, and Prosperity.",
      inputs: "Ranked dilemmas and focus areas",
      outputs: "Value propositions ready for SWOT comparison",
    },
  },
  {
    id: "swot",
    label: "SWOT Analysis",
    subtitle: "Strengths, weaknesses, opportunities, threats",
    icon: "⊞",
    description: "Compare SWOT for every value proposition side by side, review the AI recommendation, then choose your path forward.",
    glimpse: {
      outcome: "Side-by-side SWOT grids with an AI recommendation for your best path.",
      inputs: "Value propositions from the previous step",
      outputs: "Selected value proposition with a full SWOT profile",
    },
  },
  {
    id: "bmc",
    label: "Business Model Canvas",
    subtitle: "Your business model across five pillars",
    icon: "▦",
    description: "The eleven building blocks of your expanded business model, including social and environmental impact, generated for your selected value proposition.",
    glimpse: {
      outcome: "An expanded 11-block canvas including social and environmental impact.",
      inputs: "Selected SWOT and value proposition",
      outputs: "BMC that grounds the business plan and SDG mapping",
    },
  },
  {
    id: "rag",
    label: "RAG Evidence",
    subtitle: "What your business plan will be grounded on",
    icon: "⧉",
    description: "Retrieval-augmented generation (RAG) gathers your canvas blocks, earlier workflow steps and the SDG / framework knowledge base into one evidence set. Review it, keep what matters, and the MIA agents write the plan from exactly this.",
    glimpse: {
      outcome: "A reviewed evidence set that grounds every section of the business plan.",
      inputs: "BMC blocks, earlier steps, and the knowledge base",
      outputs: "Curated context passed to the MIA agents for the plan",
    },
  },
  {
    id: "plan",
    label: "Business Plan",
    subtitle: "Your complete, exportable business plan",
    icon: "▣",
    description: "A full 10-section business plan synthesising everything above. Export to Word or PDF.",
    glimpse: {
      outcome: "A 10-section business plan grounded in your BMC and prior steps.",
      inputs: "BMC, SWOT, dilemmas, and full workflow context",
      outputs: "Export-ready plan for Word, PowerPoint, or Notion",
    },
  },
];

export const SDG_COLORS = {
  "SDG 1":  "#E5243B",
  "SDG 2":  "#DDA63A",
  "SDG 3":  "#4C9F38",
  "SDG 4":  "#C5192D",
  "SDG 5":  "#FF3A21",
  "SDG 6":  "#26BDE2",
  "SDG 7":  "#FCC30B",
  "SDG 8":  "#A21942",
  "SDG 9":  "#FD6925",
  "SDG 10": "#DD1367",
  "SDG 11": "#FD9D24",
  "SDG 12": "#BF8B2E",
  "SDG 13": "#3F7E44",
  "SDG 14": "#0A97D9",
  "SDG 15": "#56C02B",
  "SDG 16": "#00689D",
  "SDG 17": "#19486A",
};

export const DRIVER_STYLES = {
  People: {
    color: "#185FA5",
    light: "#E6F1FB",
    border: "#B5D4F4",
  },
  Planet: {
    // Warmer leaf green — kept distinct from the emerald brand chrome
    color: "#357A26",
    light: "#E6F4DF",
    border: "#B9E3A4",
  },
  Prosperity: {
    color: "#854F0B",
    light: "#FAEEDA",
    border: "#FAC775",
  },
};
