import { render, screen, fireEvent } from "@testing-library/react";
import SDGMapperStep from "../steps/SDGMapperStep";

const sampleAlignments = [
  { sdgNumber: 1, name: "No Poverty", status: "undecided", localRelevance: "Global" },
  { sdgNumber: 7, name: "Affordable and Clean Energy", status: "strong", localRelevance: "Australia", evidenceSource: "Solar program" },
  { sdgNumber: 8, name: "Decent Work", status: "inferred", localRelevance: "Australia" },
];

describe("SDGMapperStep", () => {
  it("shows purpose intro and status legend", () => {
    render(<SDGMapperStep alignments={sampleAlignments} mappingReady canUnlockFilter />);
    expect(screen.getByText(/Why this map exists/i)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Status legend/i })).toBeInTheDocument();
    expect(screen.getByText(/Concrete, verifiable link to this SDG in your plan/i)).toBeInTheDocument();
  });

  it("filters SDGs strictly by local relevance when mapping ready", () => {
    render(<SDGMapperStep alignments={sampleAlignments} mappingReady canUnlockFilter />);
    fireEvent.change(screen.getByLabelText(/Filter SDGs by geographic relevance/i), {
      target: { value: "Australia" },
    });
    expect(screen.getByText(/Showing 2 of 17 SDGs relevant to Australia/i)).toBeInTheDocument();
    expect(screen.getByText(/Filtered by Australia — 2 of 17 SDGs shown/i)).toBeInTheDocument();
  });

  it("shows non-alignment reason for undecided SDGs when expanded", () => {
    const alignments = [
      {
        sdgNumber: 1,
        name: "No Poverty",
        status: "undecided",
        nonAlignmentReason: "This is a packaging business, not a poverty alleviation programme.",
      },
    ];
    render(<SDGMapperStep alignments={alignments} mappingReady canUnlockFilter onStatusChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /SDG 1: No Poverty/i }));
    expect(screen.getByText(/Why not directly related/i)).toBeInTheDocument();
    expect(screen.getByText(/not a direct contributor/i)).toBeInTheDocument();
  });

  it("shows BMC unlock message before filter is available", () => {
    render(<SDGMapperStep alignments={[]} mappingReady={false} canUnlockFilter={false} />);
    expect(screen.getByLabelText(/Filter SDGs by geographic relevance/i)).toBeDisabled();
    expect(screen.getByText(/Complete the Business Model Canvas step to unlock geographic filtering/i)).toBeInTheDocument();
  });

  it("shows retry when mapping failed after BMC", () => {
    const onRetry = jest.fn();
    render(
      <SDGMapperStep
        alignments={[]}
        mappingReady={false}
        canUnlockFilter
        mappingError="Could not generate SDG mapping."
        onRetryMapping={onRetry}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Retry SDG mapping/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("enables filter when mappingReady without requiring localRelevance count", () => {
    const alignments = [{ sdgNumber: 1, name: "No Poverty", status: "undecided" }];
    render(<SDGMapperStep alignments={alignments} mappingReady canUnlockFilter />);
    expect(screen.getByLabelText(/Filter SDGs by geographic relevance/i)).not.toBeDisabled();
  });
});
