import { render, screen, fireEvent } from "@testing-library/react";
import SDGMapperModal from "./SDGMapperModal";

describe("SDGMapperModal", () => {
  it("calls onClose when close button clicked", () => {
    const onClose = jest.fn();
    render(<SDGMapperModal isOpen onClose={onClose} alignments={[]} />);
    fireEvent.click(screen.getByLabelText("Close SDG Mapper"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = jest.fn();
    const { container } = render(<SDGMapperModal isOpen onClose={onClose} alignments={[]} />);
    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key", () => {
    const onClose = jest.fn();
    render(<SDGMapperModal isOpen onClose={onClose} alignments={[]} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render when closed", () => {
    render(<SDGMapperModal isOpen={false} onClose={() => {}} alignments={[]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
