import fs from "fs";
import path from "path";
import { AGENT_CONFIG, ALL_AGENT_IDS, STEP_AGENTS, getActiveAgents } from "./agents";

const GENERATING_STEPS = [
  "focus",
  "issues",
  "tensions",
  "dilemmas",
  "values",
  "swot",
  "bmc",
  "plan",
];

describe("agent configuration", () => {
  it("defines the four MIA specialists", () => {
    expect(ALL_AGENT_IDS).toEqual(["market", "financial", "sdg", "critique"]);
  });

  it("gives every specialist a label and colour", () => {
    ALL_AGENT_IDS.forEach((id) => {
      expect(AGENT_CONFIG[id].label).toBeTruthy();
      expect(AGENT_CONFIG[id].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("orchestrates all four specialists on every generating step", () => {
    GENERATING_STEPS.forEach((step) => {
      expect(new Set(STEP_AGENTS[step])).toEqual(new Set(ALL_AGENT_IDS));
    });
  });

  it("has no agents for the story step, which generates nothing itself", () => {
    expect(getActiveAgents("story")).toEqual([]);
  });

  it("returns an empty list for an unknown step rather than throwing", () => {
    expect(getActiveAgents("nonsense")).toEqual([]);
  });

  // The backend seeds the pipeline and the frontend seeds the agent panel from
  // their own copies of this map. If they drift, cards never leave "Standby"
  // because the panel is waiting on an agent the server never runs.
  it("matches STEP_AGENT_MAP in the Python orchestrator", () => {
    const orchestrator = fs.readFileSync(
      path.join(__dirname, "../../server_py/app/agents/orchestrator.py"),
      "utf-8"
    );

    const block = orchestrator.match(/STEP_AGENT_MAP[^=]*=\s*\{([\s\S]*?)\n\}/);
    expect(block).not.toBeNull();

    const backendSteps = [...block[1].matchAll(/"(\w+)"\s*:/g)].map((m) => m[1]);
    expect(new Set(backendSteps)).toEqual(new Set(Object.keys(STEP_AGENTS)));

    // Every step in the Python map spreads the shared all-specialists dict.
    const perStep = [...block[1].matchAll(/"(\w+)"\s*:\s*([^,\n]+)/g)];
    perStep.forEach(([, step, value]) => {
      expect(value).toContain("_ALL_SPECIALISTS");
      expect(new Set(STEP_AGENTS[step])).toEqual(new Set(ALL_AGENT_IDS));
    });
  });
});
