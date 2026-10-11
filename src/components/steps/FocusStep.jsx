import SDGChip from "../shared/SDGChip";
import { DRIVER_STYLES } from "../../constants/steps";
import InfoTooltip from "../shared/InfoTooltip";
import { TOOLTIP_CONTENT } from "../../constants/tooltips";

/**
 * FocusStep — Step 2, the first step of the Dilemma Triangle Method.
 *
 * The "Here's how I read your story" card that used to gate this step has moved
 * to the end of Step 1 (feedback p31): sector, audience and stage describe the
 * story, not the People/Planet/Prosperity drivers this step is about.
 */
export default function FocusStep({ data }) {
  if (!data) return null;

  const { focuses } = data;

  return (
    <section className="animate-fade-in" aria-labelledby="focus-step-heading">
      <h2 id="focus-step-heading" className="sr-only">Focus Areas</h2>

      <div style={{ display: "grid", gap: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
            Your Focus Areas
            <InfoTooltip
              content={TOOLTIP_CONTENT["dilemma-triangle"]}
              ariaLabel="Info about Dilemma Triangle"
              position="right"
            />
          </h3>
          {(focuses || []).map((f, i) => {
            const style = DRIVER_STYLES[f.driver] || {};
            return (
              <article key={i} aria-label={`Focus area: ${f.focus}`} className="glass-content-card" style={{
                borderLeft: `4px solid ${style.color}`,
                flexDirection: "column",
                gap: 6,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: style.color,
                  textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 5,
                }}>
                  {f.driver}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 8, marginTop: 0 }}>
                  {f.focus}
                </h4>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 10px", lineHeight: 1.65 }}>
                  {f.rationale}
                </p>
                <div>
                  {(f.sdgs || []).map(s => <SDGChip key={s} label={s} />)}
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
