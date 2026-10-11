import { renderHook, act } from '@testing-library/react';
import useVersionHistory from './useVersionHistory';

describe('useVersionHistory', () => {
  it('starts with an empty history object', () => {
    const { result } = renderHook(() => useVersionHistory());
    expect(result.current.history).toEqual({});
  });

  it('records a version entry for a step with timestamp and deep-cloned snapshot', () => {
    const { result } = renderHook(() => useVersionHistory());
    const snapshot = { strengths: [{ id: '1', text: 'Good team' }] };

    act(() => {
      result.current.recordVersion('swot', snapshot, 'Initial SWOT');
    });

    const stepHistory = result.current.getStepHistory('swot');
    expect(stepHistory).toHaveLength(1);
    expect(stepHistory[0].changeDescription).toBe('Initial SWOT');
    expect(stepHistory[0].snapshot).toEqual(snapshot);
    // Verify deep clone — mutation of original doesn't affect stored
    snapshot.strengths[0].text = 'MUTATED';
    expect(stepHistory[0].snapshot.strengths[0].text).toBe('Good team');
  });

  it('sets ISO 8601 timestamp on each entry', () => {
    const { result } = renderHook(() => useVersionHistory());

    act(() => {
      result.current.recordVersion('focus', { drivers: [] }, 'Added drivers');
    });

    const entry = result.current.getStepHistory('focus')[0];
    // ISO 8601 format check
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('appends entries — never removes or reorders', () => {
    const { result } = renderHook(() => useVersionHistory());

    act(() => {
      result.current.recordVersion('swot', { v: 1 }, 'First edit');
    });
    act(() => {
      result.current.recordVersion('swot', { v: 2 }, 'Second edit');
    });
    act(() => {
      result.current.recordVersion('swot', { v: 3 }, 'Third edit');
    });

    const stepHistory = result.current.getStepHistory('swot');
    expect(stepHistory).toHaveLength(3);
    expect(stepHistory[0].changeDescription).toBe('First edit');
    expect(stepHistory[1].changeDescription).toBe('Second edit');
    expect(stepHistory[2].changeDescription).toBe('Third edit');
  });

  it('maintains monotonic timestamps (each >= previous)', () => {
    const { result } = renderHook(() => useVersionHistory());

    act(() => {
      result.current.recordVersion('issues', { a: 1 }, 'Edit 1');
    });
    act(() => {
      result.current.recordVersion('issues', { a: 2 }, 'Edit 2');
    });
    act(() => {
      result.current.recordVersion('issues', { a: 3 }, 'Edit 3');
    });

    const stepHistory = result.current.getStepHistory('issues');
    for (let i = 1; i < stepHistory.length; i++) {
      expect(stepHistory[i].timestamp >= stepHistory[i - 1].timestamp).toBe(true);
    }
  });

  it('restoreVersion returns the snapshot at the given index', () => {
    const { result } = renderHook(() => useVersionHistory());

    act(() => {
      result.current.recordVersion('bmc', { blocks: { keyPartners: [] } }, 'v1');
    });
    act(() => {
      result.current.recordVersion('bmc', { blocks: { keyPartners: ['A'] } }, 'v2');
    });

    const restored = result.current.restoreVersion('bmc', 0);
    expect(restored).toEqual({ blocks: { keyPartners: [] } });
  });

  it('restoreVersion returns a deep clone (not a reference)', () => {
    const { result } = renderHook(() => useVersionHistory());

    act(() => {
      result.current.recordVersion('swot', { items: ['x'] }, 'original');
    });

    const restored = result.current.restoreVersion('swot', 0);
    restored.items.push('y');
    // Original stored snapshot should be unaffected
    const storedEntry = result.current.getStepHistory('swot')[0];
    expect(storedEntry.snapshot.items).toEqual(['x']);
  });

  it('restoreVersion returns null for invalid step', () => {
    const { result } = renderHook(() => useVersionHistory());
    expect(result.current.restoreVersion('nonexistent', 0)).toBeNull();
  });

  it('restoreVersion returns null for out-of-bounds index', () => {
    const { result } = renderHook(() => useVersionHistory());

    act(() => {
      result.current.recordVersion('swot', { v: 1 }, 'only entry');
    });

    expect(result.current.restoreVersion('swot', 5)).toBeNull();
    expect(result.current.restoreVersion('swot', -1)).toBeNull();
  });

  it('getStepHistory returns empty array for unknown step', () => {
    const { result } = renderHook(() => useVersionHistory());
    expect(result.current.getStepHistory('unknown')).toEqual([]);
  });

  it('tracks multiple steps independently', () => {
    const { result } = renderHook(() => useVersionHistory());

    act(() => {
      result.current.recordVersion('swot', { s: 1 }, 'SWOT edit');
    });
    act(() => {
      result.current.recordVersion('bmc', { b: 1 }, 'BMC edit');
    });

    expect(result.current.getStepHistory('swot')).toHaveLength(1);
    expect(result.current.getStepHistory('bmc')).toHaveLength(1);
    expect(result.current.getStepHistory('swot')[0].snapshot).toEqual({ s: 1 });
    expect(result.current.getStepHistory('bmc')[0].snapshot).toEqual({ b: 1 });
  });
});
