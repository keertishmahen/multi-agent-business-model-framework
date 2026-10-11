/**
 * Contextual headers for each guided input phase.
 */
const PHASE_HEADERS = {
  basics: '## Business Overview',
  problem: '## Problem & Solution',
  customers: '## Target Customers',
};

/**
 * Compile guided input phase responses into a unified story narrative.
 * Only includes non-empty phases. Uses contextual separators between sections.
 *
 * @param {{ basics: string, problem: string, customers: string }} phases
 * @returns {string} The compiled story narrative
 */
export function compileStory(phases) {
  if (!phases || typeof phases !== 'object') {
    return '';
  }

  const phaseKeys = ['basics', 'problem', 'customers'];

  const sections = phaseKeys
    .filter((key) => {
      const value = phases[key];
      return typeof value === 'string' && value.trim().length > 0;
    })
    .map((key) => `${PHASE_HEADERS[key]}\n${phases[key].trim()}`);

  return sections.join('\n\n');
}

export default compileStory;
