import React, { useEffect, useCallback } from "react";
import { useTour } from "../hooks/useTour";
import TourStep from "./TourStep";

/**
 * TourWalkthrough — full-screen overlay with TourStep cards and progress.
 */
export default function TourWalkthrough({ onComplete, onExit }) {
  const { isActive, currentStep, totalSteps, stepData, next, back, exit, start } = useTour();

  useEffect(() => {
    start();
  }, [start]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        exit();
        onExit();
      }
    },
    [exit, onExit]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleNext = useCallback(() => {
    if (currentStep === totalSteps) {
      exit();
      onComplete();
    } else {
      next();
    }
  }, [currentStep, totalSteps, next, exit, onComplete]);

  const handleExit = useCallback(() => {
    exit();
    onExit();
  }, [exit, onExit]);

  if (!isActive || !stepData) {
    return null;
  }

  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div
      className="tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Guided tour walkthrough"
    >
      <div className="tour-progress">
        <div className="tour-progress__track">
          <div
            className="tour-progress__fill"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label={`Tour progress: step ${currentStep} of ${totalSteps}`}
          />
        </div>
      </div>

      <TourStep
        stepData={stepData}
        currentStep={currentStep}
        totalSteps={totalSteps}
        onNext={handleNext}
        onBack={back}
        onExit={handleExit}
      />

      <div className="tour-progress__dots" aria-hidden="true">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          let dotClass = "tour-progress__dot";
          if (stepNum === currentStep) {
            dotClass += " tour-progress__dot--active";
          } else if (stepNum < currentStep) {
            dotClass += " tour-progress__dot--done";
          }
          return <span key={stepNum} className={dotClass} />;
        })}
      </div>
    </div>
  );
}
