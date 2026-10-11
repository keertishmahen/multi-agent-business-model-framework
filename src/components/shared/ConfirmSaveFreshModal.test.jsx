import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmSaveFreshModal from "./ConfirmSaveFreshModal";

describe("ConfirmSaveFreshModal", () => {
  it("calls onConfirm when confirmed and onClose when cancelled", () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    render(
      <ConfirmSaveFreshModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /save & start new plan/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does not render when closed", () => {
    render(
      <ConfirmSaveFreshModal
        isOpen={false}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
