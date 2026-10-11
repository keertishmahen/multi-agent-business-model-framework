const LEVEL_STYLES = {
  High: {
    color: "var(--color-success)",
    background: "var(--color-success-light)",
  },
  Medium: {
    color: "var(--color-warning)",
    background: "var(--color-warning-light)",
  },
  Inferred: {
    color: "var(--color-warning)",
    background: "var(--color-warning-light)",
  },
  Inference: {
    color: "var(--color-warning)",
    background: "var(--color-warning-light)",
  },
  Low: {
    color: "#6B7280",
    background: "#F3F4F6",
  },
};

export default function EvidenceBadge({ level }) {
  const styles = LEVEL_STYLES[level] || LEVEL_STYLES.Low;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 10px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 600,
        lineHeight: 1.4,
        color: styles.color,
        background: styles.background,
      }}
    >
      {level}
    </span>
  );
}
