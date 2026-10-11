export default function FormatCard({ format, icon, iconColor, description, onExport }) {
  return (
    <div className="format-card glass-content-card">
      <div
        className="format-card__icon"
        style={{ "--format-icon-color": iconColor }}
      >
        <span className="format-card__icon-glyph">{icon}</span>
      </div>
      <h3 className="format-card__title">{format}</h3>
      <p className="format-card__desc">{description}</p>
      <button type="button" className="btn-primary format-card__export" onClick={onExport}>
        Export
      </button>
    </div>
  );
}
