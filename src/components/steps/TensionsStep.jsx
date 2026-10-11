import { useState, useMemo } from "react";
import EvidenceBadge from "../shared/EvidenceBadge";
import DriverBadge from "../shared/DriverBadge";
import { ExternalLinkIcon } from "../shared/Icon";
import InfoTooltip from "../shared/InfoTooltip";
import { TOOLTIP_CONTENT } from "../../constants/tooltips";

const DRIVER_AXES = ["People", "Planet", "Prosperity"];

const DRIVER_COLORS = {
  People: "var(--color-people)",
  Planet: "var(--color-planet)",
  Prosperity: "var(--color-prosperity)",
};

/**
 * TensionsStep — driver-based tension matrix with a clear detail panel.
 */
export default function TensionsStep({ data, onResolve }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filter, setFilter] = useState("all");

  const tensions = useMemo(
    () => (data?.tensions || []).map(normalizeTension),
    [data?.tensions]
  );

  const visibleTensions = useMemo(() => {
    return tensions
      .map((t, idx) => ({ ...t, originalIndex: idx }))
      .filter((t) => matchesFilter(t, filter));
  }, [tensions, filter]);

  const gridMap = useMemo(
    () => buildDriverGridMap(tensions),
    [tensions]
  );

  if (!tensions.length) return null;

  const selected = visibleTensions.find((t) => t.originalIndex === selectedIdx)
    || visibleTensions[0]
    || null;

  const effectiveSelectedIdx = selected?.originalIndex ?? selectedIdx;

  const stats = {
    total: tensions.length,
    highEvidence: tensions.filter((t) => isHighEvidence(t.evidenceLevel)).length,
    resolved: tensions.filter((t) => t.resolved).length,
  };

  return (
    <div className="tensions-step animate-fade-in">
      <header className="tensions-step__header">
        <p className="tensions-step__subtitle">
          Conflicts between your People, Planet, and Prosperity goals. Select any
          tension to read the full explanation and evidence.
          <InfoTooltip
            content={TOOLTIP_CONTENT["tension-matrix"]}
            ariaLabel="Info about Tension Matrix"
            position="right"
          />
        </p>
      </header>

      <div className="tensions-step__stats">
        <span className="tensions-stat">
          <strong>{stats.total}</strong> tensions
        </span>
        <span className="tensions-stat">
          <strong>{stats.highEvidence}</strong> with evidence
        </span>
        {stats.resolved > 0 && (
          <span className="tensions-stat tensions-stat--resolved">
            <strong>{stats.resolved}</strong> resolved
          </span>
        )}
      </div>

      <div className="tensions-step__filters">
        <FilterPill
          label="All tensions"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <FilterPill
          label="Evidence-backed"
          active={filter === "evidence"}
          onClick={() => setFilter(filter === "evidence" ? "all" : "evidence")}
        />
        <FilterPill
          label="Inferred"
          active={filter === "inference"}
          onClick={() => setFilter(filter === "inference" ? "all" : "inference")}
        />
      </div>

      <div className="tensions-step__body">
        <section className="tensions-step__matrix-section" aria-label="Tension matrix">
          <div className="tensions-matrix-wrap">
            <table className="tensions-matrix">
              <thead>
                <tr>
                  <th scope="col" className="tensions-matrix__corner" />
                  {DRIVER_AXES.map((col) => (
                    <th key={col} scope="col" className="tensions-matrix__col-head">
                      <span
                        className="tensions-matrix__driver-label"
                        style={{ color: DRIVER_COLORS[col] }}
                      >
                        {col}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DRIVER_AXES.map((row) => (
                  <tr key={row}>
                    <th scope="row" className="tensions-matrix__row-head">
                      <span
                        className="tensions-matrix__driver-label"
                        style={{ color: DRIVER_COLORS[row] }}
                      >
                        {row}
                      </span>
                    </th>
                    {DRIVER_AXES.map((col) => {
                      const key = `${row}|${col}`;
                      const cellTensions = (gridMap[key] || []).filter((idx) =>
                        matchesFilter(tensions[idx], filter)
                      );
                      const isDiagonal = row === col;

                      return (
                        <td
                          key={key}
                          className={`tensions-matrix__cell${isDiagonal ? " tensions-matrix__cell--diagonal" : ""}`}
                        >
                          {cellTensions.length === 0 ? (
                            <span className="tensions-matrix__empty" aria-hidden="true">—</span>
                          ) : (
                            <div className="tensions-matrix__cell-items">
                              {cellTensions.map((idx) => (
                                <MatrixChip
                                  key={idx}
                                  tension={tensions[idx]}
                                  index={idx}
                                  isSelected={effectiveSelectedIdx === idx}
                                  onSelect={setSelectedIdx}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="tensions-matrix__hint">
            Each cell shows where two drivers pull in opposite directions.
            Same-driver cells (diagonal) are intentionally empty.
          </p>
        </section>

        <aside
          className="tensions-step__detail"
          role="region"
          aria-label="Tension details"
          aria-live="polite"
        >
          {selected ? (
            <TensionDetail
              tension={selected}
              index={selected.originalIndex}
              onResolve={onResolve}
            />
          ) : (
            <div className="tensions-detail__empty">
              <p>No tensions match the current filter.</p>
              <button
                type="button"
                className="tensions-detail__clear-filter"
                onClick={() => setFilter("all")}
              >
                Show all tensions
              </button>
            </div>
          )}
        </aside>
      </div>

      {visibleTensions.length > 1 && (
        <section className="tensions-step__list-section" aria-label="All tensions">
          <h3 className="tensions-step__list-title">All flagged tensions</h3>
          <div className="tensions-list">
            {visibleTensions.map((t) => (
              <TensionListCard
                key={t.originalIndex}
                tension={t}
                index={t.originalIndex}
                isSelected={effectiveSelectedIdx === t.originalIndex}
                onSelect={setSelectedIdx}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tensions-filter-pill${active ? " tensions-filter-pill--active" : ""}`}
    >
      {label}
    </button>
  );
}

function MatrixChip({ tension, index, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className={`tensions-chip${isSelected ? " tensions-chip--selected" : ""}${tension.resolved ? " tensions-chip--resolved" : ""}`}
      aria-label={`Tension ${index + 1}. ${tension.shortLabel}. Evidence: ${tension.evidenceLevel}.${tension.resolved ? " Resolved." : ""}`}
      aria-pressed={isSelected}
    >
      <span className="tensions-chip__label">
        <span className="tension-number">T{index + 1}</span>
        {tension.shortLabel}
      </span>
      <span className="tensions-chip__badges">
        <EvidenceBadge level={tension.evidenceLevel} />
      </span>
    </button>
  );
}

function TensionListCard({ tension, index, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className={`tensions-list-card${isSelected ? " tensions-list-card--selected" : ""}`}
      aria-pressed={isSelected}
    >
      <div className="tensions-list-card__header">
        <span className="tensions-list-card__title">
          <span className="tension-number">T{index + 1}</span>
          {tension.title}
        </span>
        {tension.resolved && <span className="tensions-list-card__resolved">✓ Resolved</span>}
      </div>
      {/* Expand in place when selected — the truncated excerpt alone meant the
          full explanation was unreachable from this list (feedback p13). */}
      <p
        className={`tensions-list-card__excerpt${
          isSelected ? " tensions-list-card__excerpt--full" : ""
        }`}
      >
        {isSelected ? tension.description || tension.excerpt : tension.excerpt}
      </p>
      <div className="tensions-list-card__meta">
        {tension.driverA && <DriverBadge driver={tension.driverA} />}
        {tension.driverB && tension.driverB !== tension.driverA && (
          <>
            <span className="tensions-list-card__vs">vs</span>
            <DriverBadge driver={tension.driverB} />
          </>
        )}
        <EvidenceBadge level={tension.evidenceLevel} />
      </div>
    </button>
  );
}

function TensionDetail({ tension, index, onResolve }) {
  const sources = tension.sources || [];
  const isResolved = tension.resolved;

  return (
    <div className="tensions-detail">
      <div className="tensions-detail__body">
        <div className="tensions-detail__label">Selected tension · T{index + 1}</div>

        <div className="tensions-detail__badges">
          {tension.driverA && <DriverBadge driver={tension.driverA} />}
          {tension.driverB && tension.driverB !== tension.driverA && (
            <>
              <span className="tensions-detail__vs">vs</span>
              <DriverBadge driver={tension.driverB} />
            </>
          )}
          <EvidenceBadge level={tension.evidenceLevel} />
        </div>

        <h3 className="tensions-detail__title">{tension.title}</h3>
        <p className="tensions-detail__description">{tension.description}</p>

        {/* One confidence concept only. This panel used to show a separate
            "Inference confidence" from the LLM's `inference_level` field, which
            contradicted the evidence badge in the matrix (feedback p32 — a cell
            marked Medium read "Inference confidence: High"). The badge above is
            now the single source of truth; this line explains what it means. */}
        <div className="tensions-detail__inference">
          {EVIDENCE_MEANING[tension.evidenceLevel] || EVIDENCE_MEANING.Low}
        </div>

        {sources.length > 0 && (
          <div className="tensions-detail__sources">
            <span className="tensions-detail__sources-label">Sources</span>
            <ul className="tensions-detail__sources-list">
              {sources.map((src, i) => {
                const sourceTitle =
                  typeof src === "object" ? src.title || src.name || "" : src;
                const sourceDate = typeof src === "object" ? src.date || "" : "";
                return (
                  <li key={i} className="tensions-detail__source-item">
                    <div className="tensions-detail__source-info">
                      <span className="tensions-detail__source-title">{sourceTitle}</span>
                      {sourceDate && (
                        <span className="tensions-detail__source-date">{sourceDate}</span>
                      )}
                    </div>
                    <ExternalLinkIcon size={14} color="var(--color-text-muted)" />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="tensions-detail__footer">
        <button
          type="button"
          onClick={() => onResolve && onResolve(index)}
          disabled={isResolved}
          className={`tensions-detail__resolve${isResolved ? " tensions-detail__resolve--done" : ""}`}
          aria-label={isResolved ? "Tension already resolved" : "Mark tension as resolved"}
        >
          {isResolved ? "✓ Resolved" : "Mark as resolved"}
        </button>
      </div>
    </div>
  );
}

function normalizeDriver(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/people/i.test(s)) return "People";
  if (/planet/i.test(s)) return "Planet";
  if (/prosperity/i.test(s)) return "Prosperity";
  return s;
}

function truncate(text, max) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function normalizeTension(t, idx) {
  const issueA = t.issue_a || t.issueA || "";
  const issueB = t.issue_b || t.issueB || "";
  const tensionText = t.tension || "";
  const whyText = t.why || t.description || "";

  let title = t.title;
  if (!title && issueA && issueB) title = `${issueA} vs ${issueB}`;
  if (!title && tensionText) title = truncate(tensionText, 72);
  if (!title) title = `Tension ${idx + 1}`;

  const description = whyText || tensionText || t.description || "";
  const excerpt = truncate(tensionText || whyText || description, 120);

  const driverA = normalizeDriver(t.driver_a || t.driverA || t.rows?.[0]);
  const driverB = normalizeDriver(t.driver_b || t.driverB || t.columns?.[0]);

  const shortLabel = issueA && issueB
    ? truncate(`${issueA} · ${issueB}`, 48)
    : truncate(title, 48);

  return {
    ...t,
    title,
    shortLabel,
    excerpt,
    description,
    driverA,
    driverB,
    evidenceLevel: t.evidenceLevel || t.evidence_level || "Low",
    inferenceLevel: t.inference_level || t.inferenceLevel || null,
  };
}

/** Plain-language meaning of each evidence level, shown under the selected tension. */
const EVIDENCE_MEANING = {
  High: "High evidence — drawn directly from what you described or from cited sources.",
  Medium: "Medium evidence — partly grounded in your story, partly inferred from sector patterns.",
  Inferred: "Inferred — a plausible tension the agents expect in your sector. Worth checking against your own knowledge.",
  Inference: "Inferred — a plausible tension the agents expect in your sector. Worth checking against your own knowledge.",
  Low: "Low evidence — inferred from sector patterns rather than your story. Review before relying on it.",
};

function isHighEvidence(level) {
  const l = String(level || "").toLowerCase();
  return l === "high" || l === "medium";
}

function matchesFilter(tension, filter) {
  if (filter === "all") return true;
  const level = String(tension.evidenceLevel || "").toLowerCase();
  if (filter === "evidence") return level === "high" || level === "medium";
  if (filter === "inference") {
    return level === "low" || level === "inferred" || level === "inference";
  }
  return true;
}

function buildDriverGridMap(tensions) {
  const map = {};
  DRIVER_AXES.forEach((row) => {
    DRIVER_AXES.forEach((col) => {
      map[`${row}|${col}`] = [];
    });
  });

  tensions.forEach((t, idx) => {
    const row = t.driverA && DRIVER_AXES.includes(t.driverA) ? t.driverA : null;
    const col = t.driverB && DRIVER_AXES.includes(t.driverB) ? t.driverB : null;

    if (row && col && row !== col) {
      map[`${row}|${col}`].push(idx);
      return;
    }

    // Fallback: distribute unmapped tensions across off-diagonal cells
    const fallbackPairs = [
      ["People", "Planet"],
      ["People", "Prosperity"],
      ["Planet", "Prosperity"],
      ["Planet", "People"],
      ["Prosperity", "People"],
      ["Prosperity", "Planet"],
    ];
    const pair = fallbackPairs[idx % fallbackPairs.length];
    map[`${pair[0]}|${pair[1]}`].push(idx);
  });

  return map;
}
