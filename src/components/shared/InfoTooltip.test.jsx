import { render, screen, fireEvent } from "@testing-library/react";
import InfoTooltip from "./InfoTooltip";

describe("InfoTooltip", () => {
  const defaultProps = {
    content: "This is a helpful explanation",
    ariaLabel: "Learn more about this feature",
  };

  it("renders the (i) icon trigger button", () => {
    render(<InfoTooltip {...defaultProps} />);
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("i");
  });

  it("does not show popover by default", () => {
    render(<InfoTooltip {...defaultProps} />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows popover with content on click", () => {
    render(<InfoTooltip {...defaultProps} />);
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    fireEvent.click(button);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent(defaultProps.content);
  });

  it("hides popover on second click (toggle)", () => {
    render(<InfoTooltip {...defaultProps} />);
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    fireEvent.click(button);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("dismisses popover on Escape key", () => {
    render(<InfoTooltip {...defaultProps} />);
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    fireEvent.click(button);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("dismisses popover on outside click", () => {
    render(
      <div>
        <span data-testid="outside">outside</span>
        <InfoTooltip {...defaultProps} />
      </div>
    );
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    fireEvent.click(button);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("sets aria-expanded to true when open", () => {
    render(<InfoTooltip {...defaultProps} />);
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("links trigger to popover via aria-describedby", () => {
    render(<InfoTooltip {...defaultProps} />);
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    expect(button).not.toHaveAttribute("aria-describedby");
    fireEvent.click(button);
    const tooltip = screen.getByRole("tooltip");
    expect(button).toHaveAttribute("aria-describedby", tooltip.id);
  });

  it("uses default ariaLabel when not provided", () => {
    render(<InfoTooltip content="Some text" />);
    expect(screen.getByRole("button", { name: "More information" })).toBeInTheDocument();
  });

  it("defaults to top position", () => {
    render(<InfoTooltip {...defaultProps} />);
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    fireEvent.click(button);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.bottom).toBe("calc(100% + 8px)");
  });

  it("renders with bottom position", () => {
    render(<InfoTooltip {...defaultProps} position="bottom" />);
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    fireEvent.click(button);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.top).toBe("calc(100% + 8px)");
  });

  it("renders with left position", () => {
    render(<InfoTooltip {...defaultProps} position="left" />);
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    fireEvent.click(button);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.right).toBe("calc(100% + 8px)");
  });

  it("renders with right position", () => {
    render(<InfoTooltip {...defaultProps} position="right" />);
    const button = screen.getByRole("button", { name: defaultProps.ariaLabel });
    fireEvent.click(button);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.left).toBe("calc(100% + 8px)");
  });
});
