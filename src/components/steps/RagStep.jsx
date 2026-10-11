import { useMemo } from "react";
import { BMC_BLOCKS, SNAKE_TO_CAMEL } from "../../constants/bmcBlocks";
import RagKnowledgeUpload from "./RagKnowledgeUpload";

const blockLabel = (snake) =>
  BMC_BLOCKS[SNAKE_TO_CAMEL[snake]]?.label || String(snake || "").replace(/_/g, " ");

/**
 * RAG Evidence step — sits between the Business Model Canvas and the Business
 * Plan. Shows what hybrid retrieval found (BMC blocks by metadata, earlier
 * workflow steps, the user's uploaded documents and knowledge-base passages
 * by similarity), which MIA agents
 * each item is routed to, and lets the user exclude items before the plan is
 * written. Included items are sent to the plan as `curatedContext`.
 */

const COLLECTION_LABELS = {
  business_plan_sections: "Business plan guidance",
  business_frameworks: "Business frameworks",
  industry_patterns: "Industry patterns",
  sdg_knowledge: "SDG knowledge",
};

const STEP_LABELS = {
  story: "Story",
  focus: "Driver & Focus",
  issues: "Issues",
  tensions: "Tensions",
  dilemmas: "Dilemmas",
  values: "Value Propositions",
  swot: "SWOT",
  sdg_mapping: "SDG Mapping",
};

const AGENT_LABELS = {
  market: "Market",
  financial: "Financial",
  sdg: "SDG",
  critique: "Critique",
  synthesis: "Synthesis",
  "fact-checker": "Fact-checker",
  consistency: "Consistency",
};

/** Items that will be sent to the plan (everything not excluded). */
export function getCuratedContext(rag) {
  if (!rag) return [];
  const excluded = new Set(rag.excluded || []);
  return [
    ...(rag.bmcBlocks || []),
    ...(rag.priorSteps || []),
    ...(rag.uploads || []),
    ...(rag.knowledge || []),
  ]
    .filter((item) => item?.id && !excluded.has(item.id));
}

function truncate(text, max = 320) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function AgentChips({ agents }) {
  if (!agents?.length) return null;
  return (
    <div className="rag-item__agents" aria-label="Routed to MIA agents">
      <span className="rag-item__agents-label">→ MIA:</span>
      {agents.map((a) => (
        <span key={a} className="rag-chip">{AGENT_LABELS[a] || a}</span>
      ))}
    </div>
  );
}

function EvidenceItem({ item, title, meta, included, agents, onToggle, disabled }) {
  return (
    <li className={`rag-item${included ? "" : " rag-item--excluded"}`}>
      <label className="rag-item__head">
        <input
          type="checkbox"
          checked={included}
          disabled={disabled}
          onChange={() => onToggle(item.id)}
          aria-label={`${included ? "Exclude" : "Include"} ${title}`}
        />
        <span className="rag-item__title">{title}</span>
        {meta && <span className="rag-item__meta">{meta}</span>}
      </label>
      <p className="rag-item__text">{truncate(item.text)}</p>
      <AgentChips agents={agents} />
    </li>
  );
}

function Section({ title, hint, children, count }) {
  return (
    <section className="rag-section">
      <h3 className="rag-section__title">
        {title} <span className="rag-section__count">{count}</span>
      </h3>
      {hint && <p className="rag-section__hint">{hint}</p>}
      {count === 0 ? <p className="rag-section__empty">Nothing retrieved.</p> : <ul className="rag-list">{children}</ul>}
    </section>
  );
}

export default function RagStep({
  data,
  onChange,
  onRerun,
  onApprove,
  onUpload,
  onDeleteDocument,
  loading,
}) {
  const excluded = useMemo(() => new Set(data?.excluded || []), [data]);
  const routing = data?.agentRouting || {};
  const report = data?.coverageReport || {};
  const bmcBlocks = data?.bmcBlocks || [];
  const priorSteps = data?.priorSteps || [];
  const uploads = useMemo(
    () => [...(data?.uploads || [])].sort((a, b) => (b.relevance || 0) - (a.relevance || 0)),
    [data]
  );
  const knowledge = useMemo(
    () => [...(data?.knowledge || [])].sort((a, b) => (b.relevance || 0) - (a.relevance || 0)),
    [data]
  );
  const includedCount = getCuratedContext(data).length;
  const total = bmcBlocks.length + priorSteps.length + uploads.length + knowledge.length;
  const missing = report.missingBmcBlocks || [];

  const toggle = (id) => {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...data, excluded: [...next] });
  };

  if (!data) return null;

  return (
    <div className="rag-step">
      <div className="rag-coverage glass-info-card--brand" role="status">
        <div className="rag-coverage__stat">
          <strong>{report.bmcBlocksRetrieved ?? bmcBlocks.length}/{report.bmcBlocksTotal ?? 11}</strong>
          <span>BMC blocks</span>
        </div>
        <div className="rag-coverage__stat">
          <strong>{priorSteps.length}</strong>
          <span>Earlier steps</span>
        </div>
        <div className="rag-coverage__stat">
          <strong>{uploads.length}</strong>
          <span>From your uploads</span>
        </div>
        <div className="rag-coverage__stat">
          <strong>{knowledge.length}</strong>
          <span>Knowledge passages</span>
        </div>
        <div className="rag-coverage__stat">
          <strong>{includedCount}/{total}</strong>
          <span>Sent to MIA agents</span>
        </div>
      </div>

      {onUpload && (
        <RagKnowledgeUpload
          suggestions={data.suggestions || []}
          suggestionsError={data.suggestionsError}
          documents={data.documents || []}
          uploadsLost={Boolean(data.uploadsLost)}
          onUpload={onUpload}
          onDelete={onDeleteDocument}
          disabled={loading}
        />
      )}

      {report.retrievalError && (
        <div className="rag-warning" role="alert">
          Semantic search is unavailable right now, so knowledge-base and uploaded-document
          matches could not be retrieved. Details: {report.retrievalError}
        </div>
      )}

      {missing.length > 0 && (
        <div className="rag-warning" role="alert">
          Not grounded yet: {missing.map(blockLabel).join(", ")}.
          Add content to these canvas blocks, or the plan will have to infer them.
        </div>
      )}

      <Section
        title="Business Model Canvas"
        hint="Matched exactly by block (metadata filter). The plan treats these as its source of truth."
        count={bmcBlocks.length}
      >
        {bmcBlocks.map((b) => (
          <EvidenceItem
            key={b.id}
            item={b}
            title={blockLabel(b.blockId)}
            included={!excluded.has(b.id)}
            agents={routing.bmc}
            onToggle={toggle}
            disabled={loading}
          />
        ))}
      </Section>

      <Section
        title="Earlier workflow steps"
        hint="Your own outputs from steps 1–7, kept consistent across the plan."
        count={priorSteps.length}
      >
        {priorSteps.map((p) => (
          <EvidenceItem
            key={p.id}
            item={p}
            title={STEP_LABELS[p.step] || p.step}
            included={!excluded.has(p.id)}
            agents={routing.step}
            onToggle={toggle}
            disabled={loading}
          />
        ))}
      </Section>

      <Section
        title="Your uploaded documents"
        hint="Top matches from the documents and text you added above (similarity search, this session only)."
        count={uploads.length}
      >
        {uploads.map((u) => (
          <EvidenceItem
            key={u.id}
            item={u}
            title={u.source}
            meta={`Uploaded · ${Math.round((u.relevance || 0) * 100)}% match`}
            included={!excluded.has(u.id)}
            agents={routing.upload}
            onToggle={toggle}
            disabled={loading}
          />
        ))}
      </Section>

      <Section
        title="Knowledge base"
        hint="Semantic search over frameworks, SDG targets, industry patterns and plan-section guidance."
        count={knowledge.length}
      >
        {knowledge.map((k) => (
          <EvidenceItem
            key={k.id}
            item={k}
            title={k.title || k.id}
            meta={`${COLLECTION_LABELS[k.source] || k.source} · ${Math.round((k.relevance || 0) * 100)}% match`}
            included={!excluded.has(k.id)}
            agents={routing[k.source]}
            onToggle={toggle}
            disabled={loading}
          />
        ))}
      </Section>

      <div className="rag-actions">
        <button type="button" className="btn-secondary" onClick={onRerun} disabled={loading}>
          Re-run retrieval
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onApprove}
          disabled={loading || includedCount === 0}
        >
          Use this evidence → Generate Business Plan
        </button>
      </div>
    </div>
  );
}
