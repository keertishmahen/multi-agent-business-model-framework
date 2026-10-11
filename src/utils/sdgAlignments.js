/**
 * Build SDG alignment data from workflow outputs and MIA specialist results.
 */

import { formatAgentText } from "./agentText";
import { getSDGById, SDG_DEFINITIONS } from "../constants/sdgs";

const SDG_PATTERN = /SDG\s*(\d{1,2})\b/i;
const VALID_STATUSES = new Set(["strong", "inferred", "undecided"]);
const VALID_RELEVANCE = new Set([
  "Global", "Africa", "Europe", "Asia", "Americas", "Australia", "Custom",
]);

function normalizeAlignment(raw) {
  if (!raw?.sdgNumber) return null;
  const sdgNumber = Number(raw.sdgNumber);
  if (sdgNumber < 1 || sdgNumber > 17) return null;
  const def = getSDGById(sdgNumber);
  const status = VALID_STATUSES.has(raw.status) ? raw.status : "undecided";
  const localRelevance = VALID_RELEVANCE.has(raw.localRelevance) ? raw.localRelevance : undefined;

  return {
    sdgNumber,
    name: raw.name || def?.name || `SDG ${sdgNumber}`,
    status,
    evidenceSource: raw.evidenceSource ? formatAgentText(raw.evidenceSource) : undefined,
    localRelevance,
    nonAlignmentReason: raw.nonAlignmentReason
      ? formatAgentText(raw.nonAlignmentReason)
      : undefined,
  };
}

/**
 * Normalize LLM sdg_mapping output.
 */
export function normalizeSdgMapping(parsed) {
  const raw = parsed?.sdg_alignments || parsed?.alignments || [];
  const alignments = raw
    .map((entry) => {
      const normalized = normalizeAlignment(entry);
      if (!normalized) return null;
      if (!normalized.localRelevance) {
        return { ...normalized, localRelevance: "Global" };
      }
      return normalized;
    })
    .filter(Boolean);
  return { sdg_alignments: alignments };
}

function parseSdgNumber(text) {
  const match = String(text).match(SDG_PATTERN);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return num >= 1 && num <= 17 ? num : null;
}

/**
 * Convert MIA SDG agent insights into alignment objects.
 */
export function alignmentsFromSpecialist(sdgSpecialist) {
  if (!sdgSpecialist?.insights?.length) return [];

  return sdgSpecialist.insights
    .map((insight) => {
      const text = formatAgentText(insight);
      const sdgNumber = parseSdgNumber(text);
      if (!sdgNumber) return null;

      const hasStrong = /strong|evidence|verified|measurable|concrete/i.test(text);
      const hasInferred = /inferred|potential|may align|could support/i.test(text);
      const def = getSDGById(sdgNumber);

      return normalizeAlignment({
        sdgNumber,
        name: def?.name || `SDG ${sdgNumber}`,
        status: hasStrong ? "strong" : hasInferred ? "inferred" : "inferred",
        evidenceSource: text,
      });
    })
    .filter(Boolean);
}

/**
 * Merge sdg_mapping (primary), dilemma alignments, and MIA specialist insights.
 */
export function mergeSdgAlignments(
  mappingAlignments = [],
  dilemmaAlignments = [],
  sdgSpecialist = null
) {
  const merged = new Map();

  for (const a of mappingAlignments) {
    const normalized = normalizeAlignment(a);
    if (normalized) merged.set(normalized.sdgNumber, normalized);
  }

  for (const a of dilemmaAlignments) {
    const normalized = normalizeAlignment(a);
    if (!normalized || merged.has(normalized.sdgNumber)) continue;
    merged.set(normalized.sdgNumber, normalized);
  }

  for (const a of alignmentsFromSpecialist(sdgSpecialist)) {
    if (!merged.has(a.sdgNumber)) {
      merged.set(a.sdgNumber, a);
    }
  }

  return Array.from(merged.values());
}

/** Whether structured SDG mapping exists (17 entries from LLM). */
export function hasSdgMapping(mapping) {
  return (mapping?.sdg_alignments?.length || 0) >= 1;
}

/** Count alignments with localRelevance populated. */
export function countWithLocalRelevance(alignments = []) {
  return alignments.filter((a) => a.localRelevance).length;
}

/** SDG names for export compatibility. */
export function alignmentsForExport(alignments = []) {
  return alignments.map((a) => ({
    id: a.sdgNumber,
    name: a.name,
    status: a.status,
    title: a.name,
  }));
}

export { SDG_DEFINITIONS };
