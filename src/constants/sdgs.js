/**
 * UN Sustainable Development Goals (SDGs) Definitions
 * Official colors from the UN SDG brand guidelines.
 * Used by SDG_Mapper and SDGChip components to display alignment status.
 */

export const SDG_DEFINITIONS = [
  {
    id: 1,
    name: 'No Poverty',
    description: 'End poverty in all its forms everywhere',
    color: '#E5243B',
    icon: '🏠',
  },
  {
    id: 2,
    name: 'Zero Hunger',
    description: 'End hunger, achieve food security and improved nutrition and promote sustainable agriculture',
    color: '#DDA63A',
    icon: '🍽️',
  },
  {
    id: 3,
    name: 'Good Health and Well-being',
    description: 'Ensure healthy lives and promote well-being for all at all ages',
    color: '#4C9F38',
    icon: '❤️',
  },
  {
    id: 4,
    name: 'Quality Education',
    description: 'Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all',
    color: '#C5192D',
    icon: '📚',
  },
  {
    id: 5,
    name: 'Gender Equality',
    description: 'Achieve gender equality and empower all women and girls',
    color: '#FF3A21',
    icon: '⚧️',
  },
  {
    id: 6,
    name: 'Clean Water and Sanitation',
    description: 'Ensure availability and sustainable management of water and sanitation for all',
    color: '#26BDE2',
    icon: '💧',
  },
  {
    id: 7,
    name: 'Affordable and Clean Energy',
    description: 'Ensure access to affordable, reliable, sustainable and modern energy for all',
    color: '#FCC30B',
    icon: '☀️',
  },
  {
    id: 8,
    name: 'Decent Work and Economic Growth',
    description: 'Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all',
    color: '#A21942',
    icon: '📈',
  },
  {
    id: 9,
    name: 'Industry, Innovation and Infrastructure',
    description: 'Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation',
    color: '#FD6925',
    icon: '🏗️',
  },
  {
    id: 10,
    name: 'Reduced Inequalities',
    description: 'Reduce inequality within and among countries',
    color: '#DD1367',
    icon: '⚖️',
  },
  {
    id: 11,
    name: 'Sustainable Cities and Communities',
    description: 'Make cities and human settlements inclusive, safe, resilient and sustainable',
    color: '#FD9D24',
    icon: '🏙️',
  },
  {
    id: 12,
    name: 'Responsible Consumption and Production',
    description: 'Ensure sustainable consumption and production patterns',
    color: '#BF8B2E',
    icon: '♻️',
  },
  {
    id: 13,
    name: 'Climate Action',
    description: 'Take urgent action to combat climate change and its impacts',
    color: '#3F7E44',
    icon: '🌍',
  },
  {
    id: 14,
    name: 'Life Below Water',
    description: 'Conserve and sustainably use the oceans, seas and marine resources for sustainable development',
    color: '#0A97D9',
    icon: '🐟',
  },
  {
    id: 15,
    name: 'Life on Land',
    description: 'Protect, restore and promote sustainable use of terrestrial ecosystems and halt biodiversity loss',
    color: '#56C02B',
    icon: '🌳',
  },
  {
    id: 16,
    name: 'Peace, Justice and Strong Institutions',
    description: 'Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels',
    color: '#00689D',
    icon: '🕊️',
  },
  {
    id: 17,
    name: 'Partnerships for the Goals',
    description: 'Strengthen the means of implementation and revitalize the Global Partnership for Sustainable Development',
    color: '#19486A',
    icon: '🤝',
  },
];

/**
 * Get a single SDG definition by its number (1-17).
 * @param {number} id - The SDG number (1-17)
 * @returns {object|undefined} The SDG definition or undefined if not found
 */
export function getSDGById(id) {
  return SDG_DEFINITIONS.find((sdg) => sdg.id === id);
}

const SDG_LABEL_PATTERN = /SDG\s*(\d{1,2})\b/i;

/**
 * Parse SDG number from labels like "SDG 3", "SDG 10", or "SDG 7: Clean energy".
 */
export function parseSDGNumberFromLabel(label) {
  if (!label || typeof label !== "string") return null;
  const match = label.match(SDG_LABEL_PATTERN);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return num >= 1 && num <= 17 ? num : null;
}

/**
 * User-facing SDG label — full goal name when the number is known.
 */
export function getSDGDisplayName(label) {
  const resolved = resolveSDGFromLabel(label);
  if (resolved) return resolved.name;

  const colonMatch = String(label).match(/SDG\s*\d+\s*:\s*(.+)/i);
  if (colonMatch) return colonMatch[1].trim();
  return label;
}

/**
 * Resolve an SDG definition from a label — by number ("SDG 10") or goal name.
 */
export function resolveSDGFromLabel(label) {
  if (!label || typeof label !== "string") return null;

  const id = parseSDGNumberFromLabel(label);
  if (id) return getSDGById(id) || null;

  const normalized = label.trim().toLowerCase();
  const colonMatch = normalized.match(/sdg\s*\d+\s*:\s*(.+)/i);
  const nameCandidate = colonMatch ? colonMatch[1].trim() : normalized;

  return (
    SDG_DEFINITIONS.find(
      (sdg) =>
        sdg.name.toLowerCase() === nameCandidate
        || nameCandidate.includes(sdg.name.toLowerCase())
        || sdg.name.toLowerCase().includes(nameCandidate)
    ) || null
  );
}
