/**
 * Dilemma priority — LLM rank 1–N with supporting severity/reversibility/reach metrics.
 */

const MIN_DIM = 1;
const MAX_DIM = 4;
const MAX_PRODUCT = MAX_DIM * MAX_DIM * MAX_DIM; // 64

/**
 * Parse and clamp a dimension value to integer 1–4.
 */
export function normalizeDimension(value) {
  if (value == null || value === "") return 2;

  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(num)) return 2;

  return Math.min(MAX_DIM, Math.max(MIN_DIM, Math.round(num)));
}

/**
 * Parse and clamp rank to a positive integer.
 */
export function normalizeRank(value, fallback = null) {
  if (value == null || value === "") return fallback;

  const num = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(num) || num < 1) return fallback;

  return Math.round(num);
}

/**
 * Compute raw product and legacy display score (1–10) from three dimensions.
 */
export function computeDilemmaScore({ severity, reversibility, reach }) {
  const s = normalizeDimension(severity);
  const r = normalizeDimension(reversibility);
  const h = normalizeDimension(reach);
  const product = s * r * h;
  const displayScore = Math.min(
    10,
    Math.max(1, Math.round((product / MAX_PRODUCT) * 9 + 1))
  );

  return { severity: s, reversibility: r, reach: h, product, score: displayScore };
}

/**
 * Whether any dilemma has a valid LLM-provided rank.
 */
export function hasRankedDilemmas(dilemmas = []) {
  return dilemmas.some((d) => normalizeRank(d?.rank) != null);
}

/**
 * Normalize a single dilemma — dimensions clamped, rank/rationale preserved.
 */
export function normalizeDilemma(d) {
  if (!d || typeof d !== "object") return d;

  const computed = computeDilemmaScore({
    severity: d.severity,
    reversibility: d.reversibility,
    reach: d.reach,
  });

  const rank = normalizeRank(d.rank);
  const rankingRationale =
    typeof d.ranking_rationale === "string" && d.ranking_rationale.trim()
      ? d.ranking_rationale.trim()
      : d.ranking_rationale;

  return {
    ...d,
    severity: computed.severity,
    reversibility: computed.reversibility,
    reach: computed.reach,
    scoreProduct: computed.product,
    score: computed.score,
    ...(rank != null ? { rank } : {}),
    ...(rankingRationale ? { ranking_rationale: rankingRationale } : {}),
  };
}

/**
 * Normalize full dilemmas step output.
 */
export function normalizeDilemmasOutput(data) {
  if (!data || typeof data !== "object") return data;

  const dilemmas = Array.isArray(data.dilemmas)
    ? data.dilemmas.map(normalizeDilemma)
    : data.dilemmas;

  return { ...data, dilemmas };
}

/**
 * Sort dilemmas by score desc, then title asc for stable tie-breaking.
 */
export function sortDilemmasByScore(dilemmas = []) {
  return [...dilemmas].sort((a, b) => {
    const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

/**
 * Sort dilemmas by rank asc (1 first). Falls back to score sort when ranks missing.
 */
export function sortDilemmasByRank(dilemmas = []) {
  if (!hasRankedDilemmas(dilemmas)) {
    return sortDilemmasByScore(dilemmas);
  }

  return [...dilemmas].sort((a, b) => {
    const rankA = normalizeRank(a.rank, Number.MAX_SAFE_INTEGER);
    const rankB = normalizeRank(b.rank, Number.MAX_SAFE_INTEGER);
    if (rankA !== rankB) return rankA - rankB;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

/**
 * After user drag reorder, assign ranks 1–N in list order.
 */
export function applyRanksFromOrder(dilemmas = []) {
  return dilemmas.map((d, index) => ({
    ...d,
    rank: index + 1,
    userReordered: true,
  }));
}

/**
 * Default rationale when LLM did not provide one (legacy outputs).
 */
export function getLegacyRankingRationale(dilemma) {
  return `Ranked using severity (${dilemma.severity}/4), reversibility (${dilemma.reversibility}/4), and reach (${dilemma.reach}/4). Regenerate or refine this step for a written explanation of each rank.`;
}
