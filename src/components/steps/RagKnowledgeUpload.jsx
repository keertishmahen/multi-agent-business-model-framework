import { useRef, useState } from "react";

/**
 * "Add your own knowledge" — the knowledge-upload half of the RAG step,
 * modelled on the SunMoksha reference (BMC_GenAI, "Knowledge Upload & RAG
 * Integration"): the AI suggests what to upload for this canvas, the user adds
 * files or pasted text, and the chunks become retrievable evidence that the
 * MIA agents use for the business plan.
 */

export const ACCEPTED_TYPES = ".pdf,.docx,.txt,.md";
export const MAX_FILES = 5;
export const MAX_FILE_MB = 10;

export function validateFiles(files) {
  if (files.length > MAX_FILES) return `Upload at most ${MAX_FILES} files at a time.`;
  for (const f of files) {
    const ext = `.${String(f.name).split(".").pop().toLowerCase()}`;
    if (!ACCEPTED_TYPES.split(",").includes(ext)) {
      return `${f.name}: unsupported file type. Use PDF, DOCX, TXT or MD.`;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) return `${f.name} is larger than ${MAX_FILE_MB} MB.`;
  }
  return null;
}

export default function RagKnowledgeUpload({
  suggestions = [],
  suggestionsError,
  documents = [],
  uploadsLost = false,
  onUpload,
  onDelete,
  disabled,
}) {
  const fileInput = useRef(null);
  const [files, setFiles] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setError(validateFiles(picked));
    setFiles(picked);
  };

  const process = async () => {
    const problem = validateFiles(files);
    if (problem) return setError(problem);
    if (!files.length && !text.trim()) return setError("Choose a file or paste some text first.");
    setBusy(true);
    setError(null);
    try {
      await onUpload({ files, text: text.trim() });
      setFiles([]);
      setText("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (e) {
      setError(e.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (docId) => {
    setBusy(true);
    setError(null);
    try {
      await onDelete(docId);
    } catch (e) {
      setError(e.message || "Could not remove the document.");
    } finally {
      setBusy(false);
    }
  };

  const locked = busy || disabled;

  return (
    <section className="rag-upload" aria-labelledby="rag-upload-title">
      <h3 id="rag-upload-title" className="rag-section__title">Add your own knowledge</h3>
      <p className="rag-section__hint">
        Optional. Upload documents or paste text (market studies, quotes, policies, impact data).
        They are indexed for this session only and used as evidence in your business plan.
      </p>

      {suggestions.length > 0 && (
        <div className="rag-upload__suggest">
          <p className="rag-upload__suggest-title">💡 Suggested information to upload</p>
          <ol className="rag-upload__suggest-list">
            {suggestions.map((s) => (
              <li key={s.category}>
                <strong>{s.category}</strong>
                {s.why && <> — {s.why}</>}
                {s.examples?.length > 0 && (
                  <span className="rag-upload__examples"> (e.g. {s.examples.join(", ")})</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
      {suggestionsError && !suggestions.length && (
        <p className="rag-section__hint">Suggestions unavailable right now — you can still upload.</p>
      )}

      {uploadsLost && (
        <div className="rag-warning" role="alert">
          Your uploaded files are no longer on the server (it restarted, or this is a resumed session). Please upload them again.
        </div>
      )}

      <div className="rag-upload__inputs">
        <label className="rag-upload__label" htmlFor="rag-upload-files">
          Documents (PDF, DOCX, TXT, MD · up to {MAX_FILES} files, {MAX_FILE_MB} MB each)
        </label>
        <input
          id="rag-upload-files"
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={pickFiles}
          disabled={locked}
          className="rag-upload__file"
        />
        <label className="rag-upload__label" htmlFor="rag-upload-text">
          Or paste key background text
        </label>
        <textarea
          id="rag-upload-text"
          className="rag-upload__text"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={locked}
          placeholder="e.g. Local council offers a 40% grant for rooftop solar in 2026…"
        />
      </div>

      {error && (
        <p className="rag-upload__error" role="alert">{error}</p>
      )}

      <div className="rag-actions rag-actions--start">
        <button
          type="button"
          className="btn-secondary"
          onClick={process}
          disabled={locked || (!files.length && !text.trim())}
        >
          {busy ? "Processing…" : "📚 Process knowledge sources"}
        </button>
      </div>

      {documents.length > 0 && (
        <ul className="rag-upload__docs" aria-label="Uploaded documents">
          {documents.map((d) => (
            <li key={d.docId} className="rag-upload__doc">
              <span className="rag-upload__doc-name">📄 {d.source}</span>
              <span className="rag-item__meta">{d.chunks} chunk{d.chunks === 1 ? "" : "s"} indexed</span>
              <button
                type="button"
                className="rag-upload__remove"
                onClick={() => remove(d.docId)}
                disabled={locked}
                aria-label={`Remove ${d.source}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
