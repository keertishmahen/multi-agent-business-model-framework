import React from "react";
import DtmTriangleFigure from "./tour/DtmTriangleFigure";
import BmcCanvasFigure from "./tour/BmcCanvasFigure";

/**
 * Renders a human-readable preview of the example data for a tour step.
 */
function ExampleDataPreview({ exampleData }) {
  if (!exampleData) return null;

  if (exampleData.dtmTriangle) {
    return <DtmTriangleFigure />;
  }

  if (exampleData.bmcCanvas) {
    return <BmcCanvasFigure />;
  }

  if (exampleData.bullets) {
    return (
      <ul className="tour-step__preview-list">
        {exampleData.bullets.map((item, i) => (
          <li key={i} className="tour-step__preview-item">
            <span aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (exampleData.steps) {
    return (
      <ol className="tour-step__preview-list tour-step__preview-list--numbered">
        {exampleData.steps.map((step, i) => (
          <li key={i} className="tour-step__preview-item">
            {step}
          </li>
        ))}
      </ol>
    );
  }

  if (exampleData.story) {
    return <p className="tour-step__preview-text">"{exampleData.story}"</p>;
  }

  if (exampleData.drivers) {
    return (
      <ul className="tour-step__preview-list">
        {exampleData.drivers.map((d, i) => (
          <li key={i} className="tour-step__preview-item">
            <span aria-hidden="true">•</span>
            <span>
              <span className="tour-step__preview-label">{d.driver}:</span> {d.focus}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (exampleData.issues) {
    return (
      <ul className="tour-step__preview-list">
        {exampleData.issues.map((issue, i) => (
          <li key={i} className="tour-step__preview-item">
            <span aria-hidden="true">•</span>
            <span>{issue}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (exampleData.tensions) {
    return (
      <ul className="tour-step__preview-list">
        {exampleData.tensions.map((t, i) => (
          <li key={i} className="tour-step__preview-item">
            <span aria-hidden="true">•</span>
            <span>
              {t.pair} — <em>Severity: {t.severity}</em>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (exampleData.dilemmas) {
    return (
      <ul className="tour-step__preview-list">
        {exampleData.dilemmas.map((d, i) => (
          <li key={i} className="tour-step__preview-item">
            <span aria-hidden="true">•</span>
            <span>
              {d.title} — <em>Score: {d.score}</em>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (exampleData.values) {
    return (
      <ul className="tour-step__preview-list">
        {exampleData.values.map((v, i) => (
          <li key={i} className="tour-step__preview-item">
            <span aria-hidden="true">•</span>
            <span>{v}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (exampleData.swot) {
    const { strengths, weaknesses, opportunities, threats } = exampleData.swot;
    const categories = [
      { label: "Strengths", items: strengths },
      { label: "Weaknesses", items: weaknesses },
      { label: "Opportunities", items: opportunities },
      { label: "Threats", items: threats },
    ];
    return (
      <div>
        {categories.map((cat) => (
          <div key={cat.label} className="tour-step__preview-group">
            <span className="tour-step__preview-label">{cat.label}:</span>
            <ul className="tour-step__preview-list tour-step__preview-list--nested">
              {cat.items.map((item, i) => (
                <li key={i} className="tour-step__preview-item">
                  <span aria-hidden="true">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (exampleData.blocks) {
    const blockLabels = {
      keyPartners: "Key Partners",
      valuePropositions: "Value Propositions",
      customerSegments: "Customer Segments",
    };
    return (
      <div>
        {Object.entries(exampleData.blocks).map(([key, items]) => (
          <div key={key} className="tour-step__preview-group">
            <span className="tour-step__preview-label">
              {blockLabels[key] || key}:
            </span>
            <ul className="tour-step__preview-list tour-step__preview-list--nested">
              {items.map((item, i) => (
                <li key={i} className="tour-step__preview-item">
                  <span aria-hidden="true">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (exampleData.sections) {
    return (
      <ol className="tour-step__preview-list tour-step__preview-list--numbered">
        {exampleData.sections.map((section, i) => (
          <li key={i} className="tour-step__preview-item">
            {section}
          </li>
        ))}
      </ol>
    );
  }

  return null;
}

function previewEyebrow(exampleData) {
  if (!exampleData) return "Example";
  if (exampleData.dtmTriangle || exampleData.bmcCanvas) return "Figure";
  if (exampleData.steps) return "Process";
  if (exampleData.bullets) return "Overview";
  return "Example";
}

/**
 * TourStep — individual tour card with title, description, example, and nav.
 */
export default function TourStep({
  stepData,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onExit,
}) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;
  const eyebrow = previewEyebrow(stepData.exampleData);
  const isFigure =
    stepData.exampleData?.dtmTriangle || stepData.exampleData?.bmcCanvas;

  return (
    <article
      className={`tour-step-card animate-scale-in${isFigure ? " tour-step-card--figure" : ""}`}
      role="region"
      aria-label={`Tour step ${currentStep} of ${totalSteps}: ${stepData.title}`}
    >
      <header className="tour-step__header">
        <h2 className="tour-step__title">{stepData.title}</h2>
        <p className="tour-step__description">{stepData.description}</p>
      </header>

      <section className="tour-step-preview" aria-label={`${eyebrow} preview`}>
        <p className="tour-step-preview__eyebrow">{eyebrow}</p>
        <ExampleDataPreview exampleData={stepData.exampleData} />
      </section>

      <div className="tour-step__counter" aria-live="polite">
        Step {currentStep} of {totalSteps}
      </div>

      <nav className="tour-step__nav" aria-label="Tour navigation">
        <button
          type="button"
          onClick={onExit}
          className="tour-step__btn-exit"
          aria-label="Exit tour"
        >
          Exit tour
        </button>

        <div className="tour-step__nav-group">
          <button
            type="button"
            onClick={onBack}
            disabled={isFirstStep}
            className="btn-secondary tour-step__btn-back"
            aria-label="Go to previous tour step"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            className="btn-primary tour-step__btn-next"
            aria-label={isLastStep ? "Finish tour" : "Go to next tour step"}
          >
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </nav>
    </article>
  );
}
