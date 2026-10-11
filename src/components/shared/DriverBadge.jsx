export const DRIVER_ORDER = ["People", "Planet", "Prosperity"];

const DRIVER_STYLES = {
  People: {
    color: "var(--color-people)",
    background: "var(--color-people-light)",
  },
  Planet: {
    color: "var(--color-planet)",
    background: "var(--color-planet-light)",
  },
  Prosperity: {
    color: "var(--color-prosperity)",
    background: "var(--color-prosperity-light)",
  },
};

export default function DriverBadge({ driver, emphasis = true }) {
  const styles = DRIVER_STYLES[driver] || DRIVER_STYLES.People;

  if (!emphasis) {
    return (
      <span
        style={{
          display: "inline-block",
          fontSize: "0.75rem",
          fontWeight: 400,
          color: "var(--color-text-muted)",
          lineHeight: 1.4,
          whiteSpace: "nowrap",
        }}
      >
        {driver}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: "var(--radius-xl)",
        fontSize: "0.75rem",
        fontWeight: 500,
        color: styles.color,
        background: styles.background,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        cursor: "default",
        userSelect: "none",
      }}
    >
      {driver}
    </span>
  );
}
