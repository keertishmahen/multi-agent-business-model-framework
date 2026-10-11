import { memo } from "react";
import { PenLine, Search, Link2, Star, Merge, Database, CheckCircle2 } from "lucide-react";
import { AGENT_CONFIG } from "../../constants/agents";

const QA_STAGES = [
  { id: "synthesis", label: "Synthesizing", Icon: Merge, description: "Merging specialist insights..." },
  { id: "fact-checker", label: "Fact-checking", Icon: Search, description: "Verifying claims against knowledge base..." },
  { id: "consistency", label: "Consistency check", Icon: Link2, description: "Checking alignment across all steps..." },
  { id: "critic", label: "Quality review", Icon: Star, description: "Reviewing for completeness and quality..." },
];

const SPECIALIST_IDS = ["market", "financial", "sdg", "critique"];

function getStageConfig(stageId) {
  if (AGENT_CONFIG[stageId]) {
    const { label, Icon } = AGENT_CONFIG[stageId];
    return { id: stageId, label, Icon, description: `${label} analyzing...` };
  }
  const qa = QA_STAGES.find((s) => s.id === stageId);
  if (qa) return qa;
  if (stageId === "context-retrieval") {
    return { id: stageId, label: "Retrieving context", Icon: Database, description: "Loading knowledge base..." };
  }
  if (stageId === "writer") {
    return { id: stageId, label: "Writing draft", Icon: PenLine, description: "Drafting content..." };
  }
  return { id: stageId, label: stageId, Icon: PenLine, description: "Processing..." };
}

function qualityBadgeClass(quality) {
  if (quality === "high") return "mia-progress-card__badge mia-progress-card__badge--high";
  if (quality === "medium") return "mia-progress-card__badge mia-progress-card__badge--medium";
  return "mia-progress-card__badge mia-progress-card__badge--low";
}

/**
 * AgentProgressIndicator — Real-time MIA pipeline progress from SSE.
 */
export default memo(function AgentProgressIndicator({
  currentStage,
  metadata,
  isActive,
  agentStatuses = {},
}) {
  const activeSpecialists = SPECIALIST_IDS.filter(
    (id) => agentStatuses[id] === "running" || agentStatuses[id] === "complete"
  );

  const stagesToShow = activeSpecialists.length > 0
    ? [...activeSpecialists, ...QA_STAGES.map((s) => s.id)]
    : ["context-retrieval", "writer", ...QA_STAGES.map((s) => s.id)];

  if (!isActive && !metadata) return null;

  if (!isActive && metadata) {
    return (
      <div className="mia-progress-card">
        <div className="mia-progress-card__completed-header">
          <div className="mia-progress-card__completed-icon">
            <CheckCircle2 size={14} />
          </div>
          <span className="mia-progress-card__completed-title">MIA Pipeline Complete</span>
        </div>
        <div className="mia-progress-card__stats">
          {metadata.factCheckIssues > 0 && (
            <span className="mia-progress-card__badge">
              {metadata.factCheckIssues} fact{metadata.factCheckIssues > 1 ? "s" : ""} corrected
            </span>
          )}
          {metadata.consistencyConflicts > 0 && (
            <span className="mia-progress-card__badge">
              {metadata.consistencyConflicts} inconsistenc{metadata.consistencyConflicts > 1 ? "ies" : "y"} resolved
            </span>
          )}
          {metadata.quality && (
            <span className={qualityBadgeClass(metadata.quality)}>
              Quality: {metadata.quality}
            </span>
          )}
          {metadata.rewriteCount > 0 && (
            <span className="mia-progress-card__badge">
              {metadata.rewriteCount} revision{metadata.rewriteCount > 1 ? "s" : ""} applied
            </span>
          )}
        </div>
        {metadata.totalTimeMs && (
          <p className="mia-progress-card__stage-desc" style={{ marginTop: 8 }}>
            Processed in {(metadata.totalTimeMs / 1000).toFixed(1)}s across {metadata.stages?.length || 0} stages
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mia-progress-card">
      <div className="mia-progress-card__eyebrow">MIA Pipeline Active</div>

      <div className="mia-progress-card__stage-list">
        {stagesToShow.map((stageId) => {
          const config = getStageConfig(stageId);
          const { Icon, label, description } = config;
          const status = agentStatuses[stageId] || (currentStage === stageId ? "running" : "idle");
          const isRunning = status === "running" || currentStage === stageId;
          const isComplete = status === "complete";
          const isError = status === "error";

          const dotClass = [
            "mia-progress-card__stage-dot",
            isRunning && "mia-progress-card__stage-dot--running",
            isComplete && "mia-progress-card__stage-dot--complete",
            isError && "mia-progress-card__stage-dot--error",
          ].filter(Boolean).join(" ");

          return (
            <div key={stageId} className="mia-progress-card__stage-row">
              <div className={dotClass}>
                {isComplete ? <CheckCircle2 size={14} /> : <Icon size={14} strokeWidth={2} />}
              </div>
              <div style={{ flex: 1 }}>
                <span className={`mia-progress-card__stage-label${isRunning ? " mia-progress-card__stage-label--running" : ""}`}>
                  {label}
                </span>
                {isRunning && (
                  <span className="mia-progress-card__stage-desc animate-pulse">
                    {description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
