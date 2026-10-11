import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import PptxGenJS from "pptxgenjs";
import { EXPORT_BLOCK_LIST } from "../constants/bmcBlocks";
import { getBmcCanvas, hasBmcContent, canonicalizeCanvas } from "../utils/bmcFormat";
import { APP_NAME } from "../constants/branding";

/** Ordered business plan section headings (matches PROMPTS.plan). */
export const PLAN_SECTION_HEADINGS = [
  "Executive Summary",
  "Market Opportunity",
  "Business Model Overview",
  "Product or Service Description",
  "Customer & Marketing Strategy",
  "Operations Plan",
  "Financial & Sustainability Outlook",
  "Key Risks & Mitigation Strategies",
  "SDG Alignment & Impact",
  "Conclusion & Next Steps",
];

const SWOT_QUADRANT_KEYS = {
  S: ["S", "strengths"],
  W: ["W", "weaknesses"],
  O: ["O", "opportunities"],
  T: ["T", "threats"],
};

/**
 * Strip markdown markers and normalize line endings for parsing.
 */
export function normalizePlanText(planText) {
  if (!planText || typeof planText !== "string") return "";
  return planText
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^\*\s+/gm, "- ")
    .trim();
}

function normalizeHeadingText(text) {
  return text
    .replace(/^\d+\.\s*/, "")
    .replace(/[():]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchSectionNumber(title) {
  const normalized = normalizeHeadingText(title);
  for (let i = 0; i < PLAN_SECTION_HEADINGS.length; i++) {
    const heading = PLAN_SECTION_HEADINGS[i].toLowerCase();
    if (
      normalized === heading ||
      normalized.includes(heading) ||
      heading.includes(normalized)
    ) {
      return i + 1;
    }
  }
  return null;
}

function parseNumberedSections(text) {
  const sections = {};
  const lines = text.split("\n");
  let currentNum = null;
  let currentTitle = "";
  let bodyLines = [];

  function flush() {
    if (currentNum != null && currentNum >= 1 && currentNum <= 10) {
      sections[currentNum] = {
        title: currentTitle,
        body: bodyLines.join("\n").trim(),
      };
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      const num = parseInt(numbered[1], 10);
      if (num >= 1 && num <= 10) {
        flush();
        currentNum = num;
        currentTitle = numbered[2].trim();
        bodyLines = [];
        continue;
      }
    }
    if (currentNum != null) {
      bodyLines.push(line);
    }
  }

  flush();
  return sections;
}

function extractOrphanAfterLastHeading(text) {
  const lines = text.split("\n");
  let lastHeadingIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 10) lastHeadingIdx = i;
    }
  }

  if (lastHeadingIdx === -1) return "";
  return lines.slice(lastHeadingIdx + 1).join("\n").trim();
}

function redistributeOrphanContent(sections, fullText) {
  const emptyNums = [];
  for (let i = 1; i <= 10; i++) {
    if (sections[i] && !sections[i].body?.trim()) emptyNums.push(i);
  }
  if (emptyNums.length === 0) return sections;

  const orphan = extractOrphanAfterLastHeading(fullText);
  if (!orphan.trim()) return sections;

  const result = { ...sections };
  const chunks = orphan.split(/\n\n+/).map((c) => c.trim()).filter(Boolean);

  if (chunks.length >= emptyNums.length) {
    emptyNums.forEach((num, idx) => {
      result[num] = { ...result[num], body: chunks[idx] };
    });
  } else if (chunks.length > 1) {
    emptyNums.forEach((num, idx) => {
      if (chunks[idx]) {
        result[num] = { ...result[num], body: chunks[idx] };
      }
    });
  } else {
    const perSection = Math.max(1, Math.ceil(orphan.length / emptyNums.length));
    emptyNums.forEach((num, idx) => {
      const chunk = orphan.slice(idx * perSection, (idx + 1) * perSection).trim();
      if (chunk) result[num] = { ...result[num], body: chunk };
    });
  }

  return result;
}

function parseHeadingSections(text) {
  const sections = {};
  const lines = text.split("\n");
  let currentNum = null;
  let currentTitle = "";
  let bodyLines = [];

  function flush() {
    if (currentNum != null) {
      sections[currentNum] = {
        title: currentTitle,
        body: bodyLines.join("\n").trim(),
      };
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentNum != null) bodyLines.push("");
      continue;
    }

    const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      flush();
      currentNum = parseInt(numbered[1], 10);
      currentTitle = numbered[2].trim();
      bodyLines = [];
      continue;
    }

    const sectionNum = matchSectionNumber(trimmed);
    if (sectionNum != null && trimmed.length < 80) {
      flush();
      currentNum = sectionNum;
      currentTitle = PLAN_SECTION_HEADINGS[sectionNum - 1];
      bodyLines = [];
      continue;
    }

    if (currentNum != null) {
      bodyLines.push(trimmed);
    }
  }

  flush();
  return sections;
}

/**
 * Parse plan text into section objects keyed by section number (1–10).
 * Handles numbered headings, markdown, and unnumbered section titles.
 */
export function parsePlanSections(planText) {
  if (!planText || typeof planText !== "string") return {};

  const text = normalizePlanText(planText);
  let sections = parseNumberedSections(text);

  const headingSections = parseHeadingSections(text);
  for (const [num, section] of Object.entries(headingSections)) {
    const n = parseInt(num, 10);
    if (!sections[n] || !sections[n].body?.trim()) {
      sections[n] = section;
    }
  }

  sections = redistributeOrphanContent(sections, text);

  if (Object.keys(sections).length === 0 && text.trim()) {
    sections[1] = {
      title: PLAN_SECTION_HEADINGS[0],
      body: text.trim(),
    };
  }

  return sections;
}

function coerceSwotItem(item) {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") {
    return String(item.text || item.description || item.label || "").trim();
  }
  return String(item || "").trim();
}

/**
 * Extract quadrant items from a SWOT entry (S/W/O/T or strengths/weaknesses/etc).
 */
export function normalizeSwotQuadrantItems(entry, quadrant) {
  if (!entry || !quadrant) return [];
  const keys = SWOT_QUADRANT_KEYS[quadrant] || [quadrant];
  for (const key of keys) {
    const value = entry[key];
    if (Array.isArray(value) && value.length > 0) {
      return value.map(coerceSwotItem).filter(Boolean);
    }
  }
  return [];
}

/**
 * Resolve the selected SWOT entry with quadrant data in a consistent shape.
 */
export function normalizeSwotEntry(swotData, selectedVP) {
  const entries = swotData?.swot;
  if (!Array.isArray(entries) || !entries.length) {
    if (selectedVP?.title) return selectedVP;
    return null;
  }

  let entry = null;
  if (selectedVP?.title) {
    entry = entries.find((s) => s.title === selectedVP.title) || null;
  }
  if (!entry && swotData?.recommended_title) {
    entry = entries.find((s) => s.title === swotData.recommended_title) || null;
  }
  if (!entry) entry = entries[0];
  if (!entry) return null;

  return {
    title: entry.title || selectedVP?.title || "",
    S: normalizeSwotQuadrantItems(entry, "S"),
    W: normalizeSwotQuadrantItems(entry, "W"),
    O: normalizeSwotQuadrantItems(entry, "O"),
    T: normalizeSwotQuadrantItems(entry, "T"),
  };
}


function lastNonEmptySectionBody(sections) {
  for (let i = 10; i >= 1; i--) {
    const body = sections[i]?.body?.trim();
    if (body) return body;
  }
  return "";
}

function lastParagraph(text) {
  if (!text) return "";
  const paras = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return paras[paras.length - 1] || text.slice(-600).trim();
}

function buildBmcOverviewFallback(bmcData) {
  if (!bmcData) return "";
  let canvas = getBmcCanvas(bmcData);
  const hasContent = ["value_propositions", "customer_segments", "revenue_streams"].some(
    (key) => (canvas[key] || []).length > 0
  );
  if (!hasContent) {
    canvas = canonicalizeCanvas(bmcData);
  }
  const lines = [];
  const blocks = [
    { key: "value_propositions", label: "Value" },
    { key: "customer_segments", label: "Customers" },
    { key: "revenue_streams", label: "Revenue" },
  ];
  blocks.forEach(({ key, label }) => {
    const items = (canvas[key] || []).slice(0, 2);
    if (items.length) {
      lines.push(`${label}: ${items.join("; ")}`);
    }
  });
  return lines.join("\n");
}

function getOrphanChunkForSection(num, sections, fullText) {
  const orphan = extractOrphanAfterLastHeading(fullText);
  if (!orphan.trim()) return fullText.slice(0, 600).trim();

  const emptyNums = [];
  for (let i = 1; i <= 10; i++) {
    if (!sections[i]?.body?.trim()) emptyNums.push(i);
  }
  const idx = emptyNums.indexOf(num);
  if (idx === -1) return fullText.slice(0, 600).trim();

  const chunks = orphan.split(/\n\n+/).map((c) => c.trim()).filter(Boolean);
  if (chunks[idx]) return chunks[idx];
  const perSection = Math.max(1, Math.ceil(orphan.length / emptyNums.length));
  return orphan.slice(idx * perSection, (idx + 1) * perSection).trim();
}

export function getSectionBodyForSlide(num, sections, context) {
  const body = sections[num]?.body?.trim();
  if (body) return body;

  const { planText, story, bmcData } = context;
  const fullText = normalizePlanText(planText || "");

  switch (num) {
    case 1:
      if (story?.trim()) return story.trim().slice(0, 600);
      if (fullText) return fullText.slice(0, 600);
      break;
    case 3: {
      const bmcFallback = buildBmcOverviewFallback(bmcData);
      if (bmcFallback) return bmcFallback;
      break;
    }
    case 10: {
      const lastBody = lastNonEmptySectionBody(sections);
      if (lastBody) return lastBody;
      if (fullText) return lastParagraph(fullText);
      break;
    }
    default:
      if (fullText) return getOrphanChunkForSection(num, sections, fullText);
      break;
  }

  if (fullText) return fullText.slice(0, 600);
  return "";
}

function truncateForSlide(text, max = 1100, hasPlanText = false) {
  if (!text) {
    return hasPlanText
      ? "Content for this section is in the full plan — see Word export for complete detail."
      : "No content available.";
  }
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}\n\n(See full plan in Word export)`;
}

function firstSentence(text) {
  if (!text) return "";
  const match = text.match(/^[^.!?\n]+[.!?]?/);
  return match ? match[0].trim() : text.slice(0, 120).trim();
}

function addContentSlide(pres, { title, subtitle, body, brandColor, lightBg, darkText, hasPlanText }) {
  const slide = pres.addSlide();
  slide.background = { color: lightBg };
  slide.addText(title, {
    x: 0.5,
    y: 0.3,
    w: 12,
    h: 0.7,
    fontSize: 22,
    bold: true,
    color: brandColor,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5,
      y: 0.95,
      w: 12,
      h: 0.45,
      fontSize: 12,
      italic: true,
      color: "555555",
    });
  }
  slide.addText(truncateForSlide(body, 1100, hasPlanText), {
    x: 0.5,
    y: 1.35,
    w: 12,
    h: 5.8,
    fontSize: 13,
    color: darkText,
    valign: "top",
    wrap: true,
    fit: "shrink",
    lineSpacingMultiple: 1.15,
    paraSpaceAfter: 6,
  });
  return slide;
}

export function formatBmcBullets(items, maxItems = 3, maxChars = 120) {
  return items.slice(0, maxItems).map((item) => {
    const text = String(item || "").trim();
    if (text.length <= maxChars) return `• ${text}`;
    return `• ${text.slice(0, maxChars - 1).trim()}…`;
  }).join("\n");
}

function buildBmcSlideBlocks(slide, canvas, pres, { brandColor, lightBg, darkText }) {
  const labelByKey = Object.fromEntries(
    EXPORT_BLOCK_LIST.map(({ key, label }) => [key, label])
  );

  const bmcLayout = [
    { key: "key_partners", x: 0.3, y: 1.15, w: 2.35, h: 2.55 },
    { key: "key_activities", x: 2.75, y: 1.15, w: 2.35, h: 1.15 },
    { key: "key_resources", x: 2.75, y: 2.45, w: 2.35, h: 1.25 },
    { key: "value_propositions", x: 5.2, y: 1.15, w: 2.35, h: 2.55 },
    { key: "customer_relationships", x: 7.65, y: 1.15, w: 2.2, h: 1.15 },
    { key: "channels", x: 7.65, y: 2.45, w: 2.2, h: 1.25 },
    { key: "customer_segments", x: 9.95, y: 1.15, w: 2.85, h: 2.55 },
    { key: "cost_structure", x: 0.3, y: 3.85, w: 6.15, h: 1.45 },
    { key: "revenue_streams", x: 6.65, y: 3.85, w: 6.15, h: 1.45 },
    { key: "social_environmental_cost", x: 0.3, y: 5.55, w: 6.15, h: 1.45 },
    { key: "social_environmental_benefit", x: 6.65, y: 5.55, w: 6.15, h: 1.45 },
  ];

  const LABEL_H = 0.32;
  const CONTENT_TOP = 0.36;

  bmcLayout.forEach(({ key, x, y, w, h }) => {
    slide.addShape(pres.ShapeType.rect, {
      x, y, w, h,
      fill: { color: lightBg }, line: { color: brandColor, width: 0.5 }, rectRadius: 0.03,
    });
    slide.addText(labelByKey[key] || key, {
      x: x + 0.08,
      y: y + 0.04,
      w: w - 0.16,
      h: LABEL_H,
      fontSize: 9,
      bold: true,
      color: brandColor,
      valign: "top",
    });
    const items = canvas[key] || [];
    slide.addText(formatBmcBullets(items) || "—", {
      x: x + 0.1,
      y: y + CONTENT_TOP,
      w: w - 0.2,
      h: h - CONTENT_TOP - 0.08,
      fontSize: 8.5,
      color: darkText,
      valign: "top",
      wrap: true,
      fit: "shrink",
      lineSpacingMultiple: 1.1,
    });
  });
}

function getSelectedSwotEntry(swotData, selectedVP) {
  return normalizeSwotEntry(swotData, selectedVP) || {};
}

function getAlignedSdgsFromOutputs(outputs) {
  const sdgData = outputs?.sdg_mapping || outputs?.sdgMapping || null;
  const alignments = sdgData?.sdg_alignments || sdgData?.sdgs || [];
  if (!Array.isArray(alignments) || !alignments.length) return [];
  return alignments.filter((s) => s.status === "strong" || s.status === "inferred");
}

/**
 * Export the business plan as a Word (.docx) document.
 * Includes the business plan, SWOT appendix, and BMC appendix.
 *
 * Validates: Requirements 13.1, 13.2, 13.4
 */
export async function exportToWord({ planText, selectedVP, story, swotData, bmcData }) {
  const vpTitle = selectedVP?.title || "Business Plan";

  const children = [];

  // ── Cover heading ───────────────────────────────────────────────
  children.push(
    new Paragraph({
      text: "Business Plan",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: vpTitle,
          italics: true,
          color: "0F6E56",
          size: 28,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Generated by ${APP_NAME}`, color: "888888", size: 20 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // ── Original story ──────────────────────────────────────────────
  if (story) {
    children.push(
      new Paragraph({
        text: "Original Story",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1D9E75" } },
      }),
      new Paragraph({
        children: [new TextRun({ text: story, italics: true, color: "555555" })],
        spacing: { after: 400 },
      })
    );
  }

  // ── Business plan sections ──────────────────────────────────────
  if (planText) {
    const lines = planText.split("\n");
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        children.push(new Paragraph({ text: "", spacing: { after: 80 } }));
        return;
      }
      // Numbered section heading e.g. "1. Executive Summary"
      if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
        children.push(
          new Paragraph({
            text: trimmed.replace(/^\d+\.\s*/, ""),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 120 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1D9E75" } },
          })
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed.replace(/^[-•]\s*/, "") })],
            bullet: { level: 0 },
            spacing: { after: 60 },
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed })],
            spacing: { after: 100 },
          })
        );
      }
    });
  }

  // ── SWOT appendix ───────────────────────────────────────────────
  const swotEntry = normalizeSwotEntry(swotData, selectedVP);
  if (swotEntry) {
    children.push(
      new Paragraph({
        text: "Appendix A — SWOT Analysis",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 200 },
      })
    );
    children.push(
      new Paragraph({
        text: swotEntry.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
      })
    );
    [
      { key: "S", label: "Strengths" },
      { key: "W", label: "Weaknesses" },
      { key: "O", label: "Opportunities" },
      { key: "T", label: "Threats" },
    ].forEach(({ key, label }) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: label, bold: true })],
          spacing: { before: 160, after: 60 },
        })
      );
      normalizeSwotQuadrantItems(swotEntry, key).forEach((item) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: item })],
            bullet: { level: 0 },
            spacing: { after: 40 },
          })
        );
      });
    });
  } else if (swotData?.swot?.length) {
    children.push(
      new Paragraph({
        text: "Appendix A — SWOT Analysis",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 200 },
      })
    );
    swotData.swot.forEach((entry) => {
      const normalized = normalizeSwotEntry({ swot: [entry] }, entry);
      if (!normalized) return;
      children.push(
        new Paragraph({
          text: normalized.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 120 },
        })
      );
      [
        { key: "S", label: "Strengths" },
        { key: "W", label: "Weaknesses" },
        { key: "O", label: "Opportunities" },
        { key: "T", label: "Threats" },
      ].forEach(({ key, label }) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: label, bold: true })],
            spacing: { before: 160, after: 60 },
          })
        );
        normalizeSwotQuadrantItems(normalized, key).forEach((item) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: item })],
              bullet: { level: 0 },
              spacing: { after: 40 },
            })
          );
        });
      });
    });
  }

  // ── BMC appendix ────────────────────────────────────────────────
  if (hasBmcContent(bmcData)) {
    children.push(
      new Paragraph({
        text: "Appendix B — Expanded Business Model Canvas",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 600, after: 200 },
      })
    );
    const canvas = getBmcCanvas(bmcData);
    EXPORT_BLOCK_LIST.forEach(({ key, label }) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: label, bold: true })],
          spacing: { before: 200, after: 80 },
        })
      );
      (canvas[key] || []).forEach((item) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: item })],
            bullet: { level: 0 },
            spacing: { after: 40 },
          })
        );
      });
    });
  }

  // ── Build & save ────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 24 },
          paragraph: { spacing: { line: 360 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Business_Plan_${vpTitle.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.docx`;
  saveAs(blob, filename);
}

/**
 * Export business plan as plain text (.txt).
 *
 * Validates: Requirements 13.1, 13.4
 */
export function exportToText({ planText, selectedVP }) {
  const content = `BUSINESS PLAN\n${selectedVP?.title || ""}\n${"=".repeat(60)}\n\n${planText}`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "Business_Plan.txt");
}


/**
 * Export business plan as a PowerPoint (.pptx) investor pitch deck.
 * ~14 slides covering all plan sections, selected VP SWOT, BMC, and SDG alignment.
 */
export async function exportToPowerPoint({ planText, selectedVP, story, swotData, bmcData, outputs }) {
  const vpTitle = selectedVP?.title || "Business Plan";
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";

  const BRAND_COLOR = "0A6E4E";
  const LIGHT_BG = "EDF4F0";
  const DARK_TEXT = "1A1A1A";
  const sections = parsePlanSections(planText);
  const normalizedPlanText = normalizePlanText(planText || "");
  const hasPlanText = Boolean(normalizedPlanText.trim());
  const swotEntry = getSelectedSwotEntry(swotData, selectedVP);
  const storyTagline = story ? firstSentence(story) : "";
  const slideOpts = { brandColor: BRAND_COLOR, lightBg: LIGHT_BG, darkText: DARK_TEXT, hasPlanText };
  const slideContext = { planText, story, bmcData, normalizedPlanText };

  // Slide 1: Title
  const slide1 = pres.addSlide();
  slide1.background = { color: BRAND_COLOR };
  slide1.addText("Business Plan", {
    x: 1, y: 1.2, w: 11, h: 1.2,
    fontSize: 36, bold: true, color: "FFFFFF", align: "center",
  });
  slide1.addText(vpTitle, {
    x: 1, y: 2.5, w: 11, h: 0.9,
    fontSize: 24, italic: true, color: "C8F0E3", align: "center",
  });
  if (storyTagline) {
    slide1.addText(storyTagline, {
      x: 1.5, y: 3.5, w: 10, h: 0.8,
      fontSize: 14, color: "E8F8F2", align: "center", wrap: true,
    });
  }
  slide1.addText(`Generated ${new Date().toLocaleDateString()}`, {
    x: 1, y: 5.2, w: 11, h: 0.5,
    fontSize: 13, color: "A0D9C6", align: "center",
  });
  slide1.addText(APP_NAME, {
    x: 1, y: 6.5, w: 11, h: 0.4,
    fontSize: 11, color: "A0D9C6", align: "center",
  });

  // Slide 2: Agenda
  const agendaSlide = pres.addSlide();
  agendaSlide.background = { color: LIGHT_BG };
  agendaSlide.addText("Agenda", {
    x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 24, bold: true, color: BRAND_COLOR,
  });
  const agendaItems = PLAN_SECTION_HEADINGS.map((h, i) => `${i + 1}. ${h}`).join("\n");
  agendaSlide.addText(agendaItems, {
    x: 0.8, y: 1.2, w: 11, h: 5.5, fontSize: 14, color: DARK_TEXT, valign: "top",
  });

  // Slides 3–12: Plan sections
  const sectionSlides = [
    { num: 1, title: "Executive Summary", subtitle: "The opportunity at a glance" },
    { num: 2, title: "Market Opportunity", subtitle: "Where the need is greatest" },
    {
      num: 3,
      title: "Business Model Overview",
      subtitle: selectedVP?.title ? `Built around: ${selectedVP.title}` : "How value is created and captured",
    },
    { num: 4, title: "Product / Service", subtitle: "What we deliver" },
    { num: 5, title: "Customer & Marketing", subtitle: "Who we serve and how we reach them" },
    { num: 6, title: "Operations", subtitle: "How we deliver at scale" },
    { num: 7, title: "Financial & Sustainability", subtitle: "Economics and long-term viability" },
    { num: 8, title: "Risks & Mitigation", subtitle: "What could go wrong — and our response" },
    { num: 9, title: "SDG Alignment", subtitle: "Impact on the UN Sustainable Development Goals" },
    { num: 10, title: "Next Steps", subtitle: "Immediate priorities" },
  ];

  for (const spec of sectionSlides) {
    let body = getSectionBodyForSlide(spec.num, sections, slideContext);
    if (spec.num === 9) {
      const alignedSdgs = getAlignedSdgsFromOutputs(outputs);
      const sdgLines = alignedSdgs.length
        ? alignedSdgs.map((s) => `• SDG ${s.sdgNumber || s.id}: ${s.name || s.title || ""} (${s.status})`).join("\n")
        : "";
      body = [body, sdgLines ? `\nAligned SDGs:\n${sdgLines}` : ""].filter(Boolean).join("\n");
    }
    addContentSlide(pres, {
      ...slideOpts,
      title: spec.title,
      subtitle: spec.subtitle,
      body,
    });
  }

  // Slide: SWOT (selected VP)
  const swotSlide = pres.addSlide();
  swotSlide.background = { color: "FFFFFF" };
  swotSlide.addText("SWOT Analysis", {
    x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 24, bold: true, color: BRAND_COLOR,
  });
  if (swotEntry.title) {
    swotSlide.addText(swotEntry.title, {
      x: 0.5, y: 0.95, w: 12, h: 0.4, fontSize: 13, italic: true, color: "555555",
    });
  }
  const quadrants = [
    { key: "S", label: "Strengths", x: 0.5, y: 1.5, color: "E8F5E9" },
    { key: "W", label: "Weaknesses", x: 6.8, y: 1.5, color: "FFEBEE" },
    { key: "O", label: "Opportunities", x: 0.5, y: 4.3, color: "E3F2FD" },
    { key: "T", label: "Threats", x: 6.8, y: 4.3, color: "FFF3E0" },
  ];
  quadrants.forEach(({ key, label, x, y, color }) => {
    swotSlide.addShape(pres.ShapeType.rect, {
      x, y, w: 5.8, h: 2.6,
      fill: { color }, line: { color: "CCCCCC", width: 0.5 }, rectRadius: 0.05,
    });
    swotSlide.addText(label, {
      x: x + 0.2, y: y + 0.1, w: 5.4, h: 0.45,
      fontSize: 14, bold: true, color: DARK_TEXT,
    });
    const items = normalizeSwotQuadrantItems(swotEntry, key).slice(0, 5);
    swotSlide.addText(items.map((item) => `• ${item}`).join("\n") || "• No data", {
      x: x + 0.3, y: y + 0.55, w: 5.2, h: 1.9,
      fontSize: 11, color: DARK_TEXT, valign: "top", wrap: true,
    });
  });

  // Slide: BMC Snapshot (3 bullets per block)
  const bmcSlide = pres.addSlide();
  bmcSlide.background = { color: "FFFFFF" };
  bmcSlide.addText("Business Model Canvas", {
    x: 0.5, y: 0.25, w: 12, h: 0.6, fontSize: 22, bold: true, color: BRAND_COLOR,
  });
  bmcSlide.addText("High-level snapshot — all 11 building blocks", {
    x: 0.5, y: 0.8, w: 12, h: 0.35, fontSize: 11, italic: true, color: "666666",
  });

  const canvas = getBmcCanvas(bmcData);
  buildBmcSlideBlocks(bmcSlide, canvas, pres, {
    brandColor: BRAND_COLOR,
    lightBg: LIGHT_BG,
    darkText: DARK_TEXT,
  });

  const filename = `Business_Plan_${vpTitle.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.pptx`;
  await pres.writeFile({ fileName: filename });
}

/**
 * Export business plan as Notion-compatible markdown (.md).
 * Uses proper heading hierarchy, toggles (details/summary) for collapsible sections,
 * callout formatting for key insights, and structured BMC blocks.
 * Triggers a browser download of the .md file.
 *
 * Validates: Requirements 13.1, 13.4
 */
export function exportToNotion({ planText, selectedVP, story, swotData, bmcData, outputs }) {
  const vpTitle = selectedVP?.title || "Business Plan";
  const lines = [];

  // ── Title and metadata ──────────────────────────────────────────
  lines.push(`# ${vpTitle}`);
  lines.push("");
  lines.push(`> 📋 Generated by **${APP_NAME}** on ${new Date().toLocaleDateString()}`);
  lines.push("");

  // ── Original story (callout format) ─────────────────────────────
  if (story) {
    lines.push("## Original Story");
    lines.push("");
    lines.push(`> 💡 **Your original story:**`);
    lines.push(`> *${story}*`);
    lines.push("");
  }

  // ── Business plan content ───────────────────────────────────────
  if (planText) {
    lines.push("## Business Plan");
    lines.push("");
    // Convert numbered sections to markdown headings
    const planLines = planText.split("\n");
    planLines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        lines.push("");
        return;
      }
      if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
        lines.push(`### ${trimmed.replace(/^\d+\.\s*/, "")}`);
        lines.push("");
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        lines.push(`- ${trimmed.replace(/^[-•]\s*/, "")}`);
      } else {
        lines.push(trimmed);
      }
    });
    lines.push("");
  }

  // ── SWOT Analysis (collapsible toggle sections) ─────────────────
  const swotEntry = normalizeSwotEntry(swotData, selectedVP);
  if (swotEntry) {
    lines.push("## SWOT Analysis");
    lines.push("");
    if (swotEntry.title) {
      lines.push(`### ${swotEntry.title}`);
      lines.push("");
    }

    const quadrants = [
      { key: "S", label: "Strengths", emoji: "💪" },
      { key: "W", label: "Weaknesses", emoji: "⚠️" },
      { key: "O", label: "Opportunities", emoji: "🌟" },
      { key: "T", label: "Threats", emoji: "🔴" },
    ];

    quadrants.forEach(({ key, label, emoji }) => {
      const items = normalizeSwotQuadrantItems(swotEntry, key);
      lines.push(`<details>`);
      lines.push(`<summary>${emoji} <strong>${label}</strong> (${items.length} items)</summary>`);
      lines.push("");
      if (items.length > 0) {
        items.forEach((item) => {
          lines.push(`- ${item}`);
        });
      } else {
        lines.push("- No items identified");
      }
      lines.push("");
      lines.push(`</details>`);
      lines.push("");
    });
  } else if (swotData?.swot?.length) {
    lines.push("## SWOT Analysis");
    lines.push("");

    swotData.swot.forEach((entry) => {
      const normalized = normalizeSwotEntry({ swot: [entry] }, entry);
      if (!normalized) return;
      if (normalized.title) {
        lines.push(`### ${normalized.title}`);
        lines.push("");
      }

      const quadrants = [
        { key: "S", label: "Strengths", emoji: "💪" },
        { key: "W", label: "Weaknesses", emoji: "⚠️" },
        { key: "O", label: "Opportunities", emoji: "🌟" },
        { key: "T", label: "Threats", emoji: "🔴" },
      ];

      quadrants.forEach(({ key, label, emoji }) => {
        const items = normalizeSwotQuadrantItems(normalized, key);
        lines.push(`<details>`);
        lines.push(`<summary>${emoji} <strong>${label}</strong> (${items.length} items)</summary>`);
        lines.push("");
        if (items.length > 0) {
          items.forEach((item) => {
            lines.push(`- ${item}`);
          });
        } else {
          lines.push("- No items identified");
        }
        lines.push("");
        lines.push(`</details>`);
        lines.push("");
      });
    });
  }

  // ── Business Model Canvas (collapsible toggles) ─────────────────
  if (hasBmcContent(bmcData)) {
    lines.push("## Expanded Business Model Canvas");
    lines.push("");

    const canvas = getBmcCanvas(bmcData);

    EXPORT_BLOCK_LIST.forEach(({ key, label, emoji }) => {
      const items = canvas[key] || [];
      lines.push(`<details>`);
      lines.push(`<summary>${emoji} <strong>${label}</strong></summary>`);
      lines.push("");
      if (items.length > 0) {
        items.forEach((item) => {
          lines.push(`- ${item}`);
        });
      } else {
        lines.push("- No items defined");
      }
      lines.push("");
      lines.push(`</details>`);
      lines.push("");
    });
  }

  // ── SDG Alignment (callout with list) ───────────────────────────
  const alignedSdgs = getAlignedSdgsFromOutputs(outputs);
  if (alignedSdgs.length > 0) {
    lines.push("## SDG Alignment");
    lines.push("");
    lines.push(`> 🌍 **This plan aligns with ${alignedSdgs.length} Sustainable Development Goal(s):**`);
    lines.push("");
    alignedSdgs.forEach((s) => {
      const statusIcon = s.status === "strong" ? "✅" : "🔄";
      const id = s.sdgNumber || s.id;
      lines.push(`- ${statusIcon} **SDG ${id}**: ${s.name || s.title || ""} — *${s.status}*`);
    });
    lines.push("");
  }

  // ── Key Insights callout ────────────────────────────────────────
  lines.push("> ⚠️ **Important:** This export is for reference. Always validate AI-generated insights with domain experts and real-world data before making business decisions.");
  lines.push("");

  // ── Footer ──────────────────────────────────────────────────────
  lines.push("---");
  lines.push("");
  lines.push(`*Exported from ${APP_NAME}*`);

  // ── Save as .md file ────────────────────────────────────────────
  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const filename = `Business_Plan_${vpTitle.replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.md`;
  saveAs(blob, filename);
}
