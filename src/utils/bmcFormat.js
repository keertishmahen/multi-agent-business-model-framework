import {
  ALL_BLOCK_IDS,
  CAMEL_TO_SNAKE,
  SNAKE_TO_CAMEL,
} from "../constants/bmcBlocks";

/** Map alternate LLM key names to canonical snake_case canvas keys. */
export const CANVAS_KEY_ALIASES = {
  social_and_environmental_cost: "social_environmental_cost",
  social_cost: "social_environmental_cost",
  environmental_cost: "social_environmental_cost",
  socialEnvironmentalCost: "social_environmental_cost",
  social_and_environmental_benefit: "social_environmental_benefit",
  social_benefit: "social_environmental_benefit",
  environmental_benefit: "social_environmental_benefit",
  socialEnvironmentalBenefit: "social_environmental_benefit",
};

function dedupeStrings(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function itemToText(item) {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") {
    return String(item.text || item.description || item.label || item.value || "").trim();
  }
  return String(item || "").trim();
}

/**
 * Coerce a canvas field value to a string array.
 */
export function coerceCanvasItems(value) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return dedupeStrings(value.map(itemToText).filter(Boolean));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (typeof value === "object") {
    const text = itemToText(value);
    return text ? [text] : [];
  }
  return [];
}

/**
 * Resolve a raw canvas key to its canonical snake_case key.
 */
export function resolveCanvasKey(rawKey) {
  if (SNAKE_TO_CAMEL[rawKey]) return rawKey;
  if (CANVAS_KEY_ALIASES[rawKey]) return CANVAS_KEY_ALIASES[rawKey];
  if (CAMEL_TO_SNAKE[rawKey]) return CAMEL_TO_SNAKE[rawKey];
  return rawKey;
}

/**
 * Normalize a raw canvas object to canonical snake_case keys with string arrays.
 */
export function canonicalizeCanvas(rawCanvas) {
  const canvas = {};
  if (!rawCanvas || typeof rawCanvas !== "object") return canvas;

  for (const id of ALL_BLOCK_IDS) {
    canvas[CAMEL_TO_SNAKE[id]] = [];
  }

  for (const [rawKey, value] of Object.entries(rawCanvas)) {
    const snakeKey = resolveCanvasKey(rawKey);
    if (!SNAKE_TO_CAMEL[snakeKey]) continue;
    canvas[snakeKey] = dedupeStrings([
      ...canvas[snakeKey],
      ...coerceCanvasItems(value),
    ]);
  }

  return canvas;
}

function toBlockItems(camelKey, items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, idx) => {
      if (typeof item === "string") {
        return { id: `${camelKey}-${idx}-${Date.now()}`, text: item };
      }
      return item && item.id && item.text
        ? item
        : { id: `${camelKey}-${idx}-${Date.now()}`, text: String(item?.text || item || "") };
    })
    .filter((item) => item.text.trim() !== "");
}

/**
 * Derive impact block content from prior workflow steps when LLM omits blocks 10/11.
 */
export function deriveImpactBlocks({ outputs = {}, selectedSwotTitle } = {}) {
  const costs = [];
  const benefits = [];

  const swotEntry = outputs.swot?.swot?.find(
    (entry) => entry.title === selectedSwotTitle,
  ) || outputs.swot?.swot?.[0];

  if (swotEntry) {
    (swotEntry.W || swotEntry.weaknesses || []).forEach((item) => {
      costs.push(`Operational risk: ${itemToText(item)}`);
    });
    (swotEntry.T || swotEntry.threats || []).forEach((item) => {
      costs.push(`External risk: ${itemToText(item)}`);
    });
    (swotEntry.S || swotEntry.strengths || []).forEach((item) => {
      benefits.push(itemToText(item));
    });
    (swotEntry.O || swotEntry.opportunities || []).forEach((item) => {
      benefits.push(itemToText(item));
    });
  }

  const valueProps = outputs.values?.value_propositions || [];
  const matchedVp = valueProps.find((vp) => vp.title === selectedSwotTitle)
    || valueProps.find((vp) => vp.title === swotEntry?.title)
    || valueProps[0];

  if (matchedVp?.benefits) {
    matchedVp.benefits.forEach((item) => {
      benefits.push(itemToText(item));
    });
  }

  const sdgSources = [
    ...(matchedVp?.sdgs || []),
    ...(matchedVp?.SDGs || []),
  ];
  sdgSources.forEach((sdg) => {
    benefits.push(`SDG alignment: ${itemToText(sdg)}`);
  });

  (outputs.dilemmas?.dilemmas || []).forEach((dilemma) => {
    const drivers = dilemma.drivers || [];
    if (drivers.includes("Planet") || drivers.includes("People")) {
      const summary = dilemma.description
        ? `${dilemma.title} — ${itemToText(dilemma.description).slice(0, 120)}`
        : itemToText(dilemma.title);
      costs.push(`Trade-off: ${summary}`);
    }
  });

  (outputs.focus?.focuses || []).forEach((focus) => {
    const text = itemToText(focus.focus || focus.rationale);
    if (!text) return;
    if (focus.driver === "Planet") {
      costs.push(`Environmental consideration: ${text}`);
    }
    if (focus.driver === "People") {
      benefits.push(`Social impact focus: ${text}`);
    }
    (focus.sdgs || []).forEach((sdg) => {
      benefits.push(`SDG alignment: ${itemToText(sdg)}`);
    });
  });

  return {
    social_environmental_cost: dedupeStrings(costs).slice(0, 5),
    social_environmental_benefit: dedupeStrings(benefits).slice(0, 5),
  };
}

/**
 * Normalize parsed or stored BMC output to canonical LLM format with backfilled impact blocks.
 */
export function normalizeBmcOutput(parsed, context = {}) {
  if (!parsed) {
    return { bmc: [{ value_proposition: "", canvas: canonicalizeCanvas({}) }] };
  }

  if (parsed.blocks && typeof parsed.blocks === "object") {
    return {
      bmc: [{
        value_proposition: parsed.value_proposition || "",
        canvas: blocksToCanvas(parsed.blocks),
      }],
    };
  }

  let entry = null;
  if (Array.isArray(parsed.bmc) && parsed.bmc.length > 0) {
    entry = parsed.bmc[0];
  } else if (parsed.canvas || parsed.key_partners || parsed.keyPartners) {
    entry = {
      value_proposition: parsed.value_proposition || "",
      canvas: parsed.canvas || parsed,
    };
  }

  const canvas = canonicalizeCanvas(entry?.canvas || {});
  const derived = deriveImpactBlocks(context);

  if (canvas.social_environmental_cost.length === 0 && derived.social_environmental_cost.length > 0) {
    canvas.social_environmental_cost = derived.social_environmental_cost;
  }
  if (canvas.social_environmental_benefit.length === 0 && derived.social_environmental_benefit.length > 0) {
    canvas.social_environmental_benefit = derived.social_environmental_benefit;
  }

  return {
    bmc: [{
      value_proposition: entry?.value_proposition || parsed.value_proposition || "",
      canvas,
    }],
  };
}

/**
 * Normalize incoming BMC data from various formats:
 * - LLM format: { bmc: [{ value_proposition, canvas: { key_partners: [...] } }] }
 * - Normalized format: { blocks: { keyPartners: [{id, text}], ... } }
 * - Direct canvas format: { key_partners: [...], ... }
 *
 * Always returns: Record<BMCBlockId, Array<{id, text}>>
 */
export function normalizeBlocks(data, context = {}) {
  const normalized = {};
  for (const id of ALL_BLOCK_IDS) {
    normalized[id] = [];
  }

  if (!data) return normalized;

  if (data.blocks && typeof data.blocks === "object") {
    for (const id of ALL_BLOCK_IDS) {
      normalized[id] = toBlockItems(id, data.blocks[id]);
    }
    return normalized;
  }

  const canonical = normalizeBmcOutput(data, context);
  const canvas = canonical.bmc[0]?.canvas || {};

  for (const [snakeKey, camelKey] of Object.entries(SNAKE_TO_CAMEL)) {
    normalized[camelKey] = toBlockItems(camelKey, canvas[snakeKey]);
  }

  return normalized;
}

/**
 * Convert normalized blocks to snake_case canvas (string arrays).
 */
export function blocksToCanvas(blocks) {
  const canvas = {};
  for (const id of ALL_BLOCK_IDS) {
    const snakeKey = CAMEL_TO_SNAKE[id];
    const items = blocks[id] || [];
    canvas[snakeKey] = items.map((item) =>
      typeof item === "string" ? item : item.text,
    ).filter((text) => text && text.trim() !== "");
  }
  return canvas;
}

/**
 * Return canvas object from LLM format or edited { blocks } format.
 */
export function getBmcCanvas(bmcData, context = {}) {
  if (!bmcData) return {};

  const canonical = normalizeBmcOutput(bmcData, context);
  return canonical.bmc[0]?.canvas || {};
}

export function hasBmcContent(bmcData) {
  if (!bmcData) return false;
  if (Array.isArray(bmcData.bmc) && bmcData.bmc.length > 0) return true;
  if (bmcData.blocks && typeof bmcData.blocks === "object") return true;
  return Boolean(bmcData.key_partners || bmcData.keyPartners);
}
