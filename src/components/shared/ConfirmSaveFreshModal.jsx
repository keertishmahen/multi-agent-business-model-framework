import { useEffect, useCallback } from "react";

/**
 * Confirmation dialog before archiving the current plan and resetting to onboarding.
 */
export default function ConfirmSaveFreshModal({ isOpen, onClose, onConfirm }) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-fresh-dialog-title"
      className="modal-glass-backdrop"
      onClick={onClose}
    >
      <div
        className="modal-glass-panel"
        style={{ maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-glass-panel__body">
          <h2 id="save-fresh-dialog-title" className="modal-glass-panel__title" style={{ marginBottom: 8 }}>
            Start a new plan?
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>
            Your current plan will be saved locally in this browser. You&apos;ll return to Step 1 to begin a new journey.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ padding: "10px 20px", fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onConfirm}
              style={{ padding: "10px 20px", fontSize: 14 }}
            >
              Save &amp; start new plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
