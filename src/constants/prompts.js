// ──────────────────────────────────────────────────────────────────
//  PROMPTS  — one function per workflow step
//  Each function receives whatever context it needs and returns a
//  ready-to-send string for the Gemini API.
// ──────────────────────────────────────────────────────────────────

export const PROMPTS = {

  focus: (story) => `You are an expert in sustainable business strategy and the Dilemma Triangle methodology (People, Planet, Prosperity).

Given the user's story below, do two things:

1. Extract key inferences about their context.
2. Apply the Dilemma Triangle to produce one focused area per driver.

Return ONLY valid JSON — no markdown fences, no commentary, nothing else:
{
  "inferences": {
    "sector": "one short phrase describing the industry/sector",
    "audience": "who they serve — customers, users, beneficiaries",
    "sdg_focus": "primary SDG or theme e.g. SDG 7 · Affordable & clean energy",
    "stage": "stage of business e.g. Idea, MVP, Scaling, Operational",
    "hidden_stakeholder": "a stakeholder the user did NOT mention but who is affected"
  },
  "focuses": [
    {
      "driver": "People",
      "focus": "one specific focus area",
      "rationale": "2–3 sentences: why this focus, which SDGs it addresses, why it doesn't exclude other SDGs",
      "sdgs": ["SDG 3", "SDG 10"]
    },
    {
      "driver": "Planet",
      "focus": "one specific focus area",
      "rationale": "2–3 sentences",
      "sdgs": ["SDG 7", "SDG 13"]
    },
    {
      "driver": "Prosperity",
      "focus": "one specific focus area",
      "rationale": "2–3 sentences",
      "sdgs": ["SDG 8", "SDG 9"]
    }
  ]
}

User story:
${story}`,

  issues: (ctx) => `You are a strategic analyst. Given the focus areas and drivers below, identify 3–4 concrete issues or risks for EACH focus area that stem from it.

Return ONLY valid JSON — no markdown fences:
{
  "issues_by_focus": [
    {
      "focus": "...",
      "driver": "People|Planet|Prosperity",
      "issues": [
        { "issue": "short issue title", "explain": "2 sentences explaining the issue and its implications" }
      ]
    }
  ]
}

Context:
${ctx}`,

  tensions: (ctx) => `You are an expert in strategic tensions and trade-offs. Given the issues identified across the three focus areas, generate a tension matrix with 4–6 key conflicts between issues from DIFFERENT drivers.

Return ONLY valid JSON — no markdown fences:
{
  "tensions": [
    {
      "issue_a": "issue title from one driver",
      "issue_b": "issue title from another driver",
      "driver_a": "People|Planet|Prosperity",
      "driver_b": "People|Planet|Prosperity",
      "tension": "one sentence describing the trade-off",
      "why": "2 sentences explaining the root cause and stakes",
      "evidence_level": "High|Medium|Low",
      "inference_level": "High|Medium|Low"
    }
  ]
}

Context:
${ctx}`,

  dilemmas: (ctx) => `You are an expert in ethical business dilemmas. From the tension matrix, generate exactly 4 dilemmas phrased as trade-offs.

Rank all 4 dilemmas from 1 (tackle first) to 4 (tackle last). Use unique rank integers. For each dilemma, explain why you assigned that rank in plain language.

Each dilemma must have:
- A concise title (format: "X vs. Y")
- A plain-language description (1–2 sentences)
- rank: integer 1–4 (1 = highest priority, 4 = lowest; each rank used exactly once)
- ranking_rationale: 2–3 sentences explaining why this dilemma deserves this rank relative to the others
- Affected drivers (People, Planet, Prosperity)
- severity: integer 1–4 (4 = catastrophic if not addressed)
- reversibility: integer 1–4 (4 = very hard to reverse once decided)
- reach: integer 1–4 (4 = affects every stakeholder)
- sdgs: array of SDG labels using format "SDG {n}" (e.g. "SDG 10", "SDG 16")

Return ONLY valid JSON — no markdown fences:
{
  "dilemmas": [
    {
      "title": "Speed vs. Quality",
      "description": "Expanding too fast risks quality and trust; going slow loses market opportunity.",
      "rank": 1,
      "ranking_rationale": "This trade-off has the widest stakeholder impact and is hardest to reverse once growth commitments are made, so it should be resolved before the others.",
      "drivers": ["People", "Prosperity"],
      "severity": 4,
      "reversibility": 3,
      "reach": 3,
      "sdgs": ["SDG 8", "SDG 11"]
    }
  ]
}

Context:
${ctx}`,

  values: (ctx) => `You are a business strategist specialising in sustainable value creation. Derive 2–3 concrete value propositions from the TOP-RANKED dilemmas in the context (use rank order — rank 1 is highest priority). Each proposition should be a strategic response to one or more of those dilemmas while balancing all three drivers (People · Planet · Prosperity).

Return ONLY valid JSON — no markdown fences:
{
  "generation_note": "1–2 sentences summarising how these propositions respond to the ranked dilemmas",
  "value_propositions": [
    {
      "title": "concise name for this value proposition",
      "explain": "2–3 sentences describing what it is and how it works",
      "dilemmas": ["exact dilemma titles from context that this proposition addresses"],
      "benefits": ["benefit 1", "benefit 2", "benefit 3"],
      "drivers": ["People", "Planet", "Prosperity"]
    }
  ]
}

Each value proposition's "dilemmas" array MUST list exact dilemma titles from the dilemmas output (not paraphrases).

Context:
${ctx}`,

  swot: (ctx) => `You are a strategic consultant. Perform a detailed SWOT analysis for EACH value proposition in the context. Compare all alternatives side by side, then recommend the strongest path forward.

Return ONLY valid JSON — no markdown fences:
{
  "swot": [
    {
      "title": "value proposition title (copy exactly)",
      "S": ["strength 1", "strength 2", "strength 3"],
      "W": ["weakness 1", "weakness 2", "weakness 3"],
      "O": ["opportunity 1", "opportunity 2", "opportunity 3"],
      "T": ["threat 1", "threat 2", "threat 3"]
    }
  ],
  "recommended_title": "exact value proposition title you recommend (must match one swot entry title exactly)",
  "recommendation_rationale": "2–4 sentences comparing the alternatives and explaining why you picked this one"
}

Generate SWOT for EVERY value proposition. recommended_title must be one of the swot entry titles.

Context:
${ctx}`,

  bmc: (ctx, selectedSwot) => `You are a business model expert. Generate a complete Expanded Business Model Canvas (all 11 blocks) for the SELECTED value proposition only.

Return ONLY valid JSON — no markdown fences. Include all 11 exact keys:
{
  "bmc": [
    {
      "value_proposition": "exact title from selected VP",
      "canvas": {
        "key_partners":          ["partner 1", "partner 2", "partner 3"],
        "key_activities":        ["activity 1", "activity 2", "activity 3"],
        "key_resources":         ["resource 1", "resource 2", "resource 3"],
        "value_propositions":    ["vp statement 1", "vp statement 2"],
        "customer_relationships":["relationship type 1", "relationship type 2"],
        "channels":              ["channel 1", "channel 2", "channel 3"],
        "customer_segments":     ["segment 1", "segment 2"],
        "revenue_streams":       ["stream 1", "stream 2"],
        "cost_structure":        ["cost 1", "cost 2", "cost 3"],
        "social_environmental_cost":    ["negative social or environmental impact 1", "negative impact 2"],
        "social_environmental_benefit": ["positive SDG-aligned outcome 1", "positive outcome 2"]
      }
    }
  ]
}

For social_environmental_cost: list negative externalities of the business model (e.g. emissions, waste, resource depletion, community displacement, health risks, inequality). REQUIRED — include at least 2 specific items.
For social_environmental_benefit: list positive contributions to society and the environment (e.g. jobs created, water access, carbon reduction, education, health improvements). REQUIRED — include at least 2 specific items. Reference relevant SDGs where appropriate.
Responses omitting social_environmental_cost or social_environmental_benefit are INVALID.
Draw from the dilemmas, value propositions, SDG alignments, and selected SWOT in the context below.

Selected value proposition SWOT:
${JSON.stringify(selectedSwot, null, 2)}

Full context:
${ctx}`,

  plan: (ctx, selectedVP) => `You are an expert business strategist and report writer.

Using ALL information provided, write a comprehensive Business Plan for "${selectedVP?.title || 'the selected value proposition'}".

Structure it with these exact numbered sections:

1. Executive Summary
2. Market Opportunity
3. Business Model Overview (reference the BMC)
4. Product or Service Description
5. Customer & Marketing Strategy
6. Operations Plan
7. Financial & Sustainability Outlook
8. Key Risks & Mitigation Strategies
9. SDG Alignment & Impact
10. Conclusion & Next Steps

Guidelines:
- Be concise yet insightful (aim for ~800–1200 words total)
- Use bullet points where they aid clarity
- Connect each section back to the story and evidence gathered
- Highlight SDG alignment concretely
- Mention specific tensions/dilemmas addressed by the model
- Write in a professional but accessible tone (non-technical readers)

Return PLAIN TEXT ONLY — no JSON, no markdown fences, no backticks.

Full context:
${ctx}`,

  sdgMapping: (ctx) => `You are an SDG alignment specialist. Map this business to ALL 17 UN Sustainable Development Goals with evidence-based, anti-greenwashing rigour.

For each SDG (1–17), assign exactly one status:
- "strong" — concrete, verifiable link in the business plan or model
- "inferred" — plausible connection that needs user review before claiming
- "undecided" — this business idea is NOT a direct contributor to this goal

For every SDG with status "undecided", you MUST provide nonAlignmentReason: 1–2 sentences explaining why this business is not directly related, and clarify that this does NOT mean the business harms or eliminates that goal — only that it is not a direct contributor.

For every SDG, set localRelevance to exactly one of: Global, Africa, Europe, Asia, Americas, Australia, Custom — based on where this alignment (or non-alignment) is most geographically relevant to the business context.

Return ONLY valid JSON — no markdown fences:
{
  "sdg_alignments": [
    {
      "sdgNumber": 1,
      "name": "No Poverty",
      "status": "undecided",
      "evidenceSource": "optional — required for strong or inferred",
      "localRelevance": "Global",
      "nonAlignmentReason": "required for undecided — why not directly related, and that non-alignment does not imply harm"
    }
  ]
}

You MUST return exactly 17 entries, one per SDG (sdgNumber 1 through 17).

Context:
${ctx}`,

  refine: (originalOutput, feedback, stepName, ctx) => {
    const isBmc = /business model canvas/i.test(stepName || "");
    const bmcNote = isBmc
      ? `\nIMPORTANT: The canvas must retain all 11 blocks, including social_environmental_cost and social_environmental_benefit with at least 2 specific items each. Do not remove or omit these keys.\n`
      : "";

    return `You are refining the output from the "${stepName}" step of a business plan generator.

Keep EXACTLY the same JSON structure and schema. Only change the content based on the feedback.
${bmcNote}
Feedback from user:
${feedback}

Original output to refine:
${JSON.stringify(originalOutput, null, 2)}

Full context for reference:
${ctx}

Return ONLY the refined JSON — same schema, no markdown fences, no commentary.`;
  },

  refinePlan: (originalPlan, feedback) =>
    `You are refining a Business Plan based on user feedback.

Keep the same 10-section structure. Only change the content based on the feedback.

Feedback:
${feedback}

Original plan:
${originalPlan}

Return PLAIN TEXT ONLY — same structure, no JSON, no markdown fences.`,

  dynamicFollowUp: (userAnswer, phase, conversationHistory) =>
    `You are a business coach helping someone describe their business idea. Your ONLY job is to ask ONE short follow-up question.

Phase: "${phase}"

Conversation so far:
${conversationHistory}

User's latest answer: "${userAnswer}"

Instructions:
- Ask exactly ONE follow-up question (1-2 sentences max)
- The question must dig deeper into something specific the user mentioned
- Reference their words naturally (e.g., "You mentioned smart water filters — who is your ideal customer for those?")
- Do NOT start with praise, commentary, or preamble like "That's great!" or "Interesting!"
- Do NOT say "To clarify..." or "To understand better..."
- Just ask the question directly
- Make it specific to their business, not generic

Output ONLY the question. Nothing else.`,

  storySummary: (responses) =>
    `You are summarizing what a user has shared about their business idea so they can confirm it before moving forward.

Here is what the user told us:

Business Basics:
${responses.basics}

Problem and Solution:
${responses.problem}

Target Customers:
${responses.customers}

Create a clear, structured summary organized into these three categories:

1. Business Basics — Summarize what the business is, what stage it's at, and any key context.
2. Problem and Solution — Summarize the problem they aim to solve and how they plan to address it.
3. Target Customers — Summarize who they serve and any details about their audience.

Guidelines:
- Write in plain, friendly language as if speaking directly to the user
- Use their own words and phrases where possible
- Keep each section to 2–3 sentences
- Do NOT add information they did not provide
- Do NOT reference any technical terms, data structures, or internal system details

Return the summary as plain text with the three labeled sections. No bullet points needed — short paragraphs are fine.`,

  feedbackAcknowledgment: (originalOutput, refinedOutput, userFeedback) =>
    `You are helping a user understand what changed after they requested a refinement to their business plan content.

The user provided this feedback:
"${userFeedback}"

Here is the original content before refinement:
${originalOutput}

Here is the updated content after refinement:
${refinedOutput}

Your task:
Compare the original and updated content, then write a brief, plain-language summary of what changed. This message will be shown to the user as an acknowledgment that their feedback was applied.

Guidelines:
- Write 1–2 sentences maximum
- Be specific about what changed (e.g., "Updated the focus areas to emphasize sustainability based on your feedback" or "Added more detail about your target audience as requested")
- Use a warm, confirming tone
- Reference their feedback where appropriate
- Do NOT mention any technical details, data formats, or internal system workings

Return ONLY the acknowledgment message — no labels, no preamble.`,
};
