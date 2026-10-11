import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import SDGMapperStep from "../steps/SDGMapperStep";

/**
 * Accessible modal wrapper for the SDG Mapper.
 * Closes via X button, backdrop click, or Escape key.
 */
export default function SDGMapperModal({
  isOpen,
  onClose,
  alignments = [],
  onStatusChange,
  mappingReady = false,
  mappingLoading = false,
  canUnlockFilter = false,
  mappingError = null,
  mappingWarning = null,
  onRetryMapping,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sdg-mapper-modal-title"
      className="modal-glass-backdrop"
      onClick={onClose}
    >
      <div
        className="modal-glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-glass-panel__header">
          <h2 id="sdg-mapper-modal-title" className="modal-glass-panel__title">
            SDG Alignment Mapper
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="header-pill-btn"
            aria-label="Close SDG Mapper"
            style={{ width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="modal-glass-panel__body">
          <SDGMapperStep
            alignments={alignments}
            onStatusChange={onStatusChange}
            mappingReady={mappingReady}
            mappingLoading={mappingLoading}
            canUnlockFilter={canUnlockFilter}
            mappingError={mappingError}
            mappingWarning={mappingWarning}
            onRetryMapping={onRetryMapping}
          />
        </div>
      </div>
    </div>
  );
}
