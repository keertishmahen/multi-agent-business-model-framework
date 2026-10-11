import { render, screen } from "@testing-library/react";
import AgentCard from "./AgentCard";

describe("AgentCard", () => {
  it("renders market agent label", () => {
    render(<AgentCard agentId="market" status="idle" />);
    expect(screen.getByText("Market Research")).toBeInTheDocument();
  });

  it("shows analyzing state when running", () => {
    render(<AgentCard agentId="sdg" status="running" />);
    expect(screen.getByText("Analyzing")).toBeInTheDocument();
  });

  it("shows complete without confidence percentage", () => {
    render(<AgentCard agentId="financial" status="complete" />);
    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("shows unavailable for error status", () => {
    render(<AgentCard agentId="critique" status="error" />);
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Direct mode/)).toBeInTheDocument();
  });

  it("shows limited analysis for degraded fallback", () => {
    render(<AgentCard agentId="sdg" status="degraded" />);
    expect(screen.getByText("Limited analysis")).toBeInTheDocument();
    expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
  });
});
