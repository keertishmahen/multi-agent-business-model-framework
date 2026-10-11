import { render, screen, fireEvent } from "@testing-library/react";
import SavedPlansModal from "./SavedPlansModal";

describe("SavedPlansModal", () => {
  const archives = [
    {
      id: "archive_1",
      savedAt: "2026-07-26T12:00:00.000Z",
      label: "Eco VP",
      persistableState: { story: "Eco" },
    },
  ];

  it("renders archived plans and handles restore/delete", () => {
    const onRestore = jest.fn();
    const onDelete = jest.fn();
    render(
      <SavedPlansModal
        isOpen
        onClose={() => {}}
        archives={archives}
        onRestore={onRestore}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText("Eco VP")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^resume$/i }));
    expect(onRestore).toHaveBeenCalledWith("archive_1");

    fireEvent.click(screen.getByLabelText("Delete saved plan Eco VP"));
    expect(onDelete).toHaveBeenCalledWith("archive_1");
  });

  it("does not render when closed", () => {
    render(
      <SavedPlansModal
        isOpen={false}
        onClose={() => {}}
        archives={archives}
        onRestore={() => {}}
        onDelete={() => {}}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
