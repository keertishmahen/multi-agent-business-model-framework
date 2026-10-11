import { compileStory } from './compileStory';

describe('compileStory', () => {
  it('compiles all non-empty phases into a narrative with headers', () => {
    const phases = {
      basics: 'A coffee shop in Seattle',
      problem: 'No sustainable sourcing options nearby',
      customers: 'Eco-conscious millennials',
    };

    const result = compileStory(phases);

    expect(result).toBe(
      '## Business Overview\nA coffee shop in Seattle\n\n' +
      '## Problem & Solution\nNo sustainable sourcing options nearby\n\n' +
      '## Target Customers\nEco-conscious millennials'
    );
  });

  it('excludes empty phases', () => {
    const phases = {
      basics: 'A tech startup',
      problem: '',
      customers: 'Small business owners',
    };

    const result = compileStory(phases);

    expect(result).toBe(
      '## Business Overview\nA tech startup\n\n' +
      '## Target Customers\nSmall business owners'
    );
  });

  it('excludes whitespace-only phases', () => {
    const phases = {
      basics: 'An online marketplace',
      problem: '   \n\t  ',
      customers: 'Remote workers',
    };

    const result = compileStory(phases);

    expect(result).toBe(
      '## Business Overview\nAn online marketplace\n\n' +
      '## Target Customers\nRemote workers'
    );
  });

  it('returns empty string when all phases are empty', () => {
    const phases = {
      basics: '',
      problem: '',
      customers: '',
    };

    expect(compileStory(phases)).toBe('');
  });

  it('returns empty string when phases is null', () => {
    expect(compileStory(null)).toBe('');
  });

  it('returns empty string when phases is undefined', () => {
    expect(compileStory(undefined)).toBe('');
  });

  it('handles a single non-empty phase', () => {
    const phases = {
      basics: '',
      problem: 'Food waste in restaurants',
      customers: '',
    };

    expect(compileStory(phases)).toBe(
      '## Problem & Solution\nFood waste in restaurants'
    );
  });

  it('trims whitespace from phase content', () => {
    const phases = {
      basics: '  Padded content  ',
      problem: '',
      customers: '',
    };

    expect(compileStory(phases)).toBe('## Business Overview\nPadded content');
  });

  it('handles missing phase keys gracefully', () => {
    const phases = {
      basics: 'Only basics provided',
    };

    expect(compileStory(phases)).toBe('## Business Overview\nOnly basics provided');
  });

  it('maintains the correct phase order regardless of object key order', () => {
    const phases = {
      customers: 'Young professionals',
      basics: 'Fitness app',
      problem: 'Lack of personalized workouts',
    };

    const result = compileStory(phases);
    const basicsIndex = result.indexOf('## Business Overview');
    const problemIndex = result.indexOf('## Problem & Solution');
    const customersIndex = result.indexOf('## Target Customers');

    expect(basicsIndex).toBeLessThan(problemIndex);
    expect(problemIndex).toBeLessThan(customersIndex);
  });
});
