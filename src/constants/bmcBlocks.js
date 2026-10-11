import {
  Handshake,
  Cog,
  Briefcase,
  Lightbulb,
  MessageCircle,
  Truck,
  Users,
  DollarSign,
  Receipt,
  AlertTriangle,
  Leaf,
} from "lucide-react";

/**
 * Expanded Business Model Canvas — 11 blocks (ASME / SDG-adapted).
 * Single source of truth for UI, prompts, validation, and export.
 */

export const BMC_BLOCKS = {
  keyPartners: {
    label: "Key Partners",
    Icon: Handshake,
    bg: "#E6F1FB",
    bgGlass: "rgba(230, 241, 251, 0.45)",
    border: "#B5D4F4",
    text: "#0C447C",
    snakeKey: "key_partners",
    exportEmoji: "🤝",
  },
  keyActivities: {
    label: "Key Activities",
    Icon: Cog,
    bg: "#FCEBEB",
    bgGlass: "rgba(252, 235, 235, 0.45)",
    border: "#F7C1C1",
    text: "#791F1F",
    snakeKey: "key_activities",
    exportEmoji: "⚙️",
  },
  keyResources: {
    label: "Key Resources",
    Icon: Briefcase,
    bg: "#EAF3DE",
    bgGlass: "rgba(234, 243, 222, 0.45)",
    border: "#C0DD97",
    text: "#27500A",
    snakeKey: "key_resources",
    exportEmoji: "🧰",
  },
  valuePropositions: {
    label: "Value Propositions",
    Icon: Lightbulb,
    bg: "#FAEEDA",
    bgGlass: "rgba(250, 238, 218, 0.45)",
    border: "#FAC775",
    text: "#633806",
    snakeKey: "value_propositions",
    exportEmoji: "💡",
  },
  customerRelationships: {
    label: "Customer Relationships",
    Icon: MessageCircle,
    bg: "#F3E8F9",
    bgGlass: "rgba(243, 232, 249, 0.45)",
    border: "#D4A5E8",
    text: "#4A1568",
    snakeKey: "customer_relationships",
    exportEmoji: "💬",
  },
  channels: {
    label: "Channels",
    Icon: Truck,
    bg: "#E8F8F5",
    bgGlass: "rgba(232, 248, 245, 0.45)",
    border: "#A3E4D7",
    text: "#0E6655",
    snakeKey: "channels",
    exportEmoji: "🚚",
  },
  customerSegments: {
    label: "Customer Segments",
    Icon: Users,
    bg: "#FDE9E0",
    bgGlass: "rgba(253, 233, 224, 0.45)",
    border: "#F5B7A1",
    text: "#6E2C00",
    snakeKey: "customer_segments",
    exportEmoji: "👥",
  },
  revenueStreams: {
    label: "Revenue Streams",
    Icon: DollarSign,
    bg: "#D4EFDF",
    bgGlass: "rgba(212, 239, 223, 0.45)",
    border: "#82D9A5",
    text: "#1E6B3E",
    snakeKey: "revenue_streams",
    exportEmoji: "💰",
  },
  costStructure: {
    label: "Cost Structure",
    Icon: Receipt,
    bg: "#F9E9EC",
    bgGlass: "rgba(249, 233, 236, 0.45)",
    border: "#E8B4BD",
    text: "#6B1D2B",
    snakeKey: "cost_structure",
    exportEmoji: "🧾",
  },
  socialEnvironmentalCost: {
    label: "Social and Environmental Cost",
    Icon: AlertTriangle,
    bg: "#F5F0F0",
    bgGlass: "rgba(245, 240, 240, 0.45)",
    border: "#C9B8B8",
    text: "#5C3D3D",
    snakeKey: "social_environmental_cost",
    exportEmoji: "⚠️",
    impactType: "cost",
  },
  socialEnvironmentalBenefit: {
    label: "Social and Environmental Benefit",
    Icon: Leaf,
    bg: "#DFF5EC",
    bgGlass: "rgba(223, 245, 236, 0.45)",
    border: "#B7E9D7",
    text: "#0E8A66",
    snakeKey: "social_environmental_benefit",
    exportEmoji: "🌱",
    impactType: "benefit",
  },
};

/** Visual pillar groupings for Step 8 layout (data/export unchanged). */
export const BMC_PILLARS = [
  {
    id: "value",
    label: "Core Value",
    blocks: ["valuePropositions"],
    variant: "hero",
  },
  {
    id: "customers",
    label: "Customers",
    blocks: ["customerSegments", "customerRelationships", "channels"],
  },
  {
    id: "operations",
    label: "Operations",
    blocks: ["keyPartners", "keyActivities", "keyResources"],
  },
  {
    id: "economics",
    label: "Economics",
    blocks: ["costStructure", "revenueStreams"],
  },
  {
    id: "impact",
    label: "Impact",
    blocks: ["socialEnvironmentalCost", "socialEnvironmentalBenefit"],
  },
];

/** Two-column rows below the hero pillar. */
export const BMC_PILLAR_ROWS = [
  ["customers", "operations"],
  ["economics", "impact"],
];

export const ALL_BLOCK_IDS = Object.keys(BMC_BLOCKS);

export const SNAKE_TO_CAMEL = Object.fromEntries(
  ALL_BLOCK_IDS.map((id) => [BMC_BLOCKS[id].snakeKey, id]),
);

export const CAMEL_TO_SNAKE = Object.fromEntries(
  ALL_BLOCK_IDS.map((id) => [id, BMC_BLOCKS[id].snakeKey]),
);

/** Ordered list for export (Word, Notion). */
export const EXPORT_BLOCK_LIST = ALL_BLOCK_IDS.map((id) => ({
  id,
  key: BMC_BLOCKS[id].snakeKey,
  label: BMC_BLOCKS[id].label,
  emoji: BMC_BLOCKS[id].exportEmoji,
}));
