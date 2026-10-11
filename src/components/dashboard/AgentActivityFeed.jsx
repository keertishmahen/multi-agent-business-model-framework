import { memo } from "react";
import { Zap } from "lucide-react";
import { AGENT_CONFIG, AGENT_RUNNING_SUBSTATUS } from "../../constants/agents";
import { isSpecialistAgent, getPipelineStageLabel, collapseActivityEvents } from "../../utils/agentStatus";

function formatTime(timestamp) {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function dotColor(status) {
  if (status === "running") return "var(--color-brand)";
  if (status === "complete") return "#15803D";
  if (status === "error") return "#dc2626";
  return "var(--color-text-muted)";
}

function statusText(event) {
  if (event.message) return event.message;
  if (event.status === "running") {
    const sub = AGENT_RUNNING_SUBSTATUS[event.name];
    return sub ? `Analyzing — ${sub}` : "Analyzing…";
  }
  if (event.status === "complete") return "Complete";
  if (event.status === "degraded") return "Limited analysis";
  if (event.status === "error") return "Failed";
  return event.status || "";
}

/**
 * Timeline-style activity log for MIA agent pipeline.
 */
export default memo(function AgentActivityFeed({ events = [], maxItems = 20 }) {
  const visible = collapseActivityEvents(events.slice(-maxItems));

  return (
    <div className="activity-feed--corp" aria-live="polite">
      <hr className="activity-divider" />
      <div className="glass-eyebrow" style={{ marginBottom: 8 }}>Activity</div>

      {visible.length === 0 ? (
        <div className="glass-well" style={{ textAlign: "center", padding: "16px 12px" }}>
          <Zap size={16} color="var(--color-text-muted)" style={{ marginBottom: 6 }} />
          <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: 0 }}>
            Activity will appear here during generation
          </p>
        </div>
      ) : (
        visible.map((event, i) => {
          const agentConfig = AGENT_CONFIG[event.name];
          const label = agentConfig?.label || getPipelineStageLabel(event.name);

          return (
            <div key={`${event.name}-${event.timestamp || i}`} className="activity-row">
              <span
                className="activity-row__dot"
                style={{ background: dotColor(event.status) }}
                aria-hidden="true"
              />
              <span className="activity-row__message">
                {isSpecialistAgent(event.name)
                  ? `${label} — ${statusText(event)}`
                  : statusText(event)}
              </span>
              <span className="activity-row__time">{formatTime(event.timestamp)}</span>
            </div>
          );
        })
      )}
    </div>
  );
});
