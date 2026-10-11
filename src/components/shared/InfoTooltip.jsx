import { useState, useRef, useEffect, useId, useCallback } from "react";

/**
 * InfoTooltip — reusable (i) icon button with accessible popover tooltip.
 * Displays a plain-language explanation when triggered by click.
 * Supports keyboard dismiss (Escape), outside-click dismiss, configurable position,
 * and full screen-reader accessibility via aria attributes.
 *
 * @param {string} content - Plain-language explanation text
 * @param {string} [ariaLabel] - Accessible label for the trigger button
 * @param {'top'|'bottom'|'left'|'right'} [position='top'] - Popover position relative to trigger
 */
export default function InfoTooltip({ content, ariaLabel, position = "top" }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Escape key dismiss
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  // Outside-click dismiss
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggle() {
    setOpen((prev) => !prev);
  }

  const positionStyles = getPositionStyles(position);

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={ariaLabel || "More information"}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          minWidth: 20,
          minHeight: 20,
          padding: 0,
          border: "1.5px solid var(--color-border-mid)",
          borderRadius: "50%",
          background: open ? "var(--color-brand-light)" : "var(--color-surface)",
          color: open ? "var(--color-brand)" : "var(--color-text-muted)",
          cursor: "pointer",
          fontSize: "0.7rem",
          fontWeight: 700,
          lineHeight: 1,
          transition: "background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)",
        }}
      >
        i
      </button>

      {open && (
        <span
          ref={popoverRef}
          id={tooltipId}
          role="tooltip"
          style={{
            position: "absolute",
            ...positionStyles,
            background: "var(--color-surface)",
            boxShadow: "var(--shadow-md)",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            maxWidth: 260,
            fontSize: "0.8rem",
            lineHeight: 1.5,
            color: "var(--color-text-primary)",
            whiteSpace: "normal",
            zIndex: "var(--z-tooltip)",
            animation: "fadeIn 0.15s ease",
            border: "1px solid var(--color-border)",
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/**
 * Returns absolute positioning styles for the popover based on desired position.
 */
function getPositionStyles(position) {
  switch (position) {
    case "bottom":
      return {
        top: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
      };
    case "left":
      return {
        right: "calc(100% + 8px)",
        top: "50%",
        transform: "translateY(-50%)",
      };
    case "right":
      return {
        left: "calc(100% + 8px)",
        top: "50%",
        transform: "translateY(-50%)",
      };
    case "top":
    default:
      return {
        bottom: "calc(100% + 8px)",
        left: "50%",
        transform: "translateX(-50%)",
      };
  }
}
