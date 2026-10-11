import {
  ARCHIVE_STORAGE_KEY,
  MAX_ARCHIVES,
  deriveArchiveLabel,
  listArchives,
  archiveCurrentSession,
  loadArchive,
  deleteArchive,
  restorePersistableState,
} from "./useSessionArchive";
import { workflowReducer, initialState } from "./useWorkflow";

const sampleState = {
  phase: "workflow",
  currentStep: "plan",
  completedSteps: ["story", "focus", "issues", "tensions", "dilemmas", "values", "swot", "bmc", "plan"],
  outputs: { plan: "# My Plan", swot: { swot: [{ title: "Eco VP" }] } },
  story: "We build eco packaging for SMBs.",
  selectedSwotTitle: "Eco VP",
  guidedInputResponses: { basics: "", problem: "", customers: "" },
  tourCompleted: true,
};

describe("useSessionArchive", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("deriveArchiveLabel", () => {
    it("prefers selected SWOT title", () => {
      expect(deriveArchiveLabel({ selectedSwotTitle: "Eco VP", story: "Other" })).toBe("Eco VP");
    });

    it("falls back to first story line", () => {
      expect(deriveArchiveLabel({ story: "Line one\nLine two" })).toBe("Line one");
    });

    it("uses default label when no title or story", () => {
      expect(deriveArchiveLabel({})).toBe("Saved business plan");
    });
  });

  describe("archiveCurrentSession", () => {
    it("creates an archive entry in localStorage", () => {
      const entry = archiveCurrentSession(sampleState);
      expect(entry).toMatchObject({
        label: "Eco VP",
        persistableState: sampleState,
      });
      expect(entry.id).toMatch(/^archive_/);
      expect(new Date(entry.savedAt).toISOString()).toBe(entry.savedAt);

      const stored = JSON.parse(window.localStorage.getItem(ARCHIVE_STORAGE_KEY));
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe(entry.id);
    });

    it("prepends newest archives and trims to MAX_ARCHIVES", () => {
      for (let i = 0; i < MAX_ARCHIVES + 2; i += 1) {
        archiveCurrentSession({ ...sampleState, story: `Plan ${i}` });
      }
      const archives = listArchives();
      expect(archives).toHaveLength(MAX_ARCHIVES);
      expect(archives[0].persistableState.story).toBe(`Plan ${MAX_ARCHIVES + 1}`);
    });
  });

  describe("listArchives / loadArchive / deleteArchive", () => {
    it("lists archives newest first", () => {
      archiveCurrentSession({ ...sampleState, story: "Older" });
      archiveCurrentSession({ ...sampleState, story: "Newer" });
      const archives = listArchives();
      expect(archives[0].persistableState.story).toBe("Newer");
      expect(archives[1].persistableState.story).toBe("Older");
    });

    it("loads and deletes a single archive", () => {
      const entry = archiveCurrentSession(sampleState);
      expect(loadArchive(entry.id)).toMatchObject({ id: entry.id });
      expect(deleteArchive(entry.id)).toBe(true);
      expect(loadArchive(entry.id)).toBeNull();
      expect(listArchives()).toHaveLength(0);
    });
  });

  describe("restorePersistableState", () => {
    it("restores workflow reducer state from a snapshot", () => {
      const dispatch = jest.fn();
      const setSelectedSwotTitle = jest.fn();
      const setTourCompleted = jest.fn();

      const route = restorePersistableState(sampleState, {
        dispatch,
        setSelectedSwotTitle,
        setTourCompleted,
      });

      expect(route).toEqual({ phase: "workflow", currentStep: "plan" });
      expect(dispatch).toHaveBeenCalledWith({ type: "SET_PHASE", payload: "workflow" });
      expect(dispatch).toHaveBeenCalledWith({ type: "SET_STEP", payload: "plan" });
      expect(dispatch).toHaveBeenCalledWith({ type: "SET_STORY", payload: sampleState.story });
      expect(dispatch).toHaveBeenCalledWith({
        type: "RESTORE_COMPLETED",
        payload: sampleState.completedSteps,
      });
      expect(setSelectedSwotTitle).toHaveBeenCalledWith("Eco VP");
      expect(setTourCompleted).toHaveBeenCalledWith(true);
    });

    it("RESET returns onboarding defaults for save-and-start-fresh flow", () => {
      const dirty = {
        ...initialState,
        phase: "workflow",
        currentStep: "plan",
        completedSteps: ["story", "focus"],
        outputs: { plan: "done" },
        story: "Old story",
      };
      const reset = workflowReducer(dirty, { type: "RESET" });
      expect(reset).toEqual(initialState);
      expect(reset.phase).toBe("onboarding");
    });
  });
});
