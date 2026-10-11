import { useState } from "react";

const EXAMPLES = [
  "I'm building a platform that connects smallholder farmers in West Africa to urban markets, cutting food waste and improving farmer income. Our main challenge is logistics and trust between buyers and sellers.",
  "We're a social enterprise retrofitting social housing with heat pumps and insulation in the UK. We work with councils and low-income homeowners. The big tension is upfront cost vs. long-term energy savings.",
  "Our startup makes biodegradable packaging from agricultural waste. We sell to food brands trying to reduce plastic use. We're post-MVP and looking to scale across Europe.",
];

export default function StoryStep({ onSubmit, initialText = "" }) {
  // Seed from the story already in workflow state so navigating back to step 1
  // shows what was written instead of an empty box (feedback p30, item 3).
  const [text, setText] = useState(initialText);
  const [exampleIdx, setExampleIdx] = useState(null);

  function selectExample(idx) {
    setText(EXAMPLES[idx]);
    setExampleIdx(idx);
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const ready = wordCount >= 20;

  return (
    <div className="animate-fade-in">
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 20, lineHeight: 1.7 }}>
        Describe your business idea, initiative, or project in your own words.
        The more context you share — your goals, who you serve, the problem you're solving — the better your plan will be.
        Aim for at least a few sentences.
      </p>

      {/* Example prompts */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>
          Not sure where to start? Use an example:
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => selectExample(i)}
              className="btn-ghost"
              style={{
                fontSize: 12, padding: "5px 12px",
                background: exampleIdx === i ? "var(--color-brand-light)" : undefined,
                borderColor: exampleIdx === i ? "var(--color-brand)" : undefined,
                color: exampleIdx === i ? "var(--color-brand)" : undefined,
              }}
            >
              Example {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-well" style={{ marginBottom: 20 }}>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setExampleIdx(null); }}
          placeholder="e.g. I'm building a platform that connects smallholder farmers in West Africa to urban markets…"
          style={{ minHeight: 200, fontSize: 14, lineHeight: 1.7, marginBottom: 8, background: "transparent", border: "none", boxShadow: "none", padding: 0 }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{
          fontSize: 12,
          color: ready ? "var(--color-brand-mid)" : "var(--color-text-muted)",
        }}>
          {wordCount} words{!ready && " — aim for at least 20"}
        </span>
      </div>

      <div className="glass-info-card--brand" style={{ marginBottom: 24 }}>
        <div className="glass-info-card--brand__label">Principle 3</div>
        <p className="glass-info-card--brand__body">
          <strong>Show what the agent inferred:</strong> After you submit, the agent will
          show you how it interpreted your story — sector, audience, SDG focus, stage, and any hidden
          stakeholders — so you can correct any misreadings before generation begins.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="btn-primary"
          onClick={() => ready && onSubmit(text.trim())}
          disabled={!ready}
          style={{ padding: "11px 28px", fontSize: 15, fontWeight: 600 }}
        >
          ✓ Looks right — generate →
        </button>
      </div>
    </div>
  );
}
