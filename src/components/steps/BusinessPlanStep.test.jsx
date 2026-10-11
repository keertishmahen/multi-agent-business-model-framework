import { render, screen, fireEvent } from "@testing-library/react";
import BusinessPlanStep from "./BusinessPlanStep";

jest.mock("../shared/ExportModal", () => function MockExportModal() {
  return null;
});

jest.mock("react-markdown", () => function MockMarkdown({ children }) {
  return <div data-testid="markdown">{children}</div>;
});

jest.mock("remark-gfm", () => () => {});

jest.mock("../../services/exportService", () => ({
  exportToWord: jest.fn(),
  exportToText: jest.fn(),
  exportToPowerPoint: jest.fn(),
  exportToNotion: jest.fn(),
}));

describe("BusinessPlanStep completion panel", () => {
  const baseProps = {
    planText: "# Business Plan\n\nSection one.",
    selectedVP: { title: "Eco VP" },
    story: "Eco story",
    swotData: {},
    bmcData: {},
    outputs: { plan: "# Business Plan" },
    onRefine: jest.fn(),
    loading: false,
    onRequestSaveAndStartFresh: jest.fn(),
    savedPlansCount: 2,
    onViewSavedPlans: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows completion panel when plan exists and save handler is provided", () => {
    render(<BusinessPlanStep {...baseProps} />);
    expect(screen.getByText("Your business plan is complete")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save & start new plan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view saved plans \(2\)/i })).toBeInTheDocument();
  });

  it("calls onRequestSaveAndStartFresh when CTA clicked", () => {
    render(<BusinessPlanStep {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /save & start new plan/i }));
    expect(baseProps.onRequestSaveAndStartFresh).toHaveBeenCalledTimes(1);
  });

  it("calls onViewSavedPlans from completion panel", () => {
    render(<BusinessPlanStep {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /view saved plans \(2\)/i }));
    expect(baseProps.onViewSavedPlans).toHaveBeenCalledTimes(1);
  });

  it("hides completion panel when plan text is missing", () => {
    render(<BusinessPlanStep {...baseProps} planText="" />);
    expect(screen.queryByText("Your business plan is complete")).not.toBeInTheDocument();
  });
});
