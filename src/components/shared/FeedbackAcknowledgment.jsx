/**
 * FeedbackAcknowledgment — dismissible banner displaying a plain-language
 * description of changes made after a user refinement.
 * Positioned above output content to acknowledge the system responded to user input.
 *
 * Props:
 *   message   (string)    — plain-language description of changes applied
 *   onDismiss (function)  — callback when the user dismisses the banner
 */
export default function FeedbackAcknowledgment({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Feedback acknowledgment"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md, 12px)",
        padding: "12px 16px",
        background: "#E8F5E9",
        border: "1px solid #A5D6A7",
        borderRadius: "var(--radius-md, 8px)",
        marginBottom: "var(--space-md, 16px)",
        animation: "fadeIn 0.25s ease both",
      }}
    >
      {/* Check icon */}
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "var(--color-brand-mid, #0F8B63)",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ✓
      </span>

      {/* Change description message */}
      <p
        style={{
          flex: 1,
          fontSize: "0.875rem",
          color: "var(--color-text-primary, #1a1a1a)",
          fontWeight: 500,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss feedback acknowledgment"
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "none",
          background: "transparent",
          color: "var(--color-text-secondary, #555)",
          fontSize: "1rem",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0,0,0,0.06)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        ✕
      </button>
    </div>
  );
}
