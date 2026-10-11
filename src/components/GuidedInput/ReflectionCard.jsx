/**
 * ReflectionCard — "I heard you say" card displaying the AI's summary
 * of what it understood from the user's input, with an edit affordance.
 *
 * Validates: Requirements 4.4
 */

export default function ReflectionCard({ summary, onEdit }) {
  return (
    <div
      role="region"
      aria-label="AI reflection summary"
      style={{
        background: "var(--color-brand-light)",
        borderLeft: "3px solid var(--color-brand-pale)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-md)",
        marginTop: "var(--space-md)",
        marginBottom: "var(--space-md)",
      }}
    >
      <p
        style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--color-brand)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "var(--space-sm)",
        }}
      >
        <span
          aria-hidden="true"
          style={{ color: "var(--color-brand)", marginRight: "4px" }}
        >
          {"\u201C"}
        </span>
        I heard you say:
        <span
          aria-hidden="true"
          style={{ color: "var(--color-brand)", marginLeft: "4px" }}
        >
          {"\u201D"}
        </span>
      </p>

      <p
        style={{
          fontSize: "0.875rem",
          lineHeight: 1.65,
          color: "var(--color-text-primary)",
          marginBottom: "var(--space-md)",
        }}
      >
        {summary}
      </p>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn-ghost"
          onClick={onEdit}
          aria-label="Edit your response"
          style={{ fontSize: "0.8125rem", padding: "6px 14px", marginLeft: "auto" }}
        >
          ✏️ Edit
        </button>
      </div>
    </div>
  );
}
