// ──────────────────────────────────────────────────────────────────
//  StorySummary Component
//  Displays guided input responses organized by categories with
//  confirm and edit actions.
// ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "basics", label: "Business Basics" },
  { key: "problem", label: "Problem and Solution" },
  { key: "customers", label: "Target Customers" },
];

// ──────────────────────────────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────────────────────────────
const styles = {
  card: {
    border: "1px solid var(--color-border, rgba(0,0,0,0.08))",
    borderRadius: "var(--radius-md, 12px)",
    padding: "var(--space-lg, 24px)",
    background: "var(--color-surface, #FFFFFF)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-md, 16px)",
  },
  heading: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "var(--color-text-primary, #1A1A18)",
    margin: 0,
    marginBottom: "var(--space-xs, 4px)",
  },
  description: {
    fontSize: "0.8125rem",
    color: "var(--color-text-secondary, #5C5C58)",
    margin: 0,
    marginBottom: "var(--space-sm, 8px)",
  },
  section: {
    border: "1px solid var(--color-border, rgba(0,0,0,0.08))",
    borderRadius: "var(--radius-md, 10px)",
    padding: "var(--space-md, 16px)",
    background: "var(--color-surface, #FFFFFF)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "var(--space-sm, 8px)",
  },
  sectionTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--color-text-primary, #1A1A18)",
    margin: 0,
  },
  editButton: {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "var(--color-brand, var(--color-brand))",
    background: "transparent",
    border: "none",
    borderRadius: "var(--radius-sm, 6px)",
    padding: "4px 10px",
    cursor: "pointer",
    transition: "var(--transition-fast, 0.15s ease)",
  },
  sectionContent: {
    fontSize: "0.875rem",
    lineHeight: 1.6,
    color: "var(--color-text-primary, #1A1A18)",
    whiteSpace: "pre-wrap",
    margin: 0,
  },
  emptyContent: {
    fontSize: "0.875rem",
    color: "var(--color-text-muted, #9A9A94)",
    fontStyle: "italic",
    margin: 0,
  },
  confirmButton: {
    width: "100%",
    padding: "14px 24px",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#FFFFFF",
    background: "var(--color-brand-mid, var(--color-brand-mid))",
    border: "none",
    borderRadius: "var(--radius-md, 10px)",
    cursor: "pointer",
    marginTop: "var(--space-sm, 8px)",
    transition: "var(--transition-fast, 0.15s ease)",
  },
};

// ──────────────────────────────────────────────────────────────────
//  Component
// ──────────────────────────────────────────────────────────────────
/**
 * Displays a structured summary of guided input responses organized
 * by three categories: Business Basics, Problem and Solution, and
 * Target Customers. Provides Confirm and Edit actions.
 *
 * @param {{ basics: string, problem: string, customers: string }} responses
 * @param {function} onConfirm - Called when the user confirms the summary
 * @param {function} onEdit - Called with phaseKey ("basics" | "problem" | "customers")
 */
export default function StorySummary({ responses, onConfirm, onEdit }) {
  return (
    <div style={styles.card} role="region" aria-label="Story summary">
      <h2 style={styles.heading}>Here's what we heard</h2>
      <p style={styles.description}>
        Review your responses below. If everything looks good, confirm to continue.
      </p>

      {CATEGORIES.map(({ key, label }) => {
        const content = responses[key]?.trim();
        const isEmpty = !content;

        return (
          <div key={key} style={styles.section} aria-label={`${label} section`}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>{label}</h3>
              <button
                style={styles.editButton}
                onClick={() => onEdit(key)}
                aria-label={`Edit ${label}`}
              >
                Edit
              </button>
            </div>
            {isEmpty ? (
              <p style={styles.emptyContent}>No content provided for this section.</p>
            ) : (
              <p style={styles.sectionContent}>{content}</p>
            )}
          </div>
        );
      })}

      <button
        style={styles.confirmButton}
        onClick={onConfirm}
        aria-label="Confirm story summary"
      >
        Confirm
      </button>
    </div>
  );
}
