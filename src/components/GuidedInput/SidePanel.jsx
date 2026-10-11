import React from "react";

const PHASE_CONTEXT = {
  1: [
    { label: "Value Proposition", description: "What unique value your business offers to customers" },
    { label: "Customer Segments", description: "Who your primary audience is and what they need" },
    { label: "Channels", description: "How you reach and communicate with customers" },
  ],
  2: [
    { label: "Problem Statement", description: "The core tension your solution addresses" },
    { label: "Value Proposition", description: "How your solution uniquely resolves the problem" },
    { label: "Key Activities", description: "Critical actions required to deliver value" },
  ],
  3: [
    { label: "Customer Segments", description: "Who benefits most from your solution" },
    { label: "Channels", description: "How you reach your target audience effectively" },
    { label: "Customer Relationships", description: "How you build and maintain engagement" },
  ],
  4: [
    { label: "Value Proposition", description: "Your compiled unique value story" },
    { label: "Customer Segments", description: "Your defined audience groups" },
    { label: "Channels", description: "Your distribution and communication strategy" },
  ],
};

export default function SidePanel({ currentPhase, confidence }) {
  const contextItems = PHASE_CONTEXT[currentPhase] || PHASE_CONTEXT[1];

  return (
    <aside className="glass-info-card--brand guided-side-panel" aria-label="Context panel">
      <h3 className="guided-side-panel__heading">Why we&apos;re asking this</h3>

      <ul className="guided-side-panel__list">
        {contextItems.map((item) => (
          <li key={item.label}>
            <p className="guided-side-panel__label">{item.label}</p>
            <p className="guided-side-panel__desc">{item.description}</p>
          </li>
        ))}
      </ul>

      <div>
        <span className="glass-meta-chip">{confidence === "high" ? "High confidence" : "Confidence"}</span>
      </div>
    </aside>
  );
}
