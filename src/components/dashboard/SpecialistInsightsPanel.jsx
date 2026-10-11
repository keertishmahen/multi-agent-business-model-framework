import { memo } from "react";
import { AGENT_CONFIG } from "../../constants/agents";
import {
  collectSpecialistInsights,
  hasSpecialistDisplayContent,
  formatAgentTextList,
} from "../../utils/agentText";

const TAG_LABELS = {
  market: "MARKET",
  financial: "FINANCIAL",
  sdg: "SDG",
  critique: "CRITIQUE",
};

function scopeSpecialists(specialists, activeAgentIds) {
  if (!activeAgentIds?.length) return specialists;
  return Object.fromEntries(
    Object.entries(specialists).filter(([id]) => activeAgentIds.includes(id))
  );
}

/**
 * Post-generation drill-down into each specialist agent's structured output.
 */
export default memo(function SpecialistInsightsPanel({
  specialists = {},
  activeAgentIds = [],
  onClose,
}) {
  const scoped = scopeSpecialists(specialists, activeAgentIds);

  const entries = Object.entries(scoped).filter(
    ([, data]) => data && !data.failed && hasSpecialistDisplayContent(data)
  );

  if (entries.length === 0) return null;

  return (
    <div>
      <div className="specialist-insights-header">
        <div className="specialist-insights-eyebrow">Specialist Insights</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="specialist-insights-close"
            aria-label="Close insights"
          >
            ×
          </button>
        )}
      </div>

      {entries.map(([agentId, data]) => {
        const config = AGENT_CONFIG[agentId];
        if (!config) return null;

        const insights = collectSpecialistInsights(data);
        const warnings = formatAgentTextList(data.warnings);
        const sources = formatAgentTextList(data.sources);

        return (
          <div key={agentId} className="specialist-insight-card">
            <div className="specialist-insight-card__tag">
              {TAG_LABELS[agentId] || agentId.toUpperCase()}
            </div>
            {insights.map((insight, i) => (
              <p
                key={`i-${i}`}
                className="specialist-insight-card__body"
                style={i > 0 ? { marginTop: 6 } : undefined}
              >
                {insight}
              </p>
            ))}
            {warnings.map((warning, i) => (
              <p
                key={`w-${i}`}
                className="specialist-insight-card__body specialist-insight-card__body--warn"
                style={{ marginTop: 6 }}
              >
                ⚠ {warning}
              </p>
            ))}
            {insights.length === 0 && warnings.length === 0 && sources.length > 0 && (
              <p className="specialist-insight-card__body">
                Sources: {sources.slice(0, 3).join("; ")}
              </p>
            )}
            {insights.length === 0 && warnings.length === 0 && sources.length === 0 && (
              <p className="specialist-insight-card__body specialist-insight-card__body--muted">
                No structured insights returned for this agent.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
});
