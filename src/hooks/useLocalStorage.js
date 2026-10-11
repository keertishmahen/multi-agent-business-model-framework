import { useState, useEffect, useCallback, useRef } from 'react';

const DEFAULT_KEY = 'nexus-mia-state';
const DEBOUNCE_DELAY = 300;

function writeToStorage(key, state) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
    return true;
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) {
      console.warn('[useLocalStorage] localStorage quota exceeded. Continuing without persistence.');
    } else {
      console.warn('[useLocalStorage] Failed to write state:', err.message);
    }
    return false;
  }
}

/**
 * Persistence hook that saves/loads workflow state to localStorage
 * with debounced writes (300ms) and provides resume/clearState functions.
 *
 * @param {string} key - localStorage key (default: "nexus-mia-state")
 * @param {object} currentState - the current workflow state to persist
 * @returns {{ savedState: object|null, hasSavedState: boolean, resume: () => object|null, clearState: () => void, flushState: (state: object) => void }}
 */
function useLocalStorage(key = DEFAULT_KEY, currentState) {
  const [savedState, setSavedState] = useState(null);
  const debounceTimer = useRef(null);
  const lastSerializedRef = useRef(null);
  const keyRef = useRef(key);

  // Keep keyRef in sync
  keyRef.current = key;

  const cancelPendingWrite = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  // Load saved state once on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      const stored = window.localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSavedState(parsed);
      }
    } catch (err) {
      // Corrupted/unparseable data — treat as no saved state
      console.warn('[useLocalStorage] Failed to parse saved state:', err.message);
      setSavedState(null);
    }
    // Only run on mount (key is stable by convention)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced write to localStorage whenever currentState changes
  useEffect(() => {
    if (currentState === undefined || currentState === null) return;
    if (typeof window === 'undefined') return;

    let serialized;
    try {
      serialized = JSON.stringify(currentState);
    } catch (err) {
      console.warn('[useLocalStorage] Failed to serialize state:', err.message);
      return;
    }

    if (serialized === lastSerializedRef.current) return;

    cancelPendingWrite();

    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      if (writeToStorage(keyRef.current, currentState)) {
        lastSerializedRef.current = serialized;
      }
    }, DEBOUNCE_DELAY);

    return cancelPendingWrite;
  }, [currentState, cancelPendingWrite]);

  // Cleanup timer on unmount
  useEffect(() => {
    return cancelPendingWrite;
  }, [cancelPendingWrite]);

  const hasSavedState = savedState !== null;

  /**
   * Returns the saved state for the caller to restore.
   */
  const resume = useCallback(() => {
    return savedState;
  }, [savedState]);

  /**
   * Removes the key from localStorage and clears the saved state.
   * Cancels any pending debounced write to prevent stale re-writes.
   */
  const clearState = useCallback(() => {
    cancelPendingWrite();
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(keyRef.current);
    } catch (err) {
      console.warn('[useLocalStorage] Failed to clear state:', err.message);
    }
    setSavedState(null);
    lastSerializedRef.current = null;
  }, [cancelPendingWrite]);

  /**
   * Writes state synchronously (e.g. immediately after reset).
   */
  const flushState = useCallback((state) => {
    if (state === undefined || state === null) return;
    cancelPendingWrite();
    try {
      lastSerializedRef.current = JSON.stringify(state);
    } catch {
      lastSerializedRef.current = null;
    }
    if (writeToStorage(keyRef.current, state)) {
      setSavedState(state);
    }
  }, [cancelPendingWrite]);

  return {
    savedState,
    hasSavedState,
    resume,
    clearState,
    flushState,
  };
}

export default useLocalStorage;
