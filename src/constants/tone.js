// ──────────────────────────────────────────────────────────────────
//  Output tone / register
//
//  Capstone feedback: "every business model ... sounded very posh and
//  uptight. There needs to be a way to keep the professionalism but not
//  make everything sound super technical."
//
//  The directive is appended to every generation prompt (see
//  applyTone below), so one control steers all ten steps.
// ──────────────────────────────────────────────────────────────────

export const TONES = [
  {
    id: "plain",
    label: "Plain",
    hint: "Everyday language, short sentences",
    directive:
      "TONE: Write in plain, everyday English, as if explaining to a capable colleague " +
      "who does not work in sustainability or strategy. Prefer short sentences and common " +
      "words over jargon. If you must use a technical term (e.g. SDG, value proposition), " +
      "explain it in a few words the first time. Do not use flowery or self-important " +
      "phrasing. Stay professional and specific — plain does not mean vague or casual.",
  },
  {
    id: "balanced",
    label: "Balanced",
    hint: "Professional, minimal jargon",
    directive:
      "TONE: Write in clear professional English. Use business terminology where it is " +
      "genuinely the clearest option, but avoid consultant jargon, inflated adjectives and " +
      "abstract phrasing. Favour concrete nouns and active verbs.",
  },
  {
    id: "formal",
    label: "Formal",
    hint: "Full business register, for investors",
    directive:
      "TONE: Write in a formal business register suitable for investors, grant committees " +
      "and academic reviewers. Precise terminology is expected. Remain concrete and " +
      "evidence-led rather than rhetorical.",
  },
];

export const DEFAULT_TONE = "balanced";

/** Look up a tone by id, falling back to the default. */
export function getTone(toneId) {
  return TONES.find((t) => t.id === toneId) || TONES.find((t) => t.id === DEFAULT_TONE);
}

/**
 * Append the tone directive to a generation prompt.
 * Applied centrally so every step inherits the user's choice.
 */
export function applyTone(prompt, toneId) {
  if (!prompt) return prompt;
  return `${prompt}\n\n${getTone(toneId).directive}`;
}
