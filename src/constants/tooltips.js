/**
 * Tooltip Content Registry
 *
 * Central registry of all tooltip explanations used across the application.
 * Covers onboarding capabilities, workflow step titles, and key terms/glossary entries.
 */

export const TOOLTIP_CONTENT = {
  // ──────────────────────────────────────────────────────────────────
  //  Onboarding capability tooltips ("What I can do" section)
  // ──────────────────────────────────────────────────────────────────
  "guide-9-steps":
    "The co-pilot walks you through 10 structured steps — from describing your idea to producing a complete, exportable business plan. Each step builds on the last so nothing gets missed.",
  "generate-sdg":
    "Content is aligned with the UN Sustainable Development Goals (SDGs). The system maps your idea to the relevant global goals so your plan reflects real-world impact.",
  "identify-tensions":
    "The system finds where your goals might conflict — for example, faster growth vs. lower carbon footprint — and helps you prioritise which trade-offs to resolve first.",

  // ──────────────────────────────────────────────────────────────────
  //  Workflow step tooltips (all 10 steps)
  // ──────────────────────────────────────────────────────────────────
  "step-story":
    "Describe your business idea in your own words. The more context you share — your goals, who you serve, the problems you're solving — the better your plan will be.",
  "step-focus":
    "The Dilemma Triangle (People · Planet · Prosperity) is applied to your story to extract three focus areas that ground your entire plan.",
  "step-issues":
    "For each focus area, the system identifies 3–4 concrete issues or risks that your plan should address.",
  "step-tensions":
    "A view of where two of your goals push against each other — e.g. faster growth vs. lower carbon. The matrix highlights conflicts between focus areas.",
  "step-dilemmas":
    "Trade-offs ranked 1–N (1 = tackle first). Each card explains why it was prioritised. Drag to reorder if you disagree — severity, reversibility, and reach show supporting evidence.",
  "step-values":
    "Your ranked dilemmas are trade-offs to resolve. Value propositions are strategic responses — each one shows which dilemmas it addresses while balancing People, Planet, and Prosperity.",
  "step-swot":
    "All value propositions compared side by side with Strengths, Weaknesses, Opportunities, and Threats. Review the AI recommendation, then select the path you want to build on.",
  "step-bmc":
    "Expanded Business Model Canvas — an 11-block template covering the standard canvas plus Social and Environmental Cost and Benefit blocks for SDG-aligned impact analysis.",
  "step-rag":
    "Retrieval-augmented grounding — see exactly which Business Model Canvas blocks, earlier steps and knowledge-base sources the MIA agents will use to write your plan, and exclude anything you don't want.",
  "step-plan":
    "A full 10-section business plan synthesising everything above. You can export it to Word or PDF when you're ready.",

  // ──────────────────────────────────────────────────────────────────
  //  Key term / glossary tooltips
  // ──────────────────────────────────────────────────────────────────
  "sdg":
    "Sustainable Development Goals — 17 global goals adopted by the United Nations for 2030, covering poverty, inequality, climate, and more.",
  "sdg-mapper":
    "A transparency and anti-greenwashing check. Maps your business to all 17 UN SDGs so you can see evidence, inferred links, and gaps — not a score of how many goals you solve.",
  "sdg-status-strong":
    "Concrete, verifiable link to this SDG in your business plan or model — safe to claim with evidence.",
  "sdg-status-inferred":
    "A plausible connection that needs your review before you claim it publicly — verify before citing.",
  "sdg-status-undecided":
    "This business idea is not a direct contributor to this SDG. You confirm or override. Non-alignment does not mean your business harms this goal.",
  "sdg-local-relevance":
    "Filters the SDG grid by geographic relevance — e.g. Australia, Global, or other regions tagged during SDG mapping. Unlocks after your Business Model Canvas is generated.",
  "value-proposition":
    "The unique benefit your product or service provides to a specific customer segment — the reason people choose you over alternatives.",
  "tension-matrix":
    "A grid showing where your goals conflict — e.g. faster growth vs. lower emissions. It maps issues from different focus areas against each other.",
  "dilemma-score":
    "Severity, reversibility, and reach (each 1–4) are supporting metrics. The main priority is the rank 1–N and the written rationale explaining why each dilemma was placed there.",
  "bmc":
    "Expanded Business Model Canvas — an 11-block template describing how a business creates, delivers, and captures value, including social and environmental costs and benefits.",
  "swot":
    "Strengths, Weaknesses, Opportunities, and Threats — a framework for evaluating your strategic position.",
  "dilemma-triangle":
    "A framework that views every business decision through three lenses: People (social impact), Planet (environmental impact), and Prosperity (economic viability).",
  "key-partners":
    "The network of suppliers and partners that make the business model work — who you need to collaborate with.",
  "key-activities":
    "The most important actions your company must take to operate successfully and deliver your value proposition.",
  "key-resources":
    "The assets required to offer and deliver your value proposition — physical, intellectual, human, or financial.",
  "customer-relationships":
    "The types of relationships you establish with specific customer segments — e.g. personal assistance, self-service, or community.",
  "channels":
    "How you communicate with and reach your customer segments to deliver your value proposition.",
  "customer-segments":
    "The different groups of people or organisations your business aims to reach and serve.",
  "revenue-streams":
    "The cash your business generates from each customer segment — the income side of the model.",
  "cost-structure":
    "All costs incurred to operate the business model — fixed costs, variable costs, economies of scale.",
  "social-environmental-cost":
    "The negative social and environmental impacts of the business model — externalities such as emissions, waste, resource depletion, or community harm.",
  "social-environmental-benefit":
    "The positive social and environmental contributions of the business model — outcomes such as jobs created, clean water access, carbon reduction, or health improvements.",
};

export default TOOLTIP_CONTENT;
