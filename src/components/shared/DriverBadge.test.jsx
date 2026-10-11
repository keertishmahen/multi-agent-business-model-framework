import { render, screen } from "@testing-library/react";
import DriverBadge from "./DriverBadge";

describe("DriverBadge", () => {
  it("renders driver name", () => {
    render(<DriverBadge driver="Planet" />);
    expect(screen.getByText("Planet")).toBeInTheDocument();
  });

  it("applies colored background when emphasized", () => {
    render(<DriverBadge driver="People" emphasis={true} />);
    const badge = screen.getByText("People");
    expect(badge).toHaveStyle({ background: "var(--color-people-light)" });
  });

  it("renders muted label without pill background when not emphasized", () => {
    render(<DriverBadge driver="Prosperity" emphasis={false} />);
    const badge = screen.getByText("Prosperity");
    expect(badge).toHaveStyle({
      color: "var(--color-text-muted)",
      fontWeight: 400,
    });
    expect(badge.style.background).toBe("");
  });
});
