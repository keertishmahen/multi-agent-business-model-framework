import { render, screen, fireEvent } from "@testing-library/react";
import RagStep, { getCuratedContext } from "./RagStep";

const DATA = {
  bmcBlocks: [
    { id: "s:bmc:value_propositions", kind: "bmc", blockId: "value_propositions", text: "value propositions: refills" },
  ],
  priorSteps: [{ id: "s:swot", kind: "step", step: "swot", text: "SWOT text" }],
  knowledge: [
    { id: "sdg_knowledge:12", kind: "knowledge", source: "sdg_knowledge", title: "SDG 12", text: "Responsible consumption", relevance: 0.78 },
  ],
  coverageReport: { bmcBlocksRetrieved: 1, bmcBlocksTotal: 11, missingBmcBlocks: ["channels"] },
  agentRouting: { bmc: ["market", "financial"], step: ["market"], sdg_knowledge: ["sdg"] },
  excluded: [],
};

describe("RagStep", () => {
  it("shows coverage, grouped evidence, agent routing and missing blocks", () => {
    render(<RagStep data={DATA} onChange={() => {}} onRerun={() => {}} onApprove={() => {}} />);
    expect(screen.getByText("1/11")).toBeInTheDocument();
    expect(screen.getByText("Value Propositions")).toBeInTheDocument();
    expect(screen.getByText("SWOT")).toBeInTheDocument();
    expect(screen.getByText(/SDG knowledge · 78% match/)).toBeInTheDocument();
    expect(screen.getByText(/Not grounded yet: Channels/)).toBeInTheDocument();
    expect(screen.getAllByText("Financial").length).toBeGreaterThan(0);
  });

  it("toggling an item records it as excluded", () => {
    const onChange = jest.fn();
    render(<RagStep data={DATA} onChange={onChange} onRerun={() => {}} onApprove={() => {}} />);
    fireEvent.click(screen.getByLabelText("Exclude SWOT"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ excluded: ["s:swot"] }));
  });

  it("approve hands off to the plan", () => {
    const onApprove = jest.fn();
    render(<RagStep data={DATA} onChange={() => {}} onRerun={() => {}} onApprove={onApprove} />);
    fireEvent.click(screen.getByText(/Generate Business Plan/));
    expect(onApprove).toHaveBeenCalled();
  });
});

describe("getCuratedContext", () => {
  it("returns every item except the excluded ones", () => {
    const curated = getCuratedContext({ ...DATA, excluded: ["s:swot"] });
    expect(curated.map((i) => i.id)).toEqual(["s:bmc:value_propositions", "sdg_knowledge:12"]);
  });

  it("is empty without a RAG output", () => {
    expect(getCuratedContext(undefined)).toEqual([]);
  });
});
