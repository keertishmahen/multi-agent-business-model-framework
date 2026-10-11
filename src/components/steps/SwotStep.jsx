import { useState, useCallback, useEffect } from "react";
import { Shield, Link2, TrendingUp, AlertTriangle, Check, Sparkles } from "lucide-react";
import InfoTooltip from "../shared/InfoTooltip";
import { TOOLTIP_CONTENT } from "../../constants/tooltips";

const SWOT_CONFIG = {
  S: { label: "Strengths", key: "strengths", bg: "#EAF3DE", border: "#C0DD97", text: "#27500A", Icon: Shield },
  W: { label: "Weaknesses", key: "weaknesses", bg: "#FCEBEB", border: "#F7C1C1", text: "#A32D2D", Icon: Link2 },
  O: { label: "Opportunities", key: "opportunities", bg: "#E6F1FB", border: "#B5D4F4", text: "#185FA5", Icon: TrendingUp },
  T: { label: "Threats", key: "threats", bg: "#FAEEDA", border: "#FAC775", text: "#633806", Icon: AlertTriangle },
};

const QUADRANT_KEYS = ["S", "W", "O", "T"];

/**
 * SwotStep — side-by-side VP comparison with AI recommendation and editable detail grid.
 */
export default function SwotStep({
  data,
  selectedTitle,
  onSelect,
  onEdit,
  recordVersion,
}) {
  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState("");

  const swotEntries = data?.swot || [];
  const recommendedTitle = data?.recommended_title || swotEntries[0]?.title || "";
  const recommendationRationale =
    data?.recommendation_rationale ||
    "Review each value proposition below and select the one you want to build your business model around.";

  const activeTitle = selectedTitle || recommendedTitle;
  const swotOutput = normalizeSwotData(data, activeTitle);

  const [localItems, setLocalItems] = useState(() => swotOutput);

  useEffect(() => {
    setLocalItems(swotOutput);
    setEditingItem(null);
    setEditText("");
  }, [swotOutput]);

  const emitEdit = useCallback(
    (updatedLocalItems) => {
      if (!onEdit) return;
      onEdit(updatedLocalItems, activeTitle);
    },
    [onEdit, activeTitle]
  );

  const handleEdit = useCallback(
    (quadrant, id, newText) => {
      const oldItem = localItems[quadrant].find((item) => item.id === id);
      const oldText = oldItem?.text || "";

      setLocalItems((prev) => {
        const updated = {
          ...prev,
          [quadrant]: prev[quadrant].map((item) =>
            item.id === id ? { ...item, text: newText } : item
          ),
        };
        if (recordVersion) {
          recordVersion("swot", prev, `Renamed "${oldText}" → "${newText}" in ${quadrant}`);
        }
        emitEdit(updated);
        return updated;
      });
      setEditingItem(null);
      setEditText("");
    },
    [localItems, recordVersion, emitEdit]
  );

  const handleDelete = useCallback(
    (quadrant, id) => {
      const oldItem = localItems[quadrant].find((item) => item.id === id);
      setLocalItems((prev) => {
        const updated = {
          ...prev,
          [quadrant]: prev[quadrant].filter((item) => item.id !== id),
        };
        if (recordVersion) {
          recordVersion("swot", prev, `Deleted "${oldItem?.text}" from ${quadrant}`);
        }
        emitEdit(updated);
        return updated;
      });
      setEditingItem(null);
      setEditText("");
    },
    [localItems, recordVersion, emitEdit]
  );

  const handleAdd = useCallback(
    (quadrant) => {
      const newId = `${quadrant}-${Date.now()}`;
      setLocalItems((prev) => {
        const updated = {
          ...prev,
          [quadrant]: [...prev[quadrant], { id: newId, text: "New item" }],
        };
        if (recordVersion) {
          recordVersion("swot", prev, `Added new item to ${quadrant}`);
        }
        emitEdit(updated);
        return updated;
      });
      setEditingItem({ quadrant, id: newId });
      setEditText("New item");
    },
    [recordVersion, emitEdit]
  );

  if (!swotEntries.length && !hasSwotOutputShape(data)) return null;

  const userOverrode =
    selectedTitle && recommendedTitle && selectedTitle !== recommendedTitle;

  // Rendered below the selected value proposition's editable SWOT, not above it
  // (feedback p34, item 2: show the choice and its SWOT first, then compare).
  const comparisonSection = swotEntries.length > 1 && (
    <div className="swot-compare-wrap">
      <h4 className="swot-compare-wrap__title">All value propositions compared</h4>
      <div
        className="swot-compare-grid"
        role="table"
        aria-label="SWOT comparison across value propositions"
        style={{ "--swot-cols": swotEntries.length }}
      >
        <div className="swot-compare-row swot-compare-row--header" role="row">
          <div className="swot-compare-row-label" role="columnheader" />
          {swotEntries.map((entry, i) => (
            <div
              key={entry.title || i}
              className={`swot-compare-col${entry.title === recommendedTitle ? " swot-compare-col--recommended" : ""}`}
              role="columnheader"
            >
              {entry.title}
              {entry.title === recommendedTitle && (
                <span className="swot-compare-col__badge">Recommended</span>
              )}
            </div>
          ))}
        </div>

        {QUADRANT_KEYS.map((k) => {
          const cfg = SWOT_CONFIG[k];
          const { Icon } = cfg;
          return (
            <div key={k} className="swot-compare-row" role="row">
              <div className="swot-compare-row-label" role="rowheader">
                <span
                  className="swot-compare-row-label__icon"
                  style={{ background: `${cfg.border}33`, color: cfg.text }}
                  aria-hidden="true"
                >
                  <Icon size={14} strokeWidth={2} />
                </span>
                {cfg.label}
              </div>
              {swotEntries.map((entry, i) => (
                <div
                  key={`${entry.title}-${k}-${i}`}
                  className="swot-compare-cell"
                  role="cell"
                  style={{ borderLeftColor: cfg.border }}
                >
                  <ul className="swot-compare-list">
                    {(entry[k] || []).map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="swot-step__intro">
        <p className="swot-step__subtitle">
          Review the recommendation, choose your value proposition and refine its SWOT — then compare it against the alternatives below
          <InfoTooltip
            content={TOOLTIP_CONTENT["step-swot"]}
            ariaLabel="Info about SWOT Analysis"
            position="right"
          />
        </p>
      </div>

      {recommendedTitle && (
        <div className="swot-recommendation glass-info-card--brand">
          <div className="swot-recommendation__header">
            <Sparkles size={16} aria-hidden="true" />
            <span className="glass-info-card--brand__label">AI recommendation</span>
          </div>
          <div className="swot-recommendation__title">{recommendedTitle}</div>
          <p className="swot-recommendation__rationale">{recommendationRationale}</p>
        </div>
      )}

      {swotEntries.length > 0 && (
        <div className="swot-choice-row">
          <label className="swot-choice-row__label">Your choice</label>
          <div className="swot-vp-tabs" role="radiogroup" aria-label="Select value proposition">
            {swotEntries.map((s, i) => {
              const isSelected = activeTitle === s.title;
              const isRecommended = s.title === recommendedTitle;
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`swot-vp-tab${isSelected ? " swot-vp-tab--active" : ""}${isRecommended ? " swot-vp-tab--recommended" : ""}`}
                  onClick={() => onSelect(s.title)}
                >
                  {isSelected && <Check size={12} style={{ marginRight: 4, verticalAlign: -2 }} />}
                  {s.title}
                </button>
              );
            })}
          </div>
          {userOverrode && (
            <p className="swot-choice-row__override">
              You chose <strong>{selectedTitle}</strong> — the AI recommended{" "}
              <strong>{recommendedTitle}</strong>.
            </p>
          )}
        </div>
      )}

      {activeTitle && (
        <div className="swot-detail-section">
          <h4 className="swot-detail-section__title">
            Edit SWOT for: {activeTitle}
          </h4>
          <p className="swot-detail-section__hint">Click any item to edit inline</p>

          <div className="swot-grid">
            {QUADRANT_KEYS.map((k) => {
              const cfg = SWOT_CONFIG[k];
              const { Icon } = cfg;
              const quadrant = cfg.key;
              const items = localItems[quadrant] || [];

              return (
                <div key={k} className={`swot-quadrant swot-quadrant--${k}`}>
                  <div className="swot-quadrant__header">
                    <span
                      className="swot-quadrant__icon"
                      style={{ background: `${cfg.border}33`, color: cfg.text }}
                      aria-hidden="true"
                    >
                      <Icon size={16} strokeWidth={2} />
                    </span>
                    <span className="swot-quadrant__label">{cfg.label}</span>
                  </div>

                  <div className="swot-quadrant__items">
                    {items.map((item) => {
                      const isEditing =
                        editingItem?.quadrant === quadrant && editingItem?.id === item.id;

                      if (isEditing) {
                        return (
                          <div key={item.id} className="swot-item__edit-row">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEdit(quadrant, item.id, editText);
                                if (e.key === "Escape") {
                                  setEditingItem(null);
                                  setEditText("");
                                }
                              }}
                              autoFocus
                              className="swot-item__input"
                              style={{ border: `1px solid ${cfg.border}` }}
                              aria-label={`Edit ${cfg.label} item`}
                            />
                            <button
                              onClick={() => handleEdit(quadrant, item.id, editText)}
                              className="swot-item__btn swot-item__btn--save"
                              style={{ background: cfg.border, color: cfg.text }}
                              aria-label="Save edit"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleDelete(quadrant, item.id)}
                              className="swot-item__btn swot-item__btn--delete"
                              aria-label="Delete item"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setEditingItem({ quadrant, id: item.id });
                            setEditText(item.text);
                          }}
                          className="swot-item"
                          style={{ color: cfg.text }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setEditingItem({ quadrant, id: item.id });
                              setEditText(item.text);
                            }
                          }}
                          aria-label={`Edit: ${item.text}`}
                        >
                          <span style={{ flexShrink: 0 }}>•</span>
                          <span>{item.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleAdd(quadrant)}
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      padding: "4px 10px",
                      background: "transparent",
                      border: `1px dashed ${cfg.border}`,
                      borderRadius: 4,
                      color: cfg.text,
                      cursor: "pointer",
                      fontWeight: 500,
                      width: "100%",
                      textAlign: "center",
                    }}
                    aria-label={`Add item to ${cfg.label}`}
                  >
                    + Add item
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {comparisonSection}
    </div>
  );
}

function normalizeSwotData(data, selectedTitle) {
  const empty = { strengths: [], weaknesses: [], opportunities: [], threats: [] };

  if (hasSwotOutputShape(data)) {
    return {
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      opportunities: data.opportunities || [],
      threats: data.threats || [],
    };
  }

  if (!data?.swot?.length) return empty;

  const entry = selectedTitle
    ? data.swot.find((s) => s.title === selectedTitle) || data.swot[0]
    : data.swot[0];

  return {
    strengths: (entry.S || []).map((text, i) => ({ id: `s-${i}`, text })),
    weaknesses: (entry.W || []).map((text, i) => ({ id: `w-${i}`, text })),
    opportunities: (entry.O || []).map((text, i) => ({ id: `o-${i}`, text })),
    threats: (entry.T || []).map((text, i) => ({ id: `t-${i}`, text })),
  };
}

function hasSwotOutputShape(data) {
  return (
    data &&
    (Array.isArray(data.strengths) ||
      Array.isArray(data.weaknesses) ||
      Array.isArray(data.opportunities) ||
      Array.isArray(data.threats))
  );
}
