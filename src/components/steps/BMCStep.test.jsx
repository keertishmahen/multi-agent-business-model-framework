import { render, screen } from "@testing-library/react";
import BMCStep from "./BMCStep";

describe("BMCStep", () => {
  const llmData = {
    bmc: [{
      value_proposition: "Safe water filters",
      canvas: {
        key_partners: ["Local health orgs"],
        key_activities: ["R&D"],
        key_resources: ["AI engineers"],
        value_propositions: ["Validated purity detection"],
        customer_relationships: ["Trust-building"],
        channels: ["Community distribution"],
        customer_segments: ["Low-income families"],
        revenue_streams: ["Unit sales"],
        cost_structure: ["Manufacturing"],
        social_environmental_cost: ["Filter cartridge waste"],
        social_environmental_benefit: ["Safe drinking water for 10k households"],
      },
    }],
  };

  it("renders Social and Environmental Cost and Benefit block labels", () => {
    render(<BMCStep data={llmData} />);
    expect(screen.getByText("Social and Environmental Cost")).toBeInTheDocument();
    expect(screen.getByText("Social and Environmental Benefit")).toBeInTheDocument();
  });

  it("shows impact items from LLM format", () => {
    render(<BMCStep data={llmData} />);
    expect(screen.getByText("Filter cartridge waste")).toBeInTheDocument();
    expect(screen.getByText("Safe drinking water for 10k households")).toBeInTheDocument();
  });

  it("renders legacy 9-block data with empty impact blocks", () => {
    const legacy = {
      bmc: [{
        canvas: {
          key_partners: ["Partner"],
          key_activities: ["Activity"],
          key_resources: ["Resource"],
          value_propositions: ["VP"],
          customer_relationships: ["Rel"],
          channels: ["Channel"],
          customer_segments: ["Segment"],
          revenue_streams: ["Revenue"],
          cost_structure: ["Cost"],
        },
      }],
    };
    render(<BMCStep data={legacy} />);
    expect(screen.getByText("Social and Environmental Cost")).toBeInTheDocument();
    expect(screen.getByText("Social and Environmental Benefit")).toBeInTheDocument();
  });

  it("uses five-pillar bento layout classes", () => {
    const { container } = render(<BMCStep data={llmData} />);
    expect(container.querySelector(".bmc-step")).toBeInTheDocument();
    expect(container.querySelector(".bmc-pillars")).toBeInTheDocument();
    expect(container.querySelector(".bmc-pillar--hero")).toBeInTheDocument();
    expect(container.querySelectorAll(".bmc-pillar")).toHaveLength(5);
    expect(container.querySelectorAll(".bmc-block")).toHaveLength(11);
    expect(container.querySelector(".bmc-grid")).not.toBeInTheDocument();
  });

  it("states the BMC definition in the open rather than behind a tooltip", () => {
    const { container } = render(<BMCStep data={llmData} />);
    const definition = container.querySelector(".bmc-definition");
    expect(definition).toBeInTheDocument();
    expect(definition.textContent).toMatch(/11-block template/i);
    // The old "Five-pillar business model · SDG-adapted" chip is gone.
    expect(container.querySelector(".bmc-footer")).not.toBeInTheDocument();
  });

  it("does not label pillars with eyebrow headings", () => {
    const { container } = render(<BMCStep data={llmData} />);
    expect(container.querySelector(".bmc-pillar__eyebrow")).not.toBeInTheDocument();
  });

  it("does not render the non-functional 'Refine this' control", () => {
    // Reported in feedback p5 as an icon that appeared on every step but did
    // nothing. The component behind it has been deleted; refinement happens
    // through the feedback dock instead.
    render(<BMCStep data={llmData} />);
    expect(screen.queryByText("Refine this")).not.toBeInTheDocument();
  });
});
