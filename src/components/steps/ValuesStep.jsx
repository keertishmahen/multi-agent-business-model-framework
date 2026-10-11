import { useMemo } from "react";
import { DRIVER_STYLES } from "../../constants/steps";
import DriverBadge, { DRIVER_ORDER } from "../shared/DriverBadge";
import InfoTooltip from "../shared/InfoTooltip";
import { TOOLTIP_CONTENT } from "../../constants/tooltips";
import { normalizeDilemmasOutput, sortDilemmasByRank } from "../../utils/dilemmaScore";

const PALETTE = ["People", "Planet", "Prosperity"];

export default function ValuesStep({ data, dilemmasData }) {
  const rankedDilemmas = useMemo(() => {
    const normalized = normalizeDilemmasOutput(dilemmasData);
    return sortDilemmasByRank(normalized?.dilemmas || []);
  }, [dilemmasData]);

  if (!data?.value_propositions?.length) return null;

  return (
    <div className="animate-fade-in" style={{ display: "grid", gap: 18 }}>
      <div className="values-bridge glass-info-card--brand">
        <div className="values-bridge__header">
          <div className="glass-info-card--brand__label">From dilemmas to propositions</div>
          <InfoTooltip content={TOOLTIP_CONTENT["step-values"]} />
        </div>
        <p className="values-bridge__body">
          Your ranked dilemmas are the highest-stakes trade-offs to resolve. Value propositions are
          strategic responses — concrete ways to address those trade-offs while balancing People,
          Planet, and Prosperity.
        </p>
        {data.generation_note && (
          <p className="values-bridge__note">{data.generation_note}</p>
        )}
        {rankedDilemmas.length > 0 && (
          <div className="values-bridge__dilemmas">
            <div className="values-bridge__dilemmas-label">Ranked dilemmas</div>
            <ol className="values-bridge__dilemma-list">
              {rankedDilemmas.map((d, i) => (
                <li key={`${d.title}-${i}`} className="values-bridge__dilemma-item">
                  <span className="values-bridge__rank">{d.rank ?? i + 1}</span>
                  <span>{d.title}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {data.value_propositions.map((v, i) => {
        const primaryDriver = PALETTE[i % 3];
        const style = DRIVER_STYLES[primaryDriver] || {};
        const explanation = v.explain || v.description || "";
        const customerSegment = v.customerSegment || v.customer_segment || "";
        const differentiator = v.differentiator || "";

        return (
          <div key={i} className="glass-content-card" style={{
            borderLeft: `4px solid ${style.color}`,
            flexDirection: "column",
            gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 2 }}>
              <h3 className="glass-content-card__title" style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0 }}>
                {v.title}
                {i === 0 && (
                  <InfoTooltip
                    content={TOOLTIP_CONTENT["value-proposition"]}
                    ariaLabel="Info about Value Proposition"
                    position="right"
                  />
                )}
              </h3>
              <div style={{ display: "flex", gap: 10, flexShrink: 0, marginLeft: 12, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                {DRIVER_ORDER.map((dr) => (
                  <DriverBadge key={dr} driver={dr} emphasis={dr === primaryDriver} />
                ))}
              </div>
            </div>

            {explanation && (
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 14px", lineHeight: 1.65 }}>
                {explanation}
              </p>
            )}

            {customerSegment && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: style.color, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                  Customer Segment
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  {customerSegment}
                </div>
              </div>
            )}

            {differentiator && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: style.color, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                  What Makes It Unique
                </div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                  {differentiator}
                </div>
              </div>
            )}

            {v.benefits?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: style.color, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                  Benefits
                </div>
                {v.benefits.map((b, j) => (
                  <div key={j} style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "flex", gap: 8, marginBottom: 5 }}>
                    <span style={{ color: style.color, flexShrink: 0 }}>✓</span>
                    <span style={{ lineHeight: 1.5 }}>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {v.dilemmas?.length > 0 && (
              <div className="values-bridge__addresses" style={{ color: style.color }}>
                <span className="values-bridge__addresses-label">Addresses:</span>{" "}
                {v.dilemmas.join(" · ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
