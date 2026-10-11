import { render, screen } from "@testing-library/react";
import StepNav from "./StepNav";

describe("StepNav", () => {
  it("renders step numbers 1 through 9", () => {
    render(
      <StepNav
        currentStepId="issues"
        completedIds={["story", "focus"]}
        onStepClick={() => {}}
      />
    );

    for (let n = 1; n <= 9; n++) {
      expect(screen.getByRole("button", { name: new RegExp(`Step ${n}:`) })).toHaveTextContent(String(n));
    }
  });

  it("shows numbers for completed steps instead of checkmarks", () => {
    render(
      <StepNav
        currentStepId="issues"
        completedIds={["story", "focus"]}
        onStepClick={() => {}}
      />
    );

    const step1 = screen.getByRole("button", { name: /Step 1:.*completed/i });
    expect(step1).toHaveTextContent("1");
    expect(step1.querySelector("svg")).toBeNull();
  });

  it("marks the active step with aria-current", () => {
    render(
      <StepNav
        currentStepId="issues"
        completedIds={["story", "focus"]}
        onStepClick={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: /Step 3:.*current/i })).toHaveAttribute("aria-current", "step");
  });
});
