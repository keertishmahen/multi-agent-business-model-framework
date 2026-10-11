import FormatCard from "./FormatCard";

/**
 * ExportModal — Full-screen export view with FormatCards.
 *
 * Converted from a modal overlay to a full-page section layout.
 * Shows a celebratory heading and three format cards in a horizontal row.
 *
 * Props:
 *   isOpen   – boolean controlling visibility
 *   onClose  – callback when user wants to dismiss (preserved for interface compat)
 *   onExport – callback receiving format ID string ("docx", "pptx", "md")
 *
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4
 */

const FORMAT_CARDS = [
  {
    id: "docx",
    format: "Word Document",
    icon: "W",
    iconColor: "#2563eb",
    description: "Full document with appendices, formatted for Microsoft Word.",
  },
  {
    id: "pptx",
    format: "PowerPoint Slides",
    icon: "P",
    iconColor: "#ea580c",
    description: "12-slide investor pitch deck from your full business plan.",
  },
  {
    id: "md",
    format: "Notion Page",
    icon: "N",
    iconColor: "#1e293b",
    description: "Markdown formatted for easy import into Notion workspaces.",
  },
];

export default function ExportModal({ isOpen, onClose, onExport }) {
  if (!isOpen) return null;

  return (
    <section className="export-modal-page">
      {/* Heading */}
      <h1 style={styles.heading}>Your business model is ready to export</h1>

      {/* Format cards row */}
      <div style={styles.cardsRow}>
        {FORMAT_CARDS.map((card) => (
          <FormatCard
            key={card.id}
            format={card.format}
            icon={card.icon}
            iconColor={card.iconColor}
            description={card.description}
            onExport={() => onExport(card.id)}
          />
        ))}
      </div>

      {/* Privacy reminder banner */}
      <div className="export-privacy-banner" role="status">
        <span style={styles.privacyIcon} aria-hidden="true">ℹ️</span>
        <span style={styles.privacyText}>
          Your data stays in your browser. Nothing is shared externally.
        </span>
      </div>
    </section>
  );
}

const styles = {
  page: {
    width: "100%",
    minHeight: "100%",
    padding: "48px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "32px",
  },
  heading: {
    fontSize: "1.75rem",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    textAlign: "center",
    margin: 0,
    lineHeight: 1.25,
  },
  cardsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "24px",
    width: "100%",
    maxWidth: 900,
  },
  /* Privacy reminder banner */
  privacyBanner: {
    width: "100%",
    maxWidth: 900,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "var(--color-bg, #F7F7F5)",
    borderRadius: "var(--radius-md, 8px)",
    padding: "12px 16px",
  },
  privacyIcon: {
    fontSize: "1.25rem",
    lineHeight: 1,
    flexShrink: 0,
  },
  privacyText: {
    fontSize: "0.8125rem",
    fontWeight: 400,
    color: "var(--color-text-secondary, #5C5C58)",
    lineHeight: 1.5,
  },
};
