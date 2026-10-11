import { useState, useMemo, useEffect } from "react";
import { SDG_DEFINITIONS } from "../../constants/sdgs";
import { formatAgentText } from "../../utils/agentText";
import InfoTooltip from "../shared/InfoTooltip";
import { TOOLTIP_CONTENT } from "../../constants/tooltips";

/**
 * SDGMapperStep — Displays all 17 SDGs with alignment status, anti-greenwashing
 * safeguards, and a local relevance filter.
 */

const STATUS_CONFIG = {
  strong: {
    symbol: "✓",
    label: "Strong evidence",
    rationale: "Concrete, verifiable link to this SDG in your plan",
    color: "#22c55e",
    bg: "#22c55e",
    tooltipKey: "sdg-status-strong",
  },
  inferred: {
    symbol: "~",
    label: "Inferred",
    rationale: "Plausible connection — review before claiming",
    color: "#eab308",
    bg: "#eab308",
    tooltipKey: "sdg-status-inferred",
  },
  undecided: {
    symbol: "?",
    label: "You decide",
    rationale: "Not directly addressed — you confirm or override",
    color: "#6b7280",
    bg: "#6b7280",
    tooltipKey: "sdg-status-undecided",
  },
};

const RELEVANCE_OPTIONS = [
  { value: "all", label: "All (no filter)" },
  { value: "Global", label: "Global" },
  { value: "Africa", label: "Africa" },
  { value: "Europe", label: "Europe" },
  { value: "Asia", label: "Asia" },
  { value: "Americas", label: "Americas" },
  { value: "Australia", label: "Australia" },
  { value: "Custom", label: "Custom" },
];

const NON_ALIGNMENT_DISCLAIMER =
  "Not addressing an SDG does not mean your business negatively impacts it — it means this idea is not a direct contributor to that goal.";

function getAlignment(alignments, sdgNumber) {
  return alignments.find((a) => a.sdgNumber === sdgNumber) || null;
}

function StatusIcon({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.undecided;
  return (
    <span
      aria-label={config.label}
      title={config.label}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: config.bg,
        color: "#fff",
        fontWeight: 700,
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      {config.symbol}
    </span>
  );
}

function SDGCard({ sdg, alignment, expanded, onToggle, onStatusChange }) {
  const status = alignment?.status || "undecided";
  const config = STATUS_CONFIG[status];
  const hasEvidence = Boolean(alignment?.evidenceSource);
  const hasNonAlignmentReason = Boolean(alignment?.nonAlignmentReason);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={`SDG ${sdg.id}: ${sdg.name}. Status: ${config.label}. ${expanded ? "Click to collapse" : "Click to expand"}`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`sdg-card-glass${expanded ? " sdg-card-glass--expanded" : ""}`}
      style={{ borderTop: `5px solid ${sdg.color}` }}
    >
      <StatusIcon status={status} />

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: sdg.color,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        SDG {sdg.id}
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--color-text-primary, #1e293b)",
          lineHeight: 1.4,
          paddingRight: 28,
        }}
      >
        {sdg.name}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, fontWeight: 500, color: config.color }}>
        {config.label}
      </div>

      {expanded && (
        <div
          style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}
          role="region"
          aria-label={`Details for SDG ${sdg.id}`}
        >
          <p style={{ fontSize: 12, color: "var(--color-text-secondary, #64748b)", margin: "0 0 10px", lineHeight: 1.6 }}>
            {sdg.description}
          </p>

          {hasEvidence && (
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <span style={{ fontWeight: 600, color: "var(--color-text-primary, #1e293b)" }}>Evidence: </span>
              <span style={{ color: "var(--color-text-secondary, #64748b)" }}>
                {formatAgentText(alignment.evidenceSource)}
              </span>
            </div>
          )}

          {status === "undecided" && hasNonAlignmentReason && (
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <span style={{ fontWeight: 600, color: "var(--color-text-primary, #1e293b)" }}>
                Why not directly related:{" "}
              </span>
              <span style={{ color: "var(--color-text-secondary, #64748b)" }}>
                {formatAgentText(alignment.nonAlignmentReason)}
              </span>
            </div>
          )}

          {status === "undecided" && (
            <p
              style={{
                fontSize: 11,
                color: "var(--color-text-muted, #94a3b8)",
                margin: "0 0 10px",
                lineHeight: 1.55,
                fontStyle: "italic",
              }}
            >
              {NON_ALIGNMENT_DISCLAIMER}
            </p>
          )}

          {alignment?.localRelevance && (
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              <span style={{ fontWeight: 600, color: "var(--color-text-primary, #1e293b)" }}>Local relevance: </span>
              <span style={{ color: "var(--color-text-secondary, #64748b)" }}>{alignment.localRelevance}</span>
            </div>
          )}

          {onStatusChange && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`Set status to ${cfg.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(sdg.id, key);
                  }}
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: status === key ? `2px solid ${cfg.color}` : "1px solid #d1d5db",
                    background: status === key ? `${cfg.color}20` : "rgba(255, 255, 255, 0.65)",
                    color: cfg.color,
                    fontWeight: status === key ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {cfg.symbol} {cfg.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AntiGreenwashingPanel({
  inferredSDGs,
  relevanceFilter,
  onRelevanceChange,
  filterEnabled,
  canUnlockFilter,
  mappingLoading,
  mappingError,
  filterFeedback,
  onRetryMapping,
}) {
  const filterDisabled = !filterEnabled || mappingLoading;

  let statusText = filterFeedback;
  let showRetry = false;

  if (!canUnlockFilter) {
    statusText = "Complete the Business Model Canvas step to unlock geographic filtering.";
  } else if (mappingLoading) {
    statusText = "Tagging each SDG with geographic relevance…";
  } else if (mappingError) {
    statusText = mappingError;
    showRetry = true;
  } else if (!filterEnabled) {
    statusText = "SDG mapping not generated yet.";
    showRetry = Boolean(onRetryMapping);
  }

  return (
    <aside className="glass-info-card--amber side-panel" aria-label="Anti-greenwashing safeguards">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }} aria-hidden="true">⚠️</span>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#92400e", margin: 0 }}>
          Anti-Greenwashing Safeguards
        </h3>
      </div>

      <ul style={{ margin: "0 0 14px", padding: "0 0 0 16px", listStyle: "disc" }}>
        <li style={{ fontSize: 12, color: "var(--color-text-secondary, #5C5C58)", marginBottom: 6, lineHeight: 1.6 }}>
          Provide concrete evidence for each claimed SDG alignment
        </li>
        <li style={{ fontSize: 12, color: "var(--color-text-secondary, #5C5C58)", marginBottom: 6, lineHeight: 1.6 }}>
          Avoid vague claims like "we support sustainability"
        </li>
        <li style={{ fontSize: 12, color: "var(--color-text-secondary, #5C5C58)", marginBottom: 6, lineHeight: 1.6 }}>
          Reference specific programmes or measurable outcomes
        </li>
        <li style={{ fontSize: 12, color: "var(--color-text-secondary, #5C5C58)", marginBottom: 6, lineHeight: 1.6 }}>
          Consider local context and geographic relevance
        </li>
        <li style={{ fontSize: 12, color: "var(--color-text-secondary, #5C5C58)", marginBottom: 0, lineHeight: 1.6 }}>
          Cite data sources to substantiate your claims
        </li>
      </ul>

      {inferredSDGs && inferredSDGs.length > 0 && (
        <div style={{ marginBottom: 14, padding: "10px 12px" }} className="glass-info-card--amber">
          <p style={{ fontSize: 11, fontWeight: 600, color: "#92400e", margin: "0 0 6px" }}>
            Inferred alignments ({inferredSDGs.length}):
          </p>
          <ul style={{ margin: 0, padding: "0 0 0 14px", listStyle: "none" }}>
            {inferredSDGs.map((sdg) => (
              <li
                key={sdg.id}
                style={{
                  fontSize: 12,
                  color: "#92400e",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: "#eab308", fontWeight: 700 }}>~</span>
                <span>
                  <strong>SDG {sdg.id}</strong> — {sdg.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--color-border, rgba(0,0,0,0.08))", paddingTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <label
            htmlFor="sdg-relevance-filter"
            style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary, #1e293b)", margin: 0 }}
          >
            Local relevance
          </label>
          <InfoTooltip content={TOOLTIP_CONTENT["sdg-local-relevance"]} ariaLabel="Info about local relevance filter" />
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--color-text-secondary, #64748b)",
            margin: "0 0 8px",
            lineHeight: 1.5,
          }}
        >
          Filter the SDG grid by where each alignment is most geographically relevant to your business.
        </p>
        <select
          id="sdg-relevance-filter"
          value={relevanceFilter}
          onChange={(e) => onRelevanceChange(e.target.value)}
          disabled={filterDisabled}
          aria-label="Filter SDGs by geographic relevance"
          aria-describedby="sdg-relevance-feedback"
          style={{
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: filterDisabled ? "rgba(243,244,246,0.85)" : "rgba(255, 255, 255, 0.85)",
            color: filterDisabled ? "var(--color-text-muted)" : "var(--color-text-primary, #1e293b)",
            cursor: filterDisabled ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {RELEVANCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p
          id="sdg-relevance-feedback"
          role="status"
          style={{
            fontSize: 11,
            color: "var(--color-text-secondary, #64748b)",
            margin: "8px 0 0",
            lineHeight: 1.5,
          }}
        >
          {statusText}
        </p>
        {showRetry && onRetryMapping && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onRetryMapping}
            disabled={mappingLoading}
            style={{ fontSize: 11, marginTop: 8, padding: "4px 10px" }}
          >
            Retry SDG mapping
          </button>
        )}
      </div>
    </aside>
  );
}

export default function SDGMapperStep({
  alignments = [],
  onStatusChange,
  mappingReady = false,
  mappingLoading = false,
  canUnlockFilter = false,
  mappingError = null,
  mappingWarning = null,
  onRetryMapping,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [relevanceFilter, setRelevanceFilter] = useState("all");
  const [gridFlash, setGridFlash] = useState(false);

  const sdgData = useMemo(() => {
    return SDG_DEFINITIONS.map((sdg) => {
      const alignment = getAlignment(alignments, sdg.id);
      return {
        sdg,
        alignment: alignment || { sdgNumber: sdg.id, name: sdg.name, status: "undecided" },
      };
    });
  }, [alignments]);

  const filteredData = useMemo(() => {
    if (relevanceFilter === "all") return sdgData;
    return sdgData.filter(({ alignment }) => alignment.localRelevance === relevanceFilter);
  }, [sdgData, relevanceFilter]);

  const filterFeedback = useMemo(() => {
    if (relevanceFilter === "all") {
      return "Showing all 17 SDGs.";
    }
    const regionLabel = RELEVANCE_OPTIONS.find((o) => o.value === relevanceFilter)?.label || relevanceFilter;
    const count = filteredData.length;
    if (count === 0) {
      return `No SDGs tagged for ${regionLabel} — try All or regenerate mapping.`;
    }
    return `Showing ${count} of 17 SDGs relevant to ${regionLabel}.`;
  }, [relevanceFilter, filteredData.length]);

  const regionLabel = RELEVANCE_OPTIONS.find((o) => o.value === relevanceFilter)?.label || relevanceFilter;
  const showFilterBanner = mappingReady && relevanceFilter !== "all";

  useEffect(() => {
    if (relevanceFilter === "all") return undefined;
    setGridFlash(true);
    const timer = setTimeout(() => setGridFlash(false), 600);
    return () => clearTimeout(timer);
  }, [relevanceFilter]);

  const inferredSDGs = useMemo(() => {
    return sdgData
      .filter(({ alignment }) => alignment.status === "inferred")
      .map(({ sdg }) => sdg);
  }, [sdgData]);

  const hasStrongEvidence = useMemo(() => {
    return sdgData.some(({ alignment }) => alignment.status === "strong");
  }, [sdgData]);

  const alignedCount = sdgData.filter(
    ({ alignment }) => alignment.status === "strong" || alignment.status === "inferred"
  ).length;

  function handleToggle(sdgId) {
    setExpandedId(expandedId === sdgId ? null : sdgId);
  }

  return (
    <section className="animate-fade-in" aria-labelledby="sdg-mapper-heading">
      <div className="sdg-mapper-intro glass-info-card--brand">
        <div className="sdg-mapper-intro__header">
          <div className="glass-info-card--brand__label">Why this map exists</div>
          <InfoTooltip content={TOOLTIP_CONTENT["sdg-mapper"]} />
        </div>
        <p className="sdg-mapper-intro__body">
          The SDG Mapper is a transparency and anti-greenwashing check. It maps your business model to
          all 17 UN Sustainable Development Goals so you can see where you have evidence, where alignment
          is inferred, and where you still need to decide. This is not a score of how many goals you
          solve — most businesses directly relate to a subset of SDGs.
        </p>
        {mappingReady && (
          <p className="sdg-mapper-intro__summary">
            <strong>{alignedCount}</strong> of 17 SDGs have direct or inferred alignment in your plan.
          </p>
        )}
      </div>

      <h2
        id="sdg-mapper-heading"
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "var(--color-text-primary, #1e293b)",
          margin: "0 0 16px",
        }}
      >
        How your model aligns with the UN Sustainable Development Goals
      </h2>

      <div
        style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}
        role="group"
        aria-label="Status legend"
      >
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: cfg.bg,
                color: "#fff",
                fontWeight: 700,
                fontSize: 12,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {cfg.symbol}
            </span>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
              <InfoTooltip
                content={TOOLTIP_CONTENT[cfg.tooltipKey]}
                ariaLabel={`Info about ${cfg.label}`}
                position="right"
              />
              <span style={{ fontSize: 12, color: "var(--color-text-secondary, #64748b)" }}>
                {" "}— {cfg.rationale}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="two-panel-layout">
        <div>
          {mappingWarning && (
            <div className="glass-info-card--amber" style={{ marginBottom: 16, padding: "10px 14px", fontSize: 12 }}>
              {mappingWarning}
            </div>
          )}

          {mappingLoading && (
            <div className="glass-well glass-well--flat" style={{ marginBottom: 16, padding: "10px 16px", fontSize: 12 }}>
              Analysing SDG alignment across all 17 goals…
            </div>
          )}

          {showFilterBanner && (
            <div className="sdg-grid-filter-banner" role="status">
              Filtered by {regionLabel} — {filteredData.length} of 17 SDGs shown
            </div>
          )}

          {hasStrongEvidence && (
            <div
              style={{
                background: "#dcfce7",
                border: "1px solid #22c55e",
                borderRadius: 8,
                padding: "10px 16px",
                marginBottom: 16,
                fontSize: 12,
                color: "#166534",
              }}
              role="status"
            >
              Evidence sources are displayed for SDGs with available evidence data. Expand each SDG to view details.
            </div>
          )}

          <div
            className={`sdg-grid-container${gridFlash ? " sdg-grid-container--flash" : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
            }}
            role="list"
            aria-label="SDG alignment cards"
          >
            {filteredData.map(({ sdg, alignment }) => (
              <div key={sdg.id} role="listitem">
                <SDGCard
                  sdg={sdg}
                  alignment={alignment}
                  expanded={expandedId === sdg.id}
                  onToggle={() => handleToggle(sdg.id)}
                  onStatusChange={onStatusChange}
                />
              </div>
            ))}
          </div>

          {filteredData.length === 0 && mappingReady && relevanceFilter !== "all" && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--color-text-secondary, #64748b)",
                fontSize: 13,
              }}
              role="status"
            >
              {filterFeedback}
            </div>
          )}

          <div
            className="glass-well glass-well--flat"
            style={{
              marginTop: 20,
              padding: "12px 16px",
              display: "flex",
              gap: 20,
              flexWrap: "wrap",
              fontSize: 12,
              color: "var(--color-text-secondary)",
            }}
            aria-label="SDG alignment summary"
          >
            <span>
              <strong style={{ color: "#22c55e" }}>
                {sdgData.filter(({ alignment }) => alignment.status === "strong").length}
              </strong>{" "}
              Strong evidence
            </span>
            <span>
              <strong style={{ color: "#eab308" }}>
                {sdgData.filter(({ alignment }) => alignment.status === "inferred").length}
              </strong>{" "}
              Inferred
            </span>
            <span>
              <strong style={{ color: "#6b7280" }}>
                {sdgData.filter(({ alignment }) => alignment.status === "undecided").length}
              </strong>{" "}
              You decide
            </span>
          </div>
        </div>

        <AntiGreenwashingPanel
          inferredSDGs={inferredSDGs}
          relevanceFilter={relevanceFilter}
          onRelevanceChange={setRelevanceFilter}
          filterEnabled={mappingReady}
          canUnlockFilter={canUnlockFilter}
          mappingLoading={mappingLoading}
          mappingError={mappingError}
          filterFeedback={filterFeedback}
          onRetryMapping={onRetryMapping}
        />
      </div>
    </section>
  );
}
