import { useState, useCallback } from 'react';

/**
 * Per-step version tracking hook.
 * Maintains an append-only history of snapshots keyed by step ID.
 * Each entry stores a deep-cloned snapshot, ISO 8601 timestamp, and description.
 *
 * Validates: Requirements 9.3 (record every edit with timestamp and previous value)
 *            Requirements 9.4 (chronological list of edits with "Restore Version" option)
 */
function useVersionHistory() {
  const [history, setHistory] = useState({});

  /**
   * Appends a new version entry for a step.
   * Deep-clones the snapshot to prevent mutation.
   * Auto-sets timestamp to current ISO 8601.
   * Guarantees timestamp >= previous entry's timestamp.
   */
  const recordVersion = useCallback((stepId, snapshot, description) => {
    const clonedSnapshot = JSON.parse(JSON.stringify(snapshot));
    const now = new Date().toISOString();

    setHistory((prev) => {
      const stepHistory = prev[stepId] || [];
      // Ensure monotonic timestamps — at least as large as the last entry
      let timestamp = now;
      if (stepHistory.length > 0) {
        const lastTimestamp = stepHistory[stepHistory.length - 1].timestamp;
        if (timestamp < lastTimestamp) {
          timestamp = lastTimestamp;
        }
      }

      const entry = {
        timestamp,
        snapshot: clonedSnapshot,
        changeDescription: description,
      };

      return {
        ...prev,
        [stepId]: [...stepHistory, entry],
      };
    });
  }, []);

  /**
   * Returns the snapshot at the given index for the specified step.
   * The caller is responsible for applying it.
   * Returns null if the step or index does not exist.
   */
  const restoreVersion = useCallback(
    (stepId, index) => {
      const stepHistory = history[stepId];
      if (!stepHistory || index < 0 || index >= stepHistory.length) {
        return null;
      }
      // Return a deep clone to prevent mutation of stored history
      return JSON.parse(JSON.stringify(stepHistory[index].snapshot));
    },
    [history]
  );

  /**
   * Returns the version array for a specific step (or empty array if none).
   */
  const getStepHistory = useCallback(
    (stepId) => {
      return history[stepId] || [];
    },
    [history]
  );

  return {
    history,
    recordVersion,
    restoreVersion,
    getStepHistory,
  };
}

export default useVersionHistory;
