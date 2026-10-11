import { useEffect, useCallback } from "react";
import { X, Trash2 } from "lucide-react";

/**
 * Lists locally archived business plan sessions with restore and delete actions.
 */
export default function SavedPlansModal({
  isOpen,
  onClose,
  archives = [],
  onRestore,
  onDelete,
}) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-plans-modal-title"
      className="modal-glass-backdrop"
      onClick={onClose}
    >
      <div
        className="modal-glass-panel"
        style={{ maxWidth: 520, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-glass-panel__header">
          <h2 id="saved-plans-modal-title" className="modal-glass-panel__title">
            Saved plans
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="header-pill-btn"
            aria-label="Close saved plans"
            style={{ width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="modal-glass-panel__body">
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
            Restore one to continue where you left off, or delete entries you no longer need.
            {" "}
            <strong>These plans are stored only in this browser on this device.</strong>{" "}
            They are not uploaded anywhere, so clearing your browser data or switching
            device will lose them — export a plan to Word or PowerPoint to keep a
            permanent copy.
          </p>

          {archives.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--color-text-muted)", textAlign: "center", padding: "24px 0" }}>
              No saved plans yet. Finish a plan and choose &ldquo;Save &amp; start new plan&rdquo; to keep a copy here.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {archives.map((entry) => (
                <li
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md, 8px)",
                    border: "1px solid var(--color-border, rgba(0,0,0,0.08))",
                    background: "var(--color-bg, #fff)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {entry.label}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      Saved {formatDate(entry.savedAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: 13, padding: "8px 14px", flexShrink: 0 }}
                    onClick={() => onRestore(entry.id)}
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    aria-label={`Delete saved plan ${entry.label}`}
                    style={{ width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    onClick={() => onDelete(entry.id)}
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
