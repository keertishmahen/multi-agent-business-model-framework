/**
 * Session archive persistence — saves completed workflow snapshots to localStorage.
 * Active session (`nexus-mia-state`) is separate; archiving is append-only until reset.
 */

export const ARCHIVE_STORAGE_KEY = "nexus-mia-archives";
// Raised from 5 after feedback p34: people were silently losing older plans.
// Still bounded because localStorage has a ~5MB per-origin quota and each
// archive carries every step's output.
export const MAX_ARCHIVES = 25;

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readRawArchives() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
  const parsed = raw ? safeParse(raw) : null;
  return Array.isArray(parsed) ? parsed : [];
}

function writeArchives(archives) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archives));
    return true;
  } catch (err) {
    if (err.name === "QuotaExceededError" || err.code === 22 || err.code === 1014) {
      console.warn("[useSessionArchive] localStorage quota exceeded.");
    } else {
      console.warn("[useSessionArchive] Failed to write archives:", err.message);
    }
    return false;
  }
}

/**
 * Human-readable label for an archived session.
 */
export function deriveArchiveLabel(persistableState) {
  const vpTitle = persistableState?.selectedSwotTitle?.trim();
  if (vpTitle) return vpTitle;

  const story = persistableState?.story?.trim();
  if (story) {
    const firstLine = story.split(/\r?\n/)[0].trim();
    if (firstLine) {
      return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
    }
  }

  return "Saved business plan";
}

/**
 * Returns archived sessions, newest first.
 */
export function listArchives() {
  return readRawArchives()
    .filter((entry) => entry && entry.id && entry.persistableState)
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

/**
 * Append a snapshot of the current session. Returns the new archive entry or null on failure.
 */
export function archiveCurrentSession(persistableState) {
  if (!persistableState) return null;

  const entry = {
    id: `archive_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    label: deriveArchiveLabel(persistableState),
    persistableState: JSON.parse(JSON.stringify(persistableState)),
  };

  const next = [entry, ...readRawArchives()].slice(0, MAX_ARCHIVES);
  if (!writeArchives(next)) return null;
  return entry;
}

/**
 * Load a single archive by id.
 */
export function loadArchive(id) {
  if (!id) return null;
  return listArchives().find((entry) => entry.id === id) || null;
}

/**
 * Remove an archive by id. Returns true if an entry was removed.
 */
export function deleteArchive(id) {
  if (!id) return false;
  const current = readRawArchives();
  const next = current.filter((entry) => entry.id !== id);
  if (next.length === current.length) return false;
  return writeArchives(next);
}

/**
 * Restore a persistable snapshot into the workflow reducer (same shape as resume).
 */
export function restorePersistableState(saved, { dispatch, setSelectedSwotTitle, setTourCompleted, setTone }) {
  if (!saved || !dispatch) return null;

  if (saved.phase) dispatch({ type: "SET_PHASE", payload: saved.phase });
  if (saved.currentStep) dispatch({ type: "SET_STEP", payload: saved.currentStep });
  if (saved.story) dispatch({ type: "SET_STORY", payload: saved.story });

  if (saved.outputs) {
    Object.entries(saved.outputs).forEach(([stepId, data]) => {
      if (data) dispatch({ type: "SET_OUTPUT", payload: { stepId, data } });
    });
  }

  if (saved.completedSteps?.length > 0) {
    dispatch({ type: "RESTORE_COMPLETED", payload: saved.completedSteps });
  }

  if (saved.selectedSwotTitle) {
    setSelectedSwotTitle?.(saved.selectedSwotTitle);
  } else {
    setSelectedSwotTitle?.("");
  }

  if (saved.tourCompleted) {
    setTourCompleted?.(true);
  }

  if (saved.tone) {
    setTone?.(saved.tone);
  }

  const phase = saved.phase || "onboarding";
  const currentStep = saved.currentStep || "story";
  return { phase, currentStep };
}

const sessionArchiveApi = {
  ARCHIVE_STORAGE_KEY,
  MAX_ARCHIVES,
  deriveArchiveLabel,
  listArchives,
  archiveCurrentSession,
  loadArchive,
  deleteArchive,
  restorePersistableState,
};

export default sessionArchiveApi;
