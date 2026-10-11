import { useState, useMemo, useEffect, useCallback } from "react";
import { ChevronDown, GripVertical } from "lucide-react";
import SDGChip from "../shared/SDGChip";
import InfoTooltip from "../shared/InfoTooltip";
import { TOOLTIP_CONTENT } from "../../constants/tooltips";
import {
  normalizeDilemmasOutput,
  sortDilemmasByRank,
  applyRanksFromOrder,
  getLegacyRankingRationale,
} from "../../utils/dilemmaScore";

const METRIC_TOOLTIPS = {
  severity: "How serious the consequences are if this trade-off is ignored (1 = minor, 4 = catastrophic).",
  reversibility: "How hard it is to undo the decision once made (1 = easy to reverse, 4 = very hard).",
  reach: "How many stakeholders or systems are affected (1 = narrow, 4 = organisation-wide or beyond).",
};

const DRIVER_EXPLANATIONS = {
  People: "Social impact — how this affects communities, employees, or end-users.",
  Planet: "Environmental impact — how this relates to sustainability and ecological concerns.",
  Prosperity: "Economic viability — how this relates to financial sustainability and growth.",
};

function reorderList(list, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex == null || toIndex == null) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function DilemmasStep({
  data,
  onReorder,
}) {
  const [expandedCards, setExpandedCards] = useState({});
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const normalized = useMemo(() => normalizeDilemmasOutput(data), [data]);
  const sorted = useMemo(
    () => sortDilemmasByRank(normalized?.dilemmas || []),
    [normalized]
  );

  const [ordered, setOrdered] = useState(sorted);

  useEffect(() => {
    setOrdered(sorted);
  }, [sorted]);

  const commitReorder = useCallback(
    (nextList) => {
      const ranked = applyRanksFromOrder(nextList);
      setOrdered(ranked);
      onReorder?.(ranked);
    },
    [onReorder]
  );

  if (!sorted.length) return null;

  const total = ordered.length;

  const toggleExpand = (idx) => {
    setExpandedCards((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleDrop = (toIndex) => {
    if (dragIndex == null) return;
    const next = reorderList(ordered, dragIndex, toIndex);
    setDragIndex(null);
    setDragOverIndex(null);
    commitReorder(next);
  };

  return (
    <div className="animate-fade-in">
      <div className="dilemmas-intro glass-info-card--brand">
        <div className="dilemmas-intro__header">
          <div className="glass-info-card--brand__label">What you are reviewing</div>
          <InfoTooltip content={TOOLTIP_CONTENT["step-dilemmas"]} />
        </div>
        <p className="dilemmas-intro__body">
          These are the highest-stakes trade-offs from your tension matrix — ranked so you know which
          People · Planet · Prosperity conflicts to resolve first. Each card shows why it was ranked
          there, supporting metrics, and linked SDGs. Drag the handle to reorder if you disagree
          with the AI prioritisation.
        </p>
      </div>

      <div className="dilemmas-list" style={{ display: "grid", gap: 14 }}>
        {ordered.map((d, i) => {
          const isExpanded = expandedCards[i];
          const rank = d.rank ?? i + 1;
          const isHigh = i === 0;
          const rationale =
            d.ranking_rationale || getLegacyRankingRationale(d);
          const isDragging = dragIndex === i;
          const isDragOver = dragOverIndex === i && dragIndex !== i;

          return (
            <div
              key={`${d.title}-${i}`}
              className={`glass-content-card dilemma-card${isDragging ? " dilemma-card--dragging" : ""}${isDragOver ? " dilemma-card--drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(i);
              }}
              onDragLeave={() => {
                if (dragOverIndex === i) setDragOverIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(i);
              }}
              aria-label={`Rank ${rank} of ${total}. ${d.title}. Drag handle to reorder.`}
            >
              <button
                type="button"
                className="dilemma-card__handle"
                draggable
                aria-label={`Drag to reorder ${d.title}`}
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
              >
                <GripVertical size={16} />
              </button>

              <div className={`glass-score-tile ${isHigh ? "glass-score-tile--high" : "glass-score-tile--low"}`}>
                {rank}
              </div>

              <div className="glass-content-card__body">
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}
                >
                  <h3 className="glass-content-card__title" style={{ margin: 0, flex: 1 }}>
                    {d.title}
                  </h3>
                  <button
                    type="button"
                    className="dilemma-card__expand-btn"
                    onClick={() => toggleExpand(i)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "Collapse details" : "Expand details"}
                  >
                    <ChevronDown
                      size={14}
                      color="var(--color-text-muted)"
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </button>
                </div>

                <p className="glass-content-card__desc">{d.description}</p>

                <div className="glass-well glass-well--flat dilemma-card__rationale">
                  <div className="dilemma-card__rationale-label">Why this rank?</div>
                  <p className="dilemma-card__rationale-text">{rationale}</p>
                </div>

                <div className="glass-content-card__meta">
                  <span className="glass-meta-chip" title={METRIC_TOOLTIPS.severity}>
                    Severity {d.severity}
                  </span>
                  <span className="glass-meta-chip" title={METRIC_TOOLTIPS.reversibility}>
                    Reversibility {d.reversibility}
                  </span>
                  <span className="glass-meta-chip" title={METRIC_TOOLTIPS.reach}>
                    Reach {d.reach}
                  </span>
                  {d.drivers?.map((driver) => (
                    <span key={driver} className="glass-meta-chip" title={DRIVER_EXPLANATIONS[driver]}>
                      {driver}
                    </span>
                  ))}
                </div>

                {d.sdgs?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {d.sdgs.map((sdgLabel) => (
                      <SDGChip key={sdgLabel} label={sdgLabel} />
                    ))}
                  </div>
                )}

                {isExpanded && (
                  <div className="glass-well glass-well--flat" style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 8 }}>
                      Supporting metrics
                    </div>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.55 }}>
                      Severity {d.severity}/4 · Reversibility {d.reversibility}/4 · Reach {d.reach}/4.
                      These dimensions informed the ranking rationale above — they are evidence, not the final rank itself.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
