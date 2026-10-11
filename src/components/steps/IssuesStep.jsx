import { useState } from "react";
import { DRIVER_STYLES } from "../../constants/steps";
import DriverBadge from "../shared/DriverBadge";
import SDGChip from "../shared/SDGChip";
export default function IssuesStep({ data }) {
  const [expanded, setExpanded] = useState({});

  if (!data?.issues_by_focus) return null;

  const toggleExpand = (groupIndex, issueIndex) => {
    const key = `${groupIndex}-${issueIndex}`;
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="animate-fade-in" style={{ display: "grid", gap: 28 }}>
      {data.issues_by_focus.map((group, gi) => {
        const style = DRIVER_STYLES[group.driver] || {};
        return (
          <div key={gi}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
            }}>
              <DriverBadge driver={group.driver} />
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                · {group.focus}
              </span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {(group.issues || []).map((iss, ii) => {
                const key = `${gi}-${ii}`;
                const isExpanded = !!expanded[key];

                return (
                  <div key={ii} className="glass-content-card" style={{
                    borderLeft: `3px solid ${style.color}`,
                    flexDirection: "column",
                    gap: 8,
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ fontSize: 11, color: style.color, fontWeight: 700 }}>
                        {ii + 1}.
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", flex: 1,
                      }}>
                        {iss.issue}
                      </span>
                      <button
                        onClick={() => toggleExpand(gi, ii)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Collapse explanation" : "Expand explanation"}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px 6px",
                          borderRadius: "var(--radius-sm, 4px)",
                          color: "var(--color-text-secondary)",
                          fontSize: 14,
                          lineHeight: 1,
                          transition: "transform 0.2s ease, color 0.15s",
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                      >
                        ▶
                      </button>
                    </div>

                    {isExpanded && (
                      <p className="glass-well glass-well--flat" style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                        margin: "8px 0 0 0",
                        lineHeight: 1.6,
                        paddingLeft: 19,
                      }}>
                        {iss.explain}
                      </p>
                    )}

                    {iss.sdgs && iss.sdgs.length > 0 && (
                      <div style={{ marginTop: 8, paddingLeft: 19 }}>
                        {iss.sdgs.map((sdg, si) => {
                          const match = sdg.match(/\d+/);
                          const sdgNumber = match ? parseInt(match[0], 10) : null;
                          return (
                            <SDGChip
                              key={si}
                              label={sdg}
                              sdgNumber={sdgNumber}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
