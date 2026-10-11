import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RagKnowledgeUpload, { validateFiles } from "./RagKnowledgeUpload";
import RagStep, { getCuratedContext } from "./RagStep";

const file = (name, size = 10) => {
  const f = new File(["x".repeat(size)], name, { type: "text/plain" });
  return f;
};

describe("validateFiles", () => {
  it("accepts supported types", () => {
    expect(validateFiles([file("a.pdf"), file("b.DOCX"), file("c.txt"), file("d.md")])).toBeNull();
  });
  it("rejects unsupported types, too many files and oversize files", () => {
    expect(validateFiles([file("sheet.xlsx")])).toMatch(/unsupported/);
    expect(validateFiles(Array.from({ length: 6 }, (_, i) => file(`f${i}.txt`)))).toMatch(/at most 5/);
    const big = file("big.txt");
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    expect(validateFiles([big])).toMatch(/larger than 10 MB/);
  });
});

describe("RagKnowledgeUpload", () => {
  it("shows the AI suggestions and uploaded documents", () => {
    render(
      <RagKnowledgeUpload
        suggestions={[{ category: "Supplier quotes", why: "pin down costs", examples: ["kiosk lease"] }]}
        documents={[{ docId: "d1", source: "grant.txt", chunks: 2 }]}
        onUpload={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    expect(screen.getByText("Suggested information to upload", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Supplier quotes")).toBeInTheDocument();
    expect(screen.getByText(/grant\.txt/)).toBeInTheDocument();
    expect(screen.getByText("2 chunks indexed")).toBeInTheDocument();
  });

  it("processes pasted text and clears the box", async () => {
    const onUpload = jest.fn().mockResolvedValue({});
    render(<RagKnowledgeUpload onUpload={onUpload} onDelete={jest.fn()} />);
    const box = screen.getByLabelText(/paste key background text/i);
    fireEvent.change(box, { target: { value: "Council grant 40%" } });
    fireEvent.click(screen.getByText(/Process knowledge sources/));
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith({ files: [], text: "Council grant 40%" }));
    await waitFor(() => expect(box.value).toBe(""));
  });

  it("shows the server error when an upload fails", async () => {
    const onUpload = jest.fn().mockRejectedValue(new Error("scan.pdf: no readable text found"));
    render(<RagKnowledgeUpload onUpload={onUpload} onDelete={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/paste key background text/i), { target: { value: "x" } });
    fireEvent.click(screen.getByText(/Process knowledge sources/));
    expect(await screen.findByRole("alert")).toHaveTextContent("no readable text found");
  });

  it("removes a document", async () => {
    const onDelete = jest.fn().mockResolvedValue({});
    render(
      <RagKnowledgeUpload
        documents={[{ docId: "d1", source: "grant.txt", chunks: 1 }]}
        onUpload={jest.fn()}
        onDelete={onDelete}
      />
    );
    fireEvent.click(screen.getByLabelText("Remove grant.txt"));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("d1"));
  });

  it("warns when uploads were lost to a server restart", () => {
    render(<RagKnowledgeUpload uploadsLost onUpload={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/no longer on the server/);
  });
});

const DATA = {
  bmcBlocks: [{ id: "b1", kind: "bmc", blockId: "channels", text: "channels: kiosks" }],
  priorSteps: [],
  uploads: [{ id: "u1", kind: "upload", source: "grant.txt", text: "Zebra-42 grant", relevance: 0.81 }],
  knowledge: [],
  coverageReport: { bmcBlocksRetrieved: 1, bmcBlocksTotal: 11, missingBmcBlocks: [] },
  agentRouting: { upload: ["market", "financial", "sdg", "critique"] },
  documents: [{ docId: "d1", source: "grant.txt", chunks: 1 }],
  excluded: [],
};

describe("RagStep with uploads", () => {
  it("lists uploaded evidence as its own group and routes it to every agent", () => {
    render(
      <RagStep data={DATA} onChange={() => {}} onRerun={() => {}} onApprove={() => {}}
        onUpload={jest.fn()} onDeleteDocument={jest.fn()} />
    );
    expect(screen.getByText("Your uploaded documents")).toBeInTheDocument();
    expect(screen.getByText(/Uploaded · 81% match/)).toBeInTheDocument();
    expect(screen.getByText("Add your own knowledge")).toBeInTheDocument();
    expect(screen.getAllByText("Critique").length).toBeGreaterThan(0);
  });

  it("excluding an upload keeps it out of the curated context", () => {
    const onChange = jest.fn();
    render(
      <RagStep data={DATA} onChange={onChange} onRerun={() => {}} onApprove={() => {}}
        onUpload={jest.fn()} onDeleteDocument={jest.fn()} />
    );
    fireEvent.click(screen.getByLabelText("Exclude grant.txt"));
    const updated = onChange.mock.calls[0][0];
    expect(updated.excluded).toEqual(["u1"]);
    expect(getCuratedContext(updated).map((i) => i.id)).toEqual(["b1"]);
  });

  it("includes uploads in the curated context by default", () => {
    expect(getCuratedContext(DATA).map((i) => i.id)).toEqual(["b1", "u1"]);
  });
});

describe("RagStep while an upload is in flight", () => {
  it("locks evidence toggles, Re-run and Approve", () => {
    render(
      <RagStep data={DATA} onChange={() => {}} onRerun={() => {}} onApprove={() => {}}
        onUpload={jest.fn()} onDeleteDocument={jest.fn()} loading />
    );
    expect(screen.getByLabelText("Exclude grant.txt")).toBeDisabled();
    expect(screen.getByText("Re-run retrieval")).toBeDisabled();
    expect(screen.getByText(/Generate Business Plan/)).toBeDisabled();
  });
});
