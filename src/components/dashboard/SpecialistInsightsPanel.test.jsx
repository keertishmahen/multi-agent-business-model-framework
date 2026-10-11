import { render, screen } from "@testing-library/react";
import SpecialistInsightsPanel from "./SpecialistInsightsPanel";

describe("SpecialistInsightsPanel", () => {
  it("renders object warnings as text without crashing", () => {
    render(
      <SpecialistInsightsPanel
        specialists={{
          sdg: {
            insights: ["SDG 7: Clean energy"],
            warnings: [{
              type: "greenwashing",
              flag: "high",
              explanation: "Claims lack evidence",
              impact_metrics_recommendation: "Track CO2 savings",
            }],
            confidence: 0.85,
            sources: [],
          },
        }}
      />
    );

    expect(screen.getByText(/SDG 7: Clean energy/)).toBeInTheDocument();
    expect(screen.getByText(/Claims lack evidence/)).toBeInTheDocument();
  });

  it("renders critique insights from alternate schema keys", () => {
    render(
      <SpecialistInsightsPanel
        specialists={{
          critique: {
            insights: [],
            tensions: ["People vs Prosperity trade-off on pricing"],
            warnings: [],
            sources: [],
            failed: false,
          },
        }}
      />
    );

    expect(screen.getByText(/CRITIQUE/i)).toBeInTheDocument();
    expect(screen.getByText(/People vs Prosperity/)).toBeInTheDocument();
  });

  it("hides specialists with no displayable content", () => {
    const { container } = render(
      <SpecialistInsightsPanel
        specialists={{
          critique: { insights: [], warnings: [], sources: [], failed: false },
        }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("hides failed specialists with only timeout warnings", () => {
    const { container } = render(
      <SpecialistInsightsPanel
        activeAgentIds={["market", "sdg"]}
        specialists={{
          market: {
            failed: true,
            insights: [],
            warnings: ["Agent failed: Agent timed out after 30000ms"],
            sources: [],
          },
          sdg: {
            failed: true,
            insights: [],
            warnings: ["Agent failed: Agent timed out after 30000ms"],
            sources: [],
          },
        }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("scopes specialists to active agents for the current step", () => {
    render(
      <SpecialistInsightsPanel
        activeAgentIds={["sdg"]}
        specialists={{
          market: {
            insights: ["TAM $2B"],
            warnings: [],
            sources: [],
            failed: false,
          },
          sdg: {
            insights: ["SDG 7 alignment"],
            warnings: [],
            sources: [],
            failed: false,
          },
        }}
      />
    );

    expect(screen.queryByText(/TAM \$2B/)).not.toBeInTheDocument();
    expect(screen.getByText(/SDG 7 alignment/)).toBeInTheDocument();
  });
});
