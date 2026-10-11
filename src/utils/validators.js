/**
 * Lightweight JSON schema validators for each workflow step's expected output structure.
 * No external dependencies — just structure and type checks.
 * Each validator returns { valid: boolean, errors: string[] }
 */

function createResult(errors) {
  return { valid: errors.length === 0, errors };
}

function checkIsObject(data, label) {
  if (data === null || data === undefined) {
    return [`${label} is null or undefined`];
  }
  if (typeof data !== 'object' || Array.isArray(data)) {
    return [`${label} must be a plain object`];
  }
  return [];
}

function checkIsArray(value, label) {
  if (!Array.isArray(value)) {
    return [`${label} must be an array`];
  }
  return [];
}

function checkIsString(value, label) {
  if (typeof value !== 'string') {
    return [`${label} must be a string`];
  }
  return [];
}

function checkArrayItemKeys(arr, requiredKeys, label) {
  const errors = [];
  arr.forEach((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      errors.push(`${label}[${index}] must be an object`);
      return;
    }
    requiredKeys.forEach((key) => {
      if (!(key in item)) {
        errors.push(`${label}[${index}] is missing required key "${key}"`);
      }
    });
  });
  return errors;
}

/**
 * Focus output: { drivers: Array<{name, description, relevance}>, primaryFocus: string }
 */
export function validateFocusOutput(data) {
  const errors = [];

  errors.push(...checkIsObject(data, 'FocusOutput'));
  if (errors.length > 0) return createResult(errors);

  if (!('drivers' in data)) {
    errors.push('FocusOutput is missing required key "drivers"');
  } else {
    errors.push(...checkIsArray(data.drivers, 'FocusOutput.drivers'));
    if (Array.isArray(data.drivers)) {
      errors.push(
        ...checkArrayItemKeys(data.drivers, ['name', 'description', 'relevance'], 'FocusOutput.drivers')
      );
    }
  }

  if (!('primaryFocus' in data)) {
    errors.push('FocusOutput is missing required key "primaryFocus"');
  } else {
    errors.push(...checkIsString(data.primaryFocus, 'FocusOutput.primaryFocus'));
  }

  return createResult(errors);
}

/**
 * Issues output: { issues: Array<{title, description, driver, evidence}> }
 */
export function validateIssuesOutput(data) {
  const errors = [];

  errors.push(...checkIsObject(data, 'IssuesOutput'));
  if (errors.length > 0) return createResult(errors);

  if (!('issues' in data)) {
    errors.push('IssuesOutput is missing required key "issues"');
  } else {
    errors.push(...checkIsArray(data.issues, 'IssuesOutput.issues'));
    if (Array.isArray(data.issues)) {
      errors.push(
        ...checkArrayItemKeys(data.issues, ['title', 'description', 'driver', 'evidence'], 'IssuesOutput.issues')
      );
    }
  }

  return createResult(errors);
}

/**
 * Tensions output: { tensions: Array<{id, title, description, columns, rows, evidenceLevel, resolved}> }
 */
export function validateTensionsOutput(data) {
  const errors = [];

  errors.push(...checkIsObject(data, 'TensionsOutput'));
  if (errors.length > 0) return createResult(errors);

  if (!('tensions' in data)) {
    errors.push('TensionsOutput is missing required key "tensions"');
  } else {
    errors.push(...checkIsArray(data.tensions, 'TensionsOutput.tensions'));
    if (Array.isArray(data.tensions)) {
      errors.push(
        ...checkArrayItemKeys(
          data.tensions,
          ['id', 'title', 'description', 'columns', 'rows', 'evidenceLevel', 'resolved'],
          'TensionsOutput.tensions'
        )
      );
    }
  }

  return createResult(errors);
}

/**
 * Dilemmas output: { dilemmas: Array<{title, description, severity, reversibility, reach, sdgs, drivers}> }
 * score is computed client-side from severity × reversibility × reach.
 */
export function validateDilemmasOutput(data) {
  const errors = [];

  errors.push(...checkIsObject(data, 'DilemmasOutput'));
  if (errors.length > 0) return createResult(errors);

  if (!('dilemmas' in data)) {
    errors.push('DilemmasOutput is missing required key "dilemmas"');
  } else {
    errors.push(...checkIsArray(data.dilemmas, 'DilemmasOutput.dilemmas'));
    if (Array.isArray(data.dilemmas)) {
      errors.push(
        ...checkArrayItemKeys(
          data.dilemmas,
          ['title', 'description', 'severity', 'reversibility', 'reach', 'sdgs', 'drivers'],
          'DilemmasOutput.dilemmas'
        )
      );
    }
  }

  return createResult(errors);
}

/**
 * Values output: { propositions: Array<{title, description, customerSegment, differentiator}> }
 */
export function validateValuesOutput(data) {
  const errors = [];

  errors.push(...checkIsObject(data, 'ValuesOutput'));
  if (errors.length > 0) return createResult(errors);

  if (!('propositions' in data)) {
    errors.push('ValuesOutput is missing required key "propositions"');
  } else {
    errors.push(...checkIsArray(data.propositions, 'ValuesOutput.propositions'));
    if (Array.isArray(data.propositions)) {
      errors.push(
        ...checkArrayItemKeys(
          data.propositions,
          ['title', 'description', 'customerSegment', 'differentiator'],
          'ValuesOutput.propositions'
        )
      );
    }
  }

  return createResult(errors);
}

/**
 * SWOT output: { strengths: Array<{id, text}>, weaknesses: Array<{id, text}>, opportunities: Array<{id, text}>, threats: Array<{id, text}> }
 */
export function validateSwotOutput(data) {
  const errors = [];

  errors.push(...checkIsObject(data, 'SwotOutput'));
  if (errors.length > 0) return createResult(errors);

  const quadrants = ['strengths', 'weaknesses', 'opportunities', 'threats'];

  quadrants.forEach((quadrant) => {
    if (!(quadrant in data)) {
      errors.push(`SwotOutput is missing required key "${quadrant}"`);
    } else {
      errors.push(...checkIsArray(data[quadrant], `SwotOutput.${quadrant}`));
      if (Array.isArray(data[quadrant])) {
        errors.push(
          ...checkArrayItemKeys(data[quadrant], ['id', 'text'], `SwotOutput.${quadrant}`)
        );
      }
    }
  });

  return createResult(errors);
}

/**
 * BMC output: { blocks: Record<BMCBlockId, Array<{id, text}>> }
 * BMCBlockId: keyPartners, keyActivities, keyResources, valuePropositions, customerRelationships, channels, customerSegments, revenueStreams, costStructure, socialEnvironmentalCost, socialEnvironmentalBenefit
 */
export function validateBMCOutput(data) {
  const errors = [];

  errors.push(...checkIsObject(data, 'BMCOutput'));
  if (errors.length > 0) return createResult(errors);

  if (!('blocks' in data)) {
    errors.push('BMCOutput is missing required key "blocks"');
    return createResult(errors);
  }

  errors.push(...checkIsObject(data.blocks, 'BMCOutput.blocks'));
  if (errors.length > 0) return createResult(errors);

  const requiredBlocks = [
    'keyPartners',
    'keyActivities',
    'keyResources',
    'valuePropositions',
    'customerRelationships',
    'channels',
    'customerSegments',
    'revenueStreams',
    'costStructure',
    'socialEnvironmentalCost',
    'socialEnvironmentalBenefit',
  ];

  requiredBlocks.forEach((blockId) => {
    if (!(blockId in data.blocks)) {
      errors.push(`BMCOutput.blocks is missing required block "${blockId}"`);
    } else {
      errors.push(...checkIsArray(data.blocks[blockId], `BMCOutput.blocks.${blockId}`));
      if (Array.isArray(data.blocks[blockId])) {
        errors.push(
          ...checkArrayItemKeys(data.blocks[blockId], ['id', 'text'], `BMCOutput.blocks.${blockId}`)
        );
      }
    }
  });

  return createResult(errors);
}

/**
 * Plan output: { sections: Array<{heading, content}>, markdown: string }
 */
export function validatePlanOutput(data) {
  const errors = [];

  errors.push(...checkIsObject(data, 'PlanOutput'));
  if (errors.length > 0) return createResult(errors);

  if (!('sections' in data)) {
    errors.push('PlanOutput is missing required key "sections"');
  } else {
    errors.push(...checkIsArray(data.sections, 'PlanOutput.sections'));
    if (Array.isArray(data.sections)) {
      errors.push(
        ...checkArrayItemKeys(data.sections, ['heading', 'content'], 'PlanOutput.sections')
      );
    }
  }

  if (!('markdown' in data)) {
    errors.push('PlanOutput is missing required key "markdown"');
  } else {
    errors.push(...checkIsString(data.markdown, 'PlanOutput.markdown'));
  }

  return createResult(errors);
}

/**
 * Generic validator dispatcher — validates step output by step ID.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateStepOutput(stepId, data) {
  const validators = {
    focus: validateFocusOutput,
    issues: validateIssuesOutput,
    tensions: validateTensionsOutput,
    dilemmas: validateDilemmasOutput,
    values: validateValuesOutput,
    swot: validateSwotOutput,
    bmc: validateBMCOutput,
    plan: validatePlanOutput,
  };

  const validator = validators[stepId];
  if (!validator) {
    return { valid: false, errors: [`Unknown step ID: "${stepId}"`] };
  }

  return validator(data);
}
