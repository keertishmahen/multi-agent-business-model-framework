import { render, screen } from "@testing-library/react";
import StepGlimpsePanel from "./StepGlimpsePanel";

const stepWithGlimpse = {
  id: "bmc",
  label: "Business Model Canvas",
  subtitle: "Your business model across five pillars",
  glimpse: {
    outcome: "A complete 11-block canvas for your selected value proposition.",
    inputs: "Selected SWOT and value proposition",
    outputs: "Expanded BMC ready for the business plan",
  },
};

describe("StepGlimpsePanel", () => {
  it("renders glimpse bullets for a step with glimpse data", () => {
    render(<StepGlimpsePanel stepMeta={stepWithGlimpse} stepIdx={7} totalSteps={9} />);

    expect(screen.getByText("Step 8 of 9")).toBeInTheDocument();
    expect(screen.getByText("Business Model Canvas")).toBeInTheDocument();
    expect(screen.getByText(/complete 11-block canvas/i)).toBeInTheDocument();
    expect(screen.getByText(/Selected SWOT/i)).toBeInTheDocument();
    expect(screen.getByText(/Expanded BMC/i)).toBeInTheDocument();
  });

  it("renders nothing when glimpse is missing", () => {
    const { container } = render(
      <StepGlimpsePanel stepMeta={{ id: "story", label: "Story" }} stepIdx={0} />
    );
    expect(container.firstChild).toBeNull();
  });
});
