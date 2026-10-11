import { AGENT_CONFIG, AGENT_RUNNING_SUBSTATUS } from "../../constants/agents";

const STATUS_LABELS = {
  running: "Analyzing",
  complete: "Complete",
  degraded: "Limited analysis",
  error: "Unavailable",
  queued: "Queued",
  standby: "Standby",
  idle: "Idle",
};


function dotClass(agentId, status) {
  if (status === "running") return "agent-card__dot agent-card__dot--running";
  if (status === "error") return "agent-card__dot agent-card__dot--error";
  if (status === "complete") {
    return agentId === "sdg"
      ? "agent-card__dot agent-card__dot--complete agent-card__dot--complete--sdg"
      : "agent-card__dot agent-card__dot--complete";
  }
  return "agent-card__dot agent-card__dot--queued";
}

function statusLine(status, agentId) {
  if (status === "error") {
    return { main: "Unavailable", sub: " — Direct mode" };
  }
  const base = STATUS_LABELS[status] || status;
  if (status === "running") {
    const sub = AGENT_RUNNING_SUBSTATUS[agentId];
    return { main: "Analyzing", sub: sub ? ` — ${sub}` : null };
  }
  return { main: base, sub: null };
}

/**
 * Corporate card for a single MIA specialist agent.
 */
export default function AgentCard({ agentId, status = "idle", onClick, compact = false }) {
  const config = AGENT_CONFIG[agentId];
  if (!config) return null;

  const { label } = config;
  const isMuted = status === "error" || status === "degraded";
  const statusParts = statusLine(status, agentId);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`agent-card--figma agent-card--corp agent-card--status-${status}${status === "running" ? " agent-card-active" : ""}`}
      aria-label={`${label} agent — ${STATUS_LABELS[status] || status}`}
      style={{
        cursor: onClick ? "pointer" : "default",
        opacity: isMuted ? 0.8 : 1,
        marginBottom: compact ? 6 : 8,
      }}
    >
      <span className={dotClass(agentId, status)} aria-hidden="true" />
      <div className="agent-card__content">
        <div className="agent-card__name">{label}</div>
        <div className="agent-card__status">
          <span className="agent-card__status-main">{statusParts.main}</span>
          {statusParts.sub && (
            <span className="agent-card__status-sub">{statusParts.sub}</span>
          )}
        </div>
      </div>
    </button>
  );
}
