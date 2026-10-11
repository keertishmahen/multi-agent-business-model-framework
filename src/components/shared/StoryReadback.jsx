import { useState, useRef } from "react";
import InfoTooltip from "./InfoTooltip";
import { TOOLTIP_CONTENT } from "../../constants/tooltips";

/**
 * StoryReadback — what the system understood from the user's story.
 *
 * This used to live inside Step 2 ("Driver & Focus"), where it was misleading:
 * sector, audience, stage and stakeholders are not drivers or focus areas, they
 * are attributes read out of the story (feedback p31). It now closes Step 1 as a
 * summary the user confirms or corrects, leaving Step 2 to begin the Dilemma
 * Triangle Method cleanly.
 */

const FIELDS = [
  { key: "sector", label: "Sector" },
  { key: "audience", label: "Audience" },
  { key: "sdg_focus", label: "SDG focus", tooltipKey: "sdg" },
  { key: "stage", label: "Stage" },
  { key: "hidden_stakeholder", label: "Stakeholders I noticed" },
];

export default function StoryReadback({ inferences, onConfirm, confirmLabel = "Looks right — continue" }) {
  const [vals, setVals] = useState({ ...inferences });
  const [editingKey, setEditingKey] = useState(null);
  const [editAllMode, setEditAllMode] = useState(false);
  const announcementRef = useRef(null);

  function announce(message) {
    if (!announcementRef.current) return;
    announcementRef.current.textContent = "";
    requestAnimationFrame(() => {
      if (announcementRef.current) announcementRef.current.textContent = message;
    });
  }

  function isEditing(key) {
    return editAllMode || editingKey === key;
  }

  function handleDoneEditing() {
    if (editAllMode) return;
    setEditingKey(null);
  }

  return (
    <form
      aria-label="Review what we understood from your story"
      onSubmit={(e) => e.preventDefault()}
      className="glass-info-card--brand focus-inference-card animate-fade-in"
      style={{ padding: "22px 26px", marginTop: 28 }}
    >
      <div
        ref={announcementRef}
        aria-live="assertive"
        aria-atomic="true"
        role="status"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />

      <h3 className="focus-inference__title">Here&apos;s how we read your story</h3>
      <p className="focus-inference__subtitle">
        Confirm or correct this before we start. Everything that follows builds on it.
      </p>

      {FIELDS.map((f) => (
        <div
          key={f.key}
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr auto",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <label htmlFor={`readback-${f.key}`} className="focus-inference__label">
            {f.label}:
            {f.tooltipKey && TOOLTIP_CONTENT[f.tooltipKey] && (
              <InfoTooltip
                content={TOOLTIP_CONTENT[f.tooltipKey]}
                ariaLabel={`Info about ${f.label}`}
                position="right"
              />
            )}
          </label>

          {isEditing(f.key) ? (
            <input
              id={`readback-${f.key}`}
              aria-label={`Edit ${f.label}`}
              value={vals[f.key] || ""}
              onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
              onBlur={handleDoneEditing}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleDoneEditing();
                  if (!editAllMode) setEditingKey(null);
                }
              }}
              autoFocus={!editAllMode || f.key === "sector"}
              style={{
                fontSize: 13,
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid var(--color-brand-pale)",
              }}
            />
          ) : (
            <span
              id={`readback-${f.key}`}
              style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              {vals[f.key] || "—"}
            </span>
          )}

          {!editAllMode && (
            <button
              type="button"
              aria-label={`Edit ${f.label.toLowerCase()}`}
              onClick={() => {
                setEditingKey(editingKey === f.key ? null : f.key);
                if (editingKey !== f.key) announce(`Editing ${f.label}`);
              }}
              className="focus-inference__edit-btn"
            >
              {editingKey === f.key ? "done" : "edit"}
            </button>
          )}
        </div>
      ))}

      <div className="focus-inference__actions" style={{ display: "flex", gap: 12, marginTop: 22 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            announce("Story confirmed. Moving to Driver and Focus.");
            onConfirm(vals);
          }}
          style={{ flex: 1, justifyContent: "center" }}
        >
          ✓ {confirmLabel}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setEditAllMode(true);
            announce("Editing mode activated for all fields.");
          }}
        >
          Something&apos;s off — let me correct
        </button>
      </div>
    </form>
  );
}
