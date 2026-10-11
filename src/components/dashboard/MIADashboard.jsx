import { memo } from "react";
import { Sparkles, Map } from "lucide-react";
import {
  formatAgentText,
  collectRagSourcesFromMetadata,
  formatSourceLabel,
} from "../../utils/agentText";
import StepNav from "../StepNav";
import StepGlimpsePanel from "../shared/StepGlimpsePanel";
import AgentHub from "./AgentHub";
import AgentActivityFeed from "./AgentActivityFeed";
import SpecialistInsightsPanel from "./SpecialistInsightsPanel";
import AgentProgressIndicator from "../shared/AgentProgressIndicator";
import { APP_NAME, APP_TAGLINE } from "../../constants/branding";
import { getActiveAgents } from "../../constants/agents";
import { TONES, getTone } from "../../constants/tone";

/**
 * MIA Dashboard — Central hub layout for the multi-agent workflow.
 * Three-column: Agent Panel | Main Canvas | Context Panel
 */
export default memo(function MIADashboard({
  currentStepId,
  completedSteps,
  onStepClick,
  onSDGMapperOpen,
  agentState,
  children,
  feedbackSlot,
  loading,
  stepMeta,
  stepIdx,
  tone,
  onToneChange,
}) {
  const {
    agentStatuses = {},
    activityEvents = [],
    lastMetadata = null,
    activeStage = null,
    onToggleInsights,
    onAgentClick,
  } = agentState || {};

  const activeAgentIds = getActiveAgents(currentStepId);
  const stepSpecialists = lastMetadata?.specialists
    ? Object.fromEntries(
        Object.entries(lastMetadata.specialists).filter(([id]) => activeAgentIds.includes(id))
      )
    : {};

  const ragSources = collectRagSourcesFromMetadata(lastMetadata);

  return (
    <div className="mia-dashboard">
      <header className="glass-header corp-brand-bar" role="banner">
        <div className="glass-header__inner">
          <div className="glass-header__brand">
            <div className="glass-header__logo">
              <Sparkles size={18} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <h1 className="glass-header__title">{APP_NAME}</h1>
              <p className="glass-header__subtitle">{APP_TAGLINE}</p>
            </div>
          </div>

          <div className="glass-header__actions">
            {onToneChange && (
              <label className="header-tone">
                <span className="header-tone__label">Tone</span>
                <select
                  className="header-tone__select"
                  value={tone}
                  onChange={(e) => onToneChange(e.target.value)}
                  title={getTone(tone).hint}
                  aria-label="Writing tone for generated content"
                >
                  {TONES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {onSDGMapperOpen && (
              <button type="button" onClick={onSDGMapperOpen} className="header-pill-btn">
                <Map size={14} />
                SDG Mapper
              </button>
            )}
          </div>
        </div>
      </header>

      <nav role="navigation" aria-label="Workflow steps" className="mia-step-nav">
        <StepNav
          currentStepId={currentStepId}
          completedIds={completedSteps}
          onStepClick={onStepClick}
        />
      </nav>

      <StepGlimpsePanel stepMeta={stepMeta} stepIdx={stepIdx} />

      <div className="mia-layout">
        <aside className="mia-sidebar" aria-label="MIA Agent Panel">
          <div className="glass-eyebrow">Intelligence Agents</div>
          <AgentHub
            currentStepId={currentStepId}
            agentStatuses={agentStatuses}
            onAgentClick={onAgentClick}
          />
          <AgentActivityFeed events={activityEvents} />
        </aside>

        <main id="main-content" role="main" className="mia-main">
          <div className="corp-step-header">
            <span className="corp-step-badge">{stepIdx + 1}</span>
            <div>
              <h2 className="corp-step-header__title">{stepMeta?.label}</h2>
              {stepMeta?.subtitle && (
                <p className="corp-step-header__subtitle">{stepMeta.subtitle}</p>
              )}
            </div>
          </div>
          <hr className="mia-step-divider" />

          {(loading || activeStage) && (
            <AgentProgressIndicator
              currentStage={activeStage}
              metadata={lastMetadata}
              isActive={loading}
              agentStatuses={agentStatuses}
            />
          )}

          <div className="mia-canvas-content">
            {children}
          </div>

          {feedbackSlot}
        </main>

        <aside className="mia-context" aria-label="Context Panel">
          <div className="glass-eyebrow">Agent Context</div>

          {lastMetadata?.coverageReport && currentStepId === "plan" && (
            <div className="glass-info-card--brand">
              <div className="glass-info-card--brand__label">BMC Grounding</div>
              <p className="glass-info-card--brand__body">
                {lastMetadata.coverageReport.bmcBlocksRetrieved}/
                {lastMetadata.coverageReport.bmcBlocksTotal} BMC blocks retrieved
                {lastMetadata.coverageReport.bmcComplete ? " — full coverage" : " — partial coverage"}
              </p>
            </div>
          )}

          {lastMetadata?.synthesisNotes && (
            <div className="glass-info-card--brand">
              <div className="glass-info-card--brand__label">Synthesis</div>
              <p className="glass-info-card--brand__body">{lastMetadata.synthesisNotes}</p>
            </div>
          )}

          {lastMetadata?.conflicts?.length > 0 && (
            <div className="glass-info-card--amber">
              <div className="glass-info-card--amber__label">Resolved Conflicts</div>
              {lastMetadata.conflicts.map((c, i) => (
                <p key={i} className="glass-info-card--amber__body">{formatAgentText(c.description)}</p>
              ))}
            </div>
          )}

          {(Object.keys(stepSpecialists).length > 0) && (
            <SpecialistInsightsPanel
              specialists={stepSpecialists}
              activeAgentIds={activeAgentIds}
              onClose={onToggleInsights}
            />
          )}

          {/* Retrieval provenance. The backend has always returned `sources`,
              but nothing rendered them, so the RAG grounding was invisible to
              reviewers (feedback p29, comment 1). */}
          {ragSources.length > 0 && (
            <div className="rag-sources">
              <div className="glass-eyebrow">Sources used</div>
              <p className="rag-sources__hint">
                Documents retrieved to ground this step.
              </p>
              <ul className="rag-sources__list">
                {ragSources.map((source) => (
                  <li key={source} className="rag-sources__item">
                    {formatSourceLabel(source)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!Object.keys(stepSpecialists).length && !lastMetadata?.synthesisNotes && !loading && (
            <p className="context-empty-text">
              Specialist insights and RAG sources will appear here after generation.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
});
