import { memo, useState, useDeferredValue } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ExportModal from "../shared/ExportModal";
import {
  exportToWord,
  exportToText,
  exportToPowerPoint,
  exportToNotion,
} from "../../services/exportService";

const REMARK_PLUGINS = [remarkGfm];

const markdownComponents = {
  h1: ({ children }) => <h1 className="plan-markdown__h1">{children}</h1>,
  h2: ({ children }) => <h2 className="plan-markdown__h2">{children}</h2>,
  h3: ({ children }) => <h3 className="plan-markdown__h3">{children}</h3>,
  h4: ({ children }) => <h4 className="plan-markdown__h4">{children}</h4>,
  p: ({ children }) => <p className="plan-markdown__p">{children}</p>,
  ul: ({ children }) => <ul className="plan-markdown__ul">{children}</ul>,
  ol: ({ children }) => <ol className="plan-markdown__ol">{children}</ol>,
  li: ({ children }) => <li className="plan-markdown__li">{children}</li>,
  table: ({ children }) => (
    <div className="plan-markdown__table-wrap">
      <table className="plan-markdown__table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="plan-markdown__thead">{children}</thead>,
  th: ({ children }) => <th className="plan-markdown__th">{children}</th>,
  td: ({ children }) => <td className="plan-markdown__td">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="plan-markdown__blockquote">{children}</blockquote>
  ),
  strong: ({ children }) => <strong className="plan-markdown__strong">{children}</strong>,
  code: ({ inline, children }) =>
    inline ? (
      <code className="plan-markdown__code">{children}</code>
    ) : (
      <pre className="plan-markdown__pre">
        <code>{children}</code>
      </pre>
    ),
};

const PlanMarkdownView = memo(function PlanMarkdownView({ content }) {
  if (!content) return null;
  return (
    <div className="glass-content-card markdown-container" style={styles.markdownContainer}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

function BusinessPlanStep({
  planText,
  selectedVP,
  story,
  swotData,
  bmcData,
  outputs,
  onRefine,
  loading,
  onRequestSaveAndStartFresh,
  savedPlansCount = 0,
  onViewSavedPlans,
}) {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const deferredPlanText = useDeferredValue(planText || "");

  async function handleExport(format) {
    const exportData = { planText, selectedVP, story, swotData, bmcData, outputs };

    try {
      switch (format) {
        case "docx":
          await exportToWord(exportData);
          break;
        case "pptx":
          await exportToPowerPoint(exportData);
          break;
        case "md":
          exportToNotion(exportData);
          break;
        case "txt":
          exportToText(exportData);
          break;
        default:
          exportToText(exportData);
      }
    } catch (e) {
      alert("Export error: " + e.message);
    }

    setExportModalOpen(false);
  }

  return (
    <div className="animate-fade-in">
      {selectedVP?.title && (
        <div style={styles.vpHeader}>
          📄 Business Plan — {selectedVP.title}
        </div>
      )}

      <PlanMarkdownView content={deferredPlanText} />

      <div className="glass-well" style={styles.refineSection}>
        <p style={styles.refineHint}>
          Not happy with a section? Provide feedback and refine the plan.
        </p>
        <div style={styles.refineRow}>
          <input
            placeholder="e.g. Expand the financial outlook section, add more about SDG alignment…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && feedback.trim() && onRefine(feedback.trim())
            }
            disabled={loading}
            style={styles.refineInput}
            aria-label="Refinement feedback"
          />
          <button
            onClick={() => feedback.trim() && onRefine(feedback.trim())}
            disabled={loading || !feedback.trim()}
            className="btn-secondary"
            style={styles.refineButton}
          >
            {loading ? "Refining…" : "⟳ Refine"}
          </button>
        </div>
      </div>

      <div className="glass-info-card--brand" style={styles.privacyReminder}>
        <div style={styles.privacyHeader}>
          <span style={styles.privacyIcon} aria-hidden="true">🔒</span>
          <span style={styles.privacyTitle}>Your data stays yours</span>
        </div>
        <p style={styles.privacyDescription}>
          Exporting generates a file locally in your browser. No data is sent to external servers.
        </p>
        <div style={styles.includedList}>
          <p style={styles.includedLabel}>What's included in your export:</p>
          <ul style={styles.includedItems}>
            <li>Business Plan (all 10 sections)</li>
            <li>SWOT Analysis appendix</li>
            <li>Business Model Canvas appendix</li>
            <li>Original story narrative</li>
            {selectedVP?.title && <li>Value Proposition: {selectedVP.title}</li>}
          </ul>
        </div>
      </div>

      <div className="export-glass-section" style={styles.exportSection}>
        <div style={styles.exportReady}>
          Your business plan is ready to export
        </div>
        <p style={styles.exportSubtext}>
          Choose from Word, PowerPoint, Notion, or plain text formats.
        </p>
        <button
          className="btn-primary"
          onClick={() => setExportModalOpen(true)}
          style={styles.exportButton}
        >
          📥 Export
        </button>
      </div>

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onExport={handleExport}
      />

      {planText && onRequestSaveAndStartFresh && (
        <div className="glass-info-card--brand" style={styles.completionPanel}>
          <div style={styles.completionHeader}>
            <span style={styles.completionIcon} aria-hidden="true">✓</span>
            <h3 style={styles.completionTitle}>Your business plan is complete</h3>
          </div>
          <p style={styles.completionDescription}>
            Export your plan anytime. When you&apos;re ready for a new idea, save this session locally and start again from Step 1.
          </p>
          <div style={styles.completionActions}>
            <button
              type="button"
              className="btn-primary"
              style={styles.saveFreshButton}
              onClick={onRequestSaveAndStartFresh}
              disabled={loading}
            >
              Save &amp; start new plan
            </button>
            {savedPlansCount > 0 && onViewSavedPlans && (
              <button
                type="button"
                className="btn-secondary"
                style={styles.viewSavedButton}
                onClick={onViewSavedPlans}
              >
                View saved plans ({savedPlansCount})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(BusinessPlanStep);

const styles = {
  vpHeader: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--color-brand)",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  markdownContainer: {
    maxWidth: 700,
    marginBottom: 32,
    flexDirection: "column",
    gap: 12,
  },
  refineSection: {
    marginBottom: 24,
  },
  refineHint: {
    fontSize: 13,
    color: "var(--color-text-secondary)",
    marginBottom: 10,
    margin: "0 0 10px",
  },
  refineRow: {
    display: "flex",
    gap: 10,
  },
  refineInput: {
    flex: 1,
    fontSize: 13,
  },
  refineButton: {
    fontSize: 13,
    flexShrink: 0,
  },
  privacyReminder: {
    marginBottom: 24,
  },
  privacyHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  privacyIcon: {
    fontSize: "1rem",
  },
  privacyTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "var(--color-text-primary)",
  },
  privacyDescription: {
    fontSize: "0.8125rem",
    color: "var(--color-text-secondary)",
    lineHeight: 1.5,
    margin: "0 0 10px",
  },
  includedList: {
    marginTop: 8,
  },
  includedLabel: {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "var(--color-text-muted)",
    margin: "0 0 6px",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  includedItems: {
    margin: 0,
    paddingLeft: 18,
    fontSize: "0.8125rem",
    color: "var(--color-text-secondary)",
    lineHeight: 1.7,
  },
  exportSection: {
    textAlign: "center",
  },
  exportReady: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--color-brand)",
    marginBottom: 6,
  },
  exportSubtext: {
    fontSize: 12,
    color: "var(--color-text-secondary)",
    marginBottom: 16,
    margin: "0 0 16px",
    lineHeight: 1.5,
  },
  exportButton: {
    fontSize: 14,
  },
  completionPanel: {
    marginTop: 32,
    textAlign: "left",
  },
  completionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  completionIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "var(--color-brand, #0A6E4E)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  completionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    margin: 0,
  },
  completionDescription: {
    fontSize: "0.8125rem",
    color: "var(--color-text-secondary)",
    lineHeight: 1.6,
    margin: "0 0 16px",
  },
  completionActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  saveFreshButton: {
    fontSize: 14,
  },
  viewSavedButton: {
    fontSize: 14,
  },
};
