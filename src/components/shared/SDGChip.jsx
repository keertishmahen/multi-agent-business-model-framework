import { SDG_COLORS } from "../../constants/steps";
import { resolveSDGFromLabel, parseSDGNumberFromLabel } from "../../constants/sdgs";

export default function SDGChip({ label, onClick, sdgNumber }) {
  const resolvedId = sdgNumber ?? parseSDGNumberFromLabel(label);
  const sdgDef = resolveSDGFromLabel(label) || (resolvedId ? resolveSDGFromLabel(`SDG ${resolvedId}`) : null);
  const displayId = sdgDef?.id ?? resolvedId;
  const displayName = sdgDef?.name ?? label;
  const color = sdgDef ? sdgDef.color : (SDG_COLORS[label] || "#888");
  const tooltip = sdgDef
    ? `SDG ${sdgDef.id} · ${sdgDef.name} — ${sdgDef.description}`
    : label;
  const isInteractive = Boolean(onClick);
  const chipText = displayId ? `SDG ${displayId} · ${displayName}` : displayName;

  return (
    <span
      onClick={onClick}
      title={tooltip}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: isInteractive ? "3px 10px" : "2px 8px",
        borderRadius: isInteractive ? 20 : 4,
        background: isInteractive ? color + "20" : color + "12",
        color,
        fontSize: 11,
        fontWeight: isInteractive ? 700 : 500,
        border: isInteractive ? `1px solid ${color}44` : "none",
        marginRight: 4,
        marginTop: 4,
        cursor: isInteractive ? "pointer" : "default",
        letterSpacing: 0.2,
        userSelect: "none",
      }}
    >
      {sdgDef?.icon && (
        <span aria-hidden="true" style={{ fontSize: 10, lineHeight: 1 }}>
          {sdgDef.icon}
        </span>
      )}
      {chipText}
    </span>
  );
}
