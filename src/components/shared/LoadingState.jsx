import { useEffect, useState } from "react";

/**
 * LoadingState — accessible loading indicator with contextual messages
 * and reduced-motion support.
 *
 * @param {string} [label] - Custom loading label (overrides stepName-based label)
 * @param {string} [stepName] - Step context name for "Generating {stepName}…" message
 */
export default function LoadingState({ label, stepName }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const displayLabel = label || (stepName ? `Generating ${stepName}…` : "Generating…");

  return (
    <div
      role="status"
      aria-live="polite"
      className="loading-glass-card"
    >
      {prefersReducedMotion ? (
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            margin: "0 auto 20px",
            fontSize: 32,
            lineHeight: "40px",
          }}
        >
          ⏳
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="animate-spin"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "3px solid var(--color-brand-light)",
            borderTop: "3px solid var(--color-brand)",
            margin: "0 auto 20px",
          }}
        />
      )}
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 500 }}>
        {displayLabel}
      </p>
      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
        This usually takes 10–30 seconds
      </p>
    </div>
  );
}
