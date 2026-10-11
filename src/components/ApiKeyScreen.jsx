import { useState } from "react";
import { testApiKey } from "../utils/gemini";
import { APP_NAME, APP_DESCRIPTION } from "../constants/branding";

/**
 * ApiKeyScreen — aurora entry screen (Design System v2).
 */
export default function ApiKeyScreen({ onSubmit }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!key.trim()) { setError("Please enter your Gemini API key."); return; }
    setLoading(true);
    setError("");
    try {
      await testApiKey(key.trim());
      onSubmit(key.trim());
    } catch (e) {
      setError("Could not connect: " + e.message + ". Please check your key and try again.");
    }
    setLoading(false);
  }

  const features = [
    { icon: "◈", title: "What I can do", text: "Co-create a tailored, SDG-aligned business plan step by step." },
    { icon: "✕", title: "What I cannot do", text: "I cannot provide legal advice or guarantee market outcomes." },
    { icon: "🔒", title: "How your data is used", text: "Your data is sent only to Gemini. Your API key is never stored." },
  ];

  return (
    <div className="entry-screen">
      <div className="entry-card animate-fade-in-up">
        {/* Logo / brand */}
        <div className="entry-logo" aria-hidden="true">◈</div>
        <h1 className="entry-title">{APP_NAME}</h1>
        <p className="entry-subtitle">
          {APP_DESCRIPTION}<br />
          In about 30 minutes, co-create a tailored, actionable plan.
        </p>

        {/* Feature tiles */}
        <div className="entry-tiles">
          {features.map((f, i) => (
            <div key={i} className="entry-tile">
              <div className="entry-tile__icon" aria-hidden="true">{f.icon}</div>
              <div className="entry-tile__title">{f.title}</div>
              <div className="entry-tile__text">{f.text}</div>
            </div>
          ))}
        </div>

        {/* Glossary preview */}
        <div className="glass-card" style={{ padding: "16px 20px", marginBottom: 22 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500,
            color: "var(--color-text-muted)", marginBottom: 12,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            Glossary preview
          </div>
          {[
            { term: "SWOT", def: "Strengths, Weaknesses, Opportunities, Threats — a strategic analysis framework." },
            { term: "SDG", def: "Sustainable Development Goals set by the UN to address global challenges." },
            { term: "Value Proposition", def: "A clear statement of the unique value your product or service delivers." },
            { term: "Tension Matrix", def: "A view of where two of your goals push against each other." },
          ].map((g, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "110px 1fr", gap: 12,
              padding: "7px 0", borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{g.term}</span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{g.def}</span>
            </div>
          ))}
        </div>

        {/* API key input */}
        <div className="entry-form">
          <label
            htmlFor="gemini-api-key"
            style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", display: "block", marginBottom: 8 }}
          >
            Gemini API Key
          </label>
          <input
            id="gemini-api-key"
            type="password"
            placeholder="AIza••••••••••••••••••••••••••••••••••••••"
            value={key}
            onChange={e => { setKey(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ marginBottom: 6 }}
          />
          <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
            Get your free key at{" "}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
              style={{ color: "var(--color-brand-mid)", fontWeight: 500 }}>
              aistudio.google.com
            </a>. Your key is only used for this session and is never stored.
          </p>

          {error && (
            <div role="alert" style={{
              padding: "10px 14px", background: "var(--color-danger-light)",
              borderRadius: "var(--radius-md)", fontSize: 12,
              color: "var(--color-danger)", marginBottom: 14, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading || !key.trim()}
            style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15 }}
          >
            {loading ? "Connecting…" : "Start co-creating →"}
          </button>
        </div>
      </div>
    </div>
  );
}
