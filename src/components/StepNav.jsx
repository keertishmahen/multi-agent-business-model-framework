import { STEPS } from "../constants/steps";

export default function StepNav({ currentStepId, completedIds, onStepClick }) {
  return (
    <div className="corp-stepper">
      <div className="corp-stepper__track">
        {STEPS.map((step, i) => {
          const done = completedIds.includes(step.id);
          const active = step.id === currentStepId;
          const isClickable = done || active;
          const glimpseId = step.glimpse ? `step-glimpse-tip-${step.id}` : undefined;

          const btnClass = [
            "corp-stepper__btn",
            active && "corp-stepper__btn--active",
            done && !active && "corp-stepper__btn--done",
            isClickable && "corp-stepper__btn--clickable",
          ].filter(Boolean).join(" ");

          const labelClass = [
            "corp-stepper__label",
            active && "corp-stepper__label--active",
            done && !active && "corp-stepper__label--done",
          ].filter(Boolean).join(" ");

          return (
            <div key={step.id} className="corp-stepper__row">
              <div className="corp-stepper__item">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={btnClass}
                  aria-label={`Step ${i + 1}: ${step.label}${done ? " (completed)" : active ? " (current)" : ""}`}
                  aria-current={active ? "step" : undefined}
                  aria-describedby={glimpseId}
                >
                  {i + 1}
                </button>
                {step.glimpse?.outcome && (done || active) && (
                  <span id={glimpseId} role="tooltip" className="corp-stepper__tooltip">
                    {step.glimpse.outcome}
                  </span>
                )}
                <div className="corp-stepper__label-wrap">
                  <span className={labelClass}>{step.label}</span>
                </div>
              </div>

              {i < STEPS.length - 1 && (
                <div
                  className={`corp-stepper__connector${done ? " corp-stepper__connector--done" : ""}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
