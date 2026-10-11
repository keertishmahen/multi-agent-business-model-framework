import { useState, useEffect } from "react";
import VoiceEnabledInput from "./VoiceEnabledInput";

/**
 * FeedbackBar — glass feedback dock (Figma Liquid Glass).
 * Renders in place inside the white `.mia-main` canvas as a sticky footer.
 */
export default function FeedbackBar({ stepLabel, onRefine, onApprove, loading, isLastStep }) {
  const [feedback, setFeedback] = useState("");
  const [refined, setRefined] = useState(false);

  useEffect(() => {
    document.body.classList.add("has-feedback-dock");
    return () => document.body.classList.remove("has-feedback-dock");
  }, []);

  const hintLabel = stepLabel
    ? `Refine the ${stepLabel.toLowerCase()} or approve to continue…`
    : "Refine the output or approve to continue…";

  async function handleRefine() {
    if (!feedback.trim()) return;
    await onRefine(feedback.trim());
    setRefined(true);
    setFeedback("");
  }

  return (
    <div className="feedback-dock-host" role="presentation">
      <div className="feedback-dock" role="region" aria-label="Step feedback">
        <div className="feedback-dock__input" onKeyDown={(e) => e.key === "Enter" && handleRefine()}>
          <VoiceEnabledInput
            value={feedback}
            onChange={setFeedback}
            placeholder={hintLabel}
            disabled={loading}
            ariaLabel="Refinement feedback"
            bare
            compact
          />
        </div>
        {refined && <span className="feedback-dock__refined">✓ Refined</span>}
        <div className="feedback-dock__actions">
          <button
            type="button"
            onClick={handleRefine}
            disabled={loading || !feedback.trim()}
            className="feedback-dock__refine-btn"
          >
            {loading ? "Refining…" : "Refine"}
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={loading}
            className="feedback-dock__approve-btn"
          >
            {isLastStep ? "✓ Finish" : "Approve & continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
