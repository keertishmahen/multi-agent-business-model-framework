import { memo } from "react";
import AgentCard from "./AgentCard";
import { AGENT_CONFIG, getActiveAgents } from "../../constants/agents";
import { resolveAgentDisplayStatus } from "../../utils/agentStatus";

/**
 * Central hub visualization — specialist agents for the current step.
 */
export default memo(function AgentHub({
  currentStepId,
  agentStatuses = {},
  onAgentClick,
}) {
  const activeAgents = getActiveAgents(currentStepId);
  const agentIds = Object.keys(AGENT_CONFIG);

  return (
    <div className="agent-hub agent-hub--corp">
      {agentIds.map((agentId) => {
        const status = resolveAgentDisplayStatus(agentId, agentStatuses, activeAgents);

        return (
          <AgentCard
            key={agentId}
            agentId={agentId}
            status={status}
            onClick={onAgentClick ? () => onAgentClick(agentId) : undefined}
            compact
          />
        );
      })}
    </div>
  );
});
