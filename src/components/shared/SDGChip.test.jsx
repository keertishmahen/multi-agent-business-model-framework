import { render, screen } from "@testing-library/react";
import SDGChip from "./SDGChip";

describe("SDGChip", () => {
  it("shows SDG number and full name for numbered labels", () => {
    render(<SDGChip label="SDG 3" />);
    expect(screen.getByText("SDG 3 · Good Health and Well-being")).toBeInTheDocument();
  });

  it("shows SDG number and full name for double-digit labels", () => {
    render(<SDGChip label="SDG 10" />);
    expect(screen.getByText("SDG 10 · Reduced Inequalities")).toBeInTheDocument();
  });

  it("parses colon-form labels with SDG number", () => {
    render(<SDGChip label="SDG 7: Affordable and Clean Energy" />);
    expect(screen.getByText("SDG 7 · Affordable and Clean Energy")).toBeInTheDocument();
  });

  it("resolves goal name-only labels to SDG number", () => {
    render(<SDGChip label="Reduced Inequalities" />);
    expect(screen.getByText("SDG 10 · Reduced Inequalities")).toBeInTheDocument();
  });
});
