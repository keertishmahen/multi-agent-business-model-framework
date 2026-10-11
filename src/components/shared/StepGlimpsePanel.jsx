import { STEPS } from "../../constants/steps";

/**
 * Compact layered card showing what the current workflow step delivers.
 */
export default function StepGlimpsePanel({ stepMeta, stepIdx, totalSteps = STEPS.length }) {
  if (!stepMeta?.glimpse) return null;

  const { outcome, inputs, outputs } = stepMeta.glimpse;
  const tooltipId = `step-glimpse-${stepMeta.id}`;

  return (
    <aside
      className="step-glimpse-panel"
      aria-labelledby={tooltipId}
      data-testid="step-glimpse-panel"
    >
      <div className="step-glimpse-panel__eyebrow">
        Step {stepIdx + 1} of {totalSteps}
      </div>
      <h3 id={tooltipId} className="step-glimpse-panel__title">
        {stepMeta.label}
      </h3>
      {stepMeta.subtitle && (
        <p className="step-glimpse-panel__subtitle">{stepMeta.subtitle}</p>
      )}
      <ul className="step-glimpse-panel__list">
        {outcome && (
          <li>
            <span className="step-glimpse-panel__label">Outcome</span>
            {outcome}
          </li>
        )}
        {inputs && (
          <li>
            <span className="step-glimpse-panel__label">Builds on</span>
            {inputs}
          </li>
        )}
        {outputs && (
          <li>
            <span className="step-glimpse-panel__label">Produces</span>
            {outputs}
          </li>
        )}
      </ul>
    </aside>
  );
}
