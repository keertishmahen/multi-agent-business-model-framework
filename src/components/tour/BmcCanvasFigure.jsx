import React from "react";
import { BMC_BLOCKS, BMC_PILLARS, BMC_PILLAR_ROWS } from "../../constants/bmcBlocks";

function BlockCell({ blockId }) {
  const block = BMC_BLOCKS[blockId];
  if (!block) return null;
  const Icon = block.Icon;
  return (
    <div
      className="bmc-figure__cell"
      style={{
        background: block.bgGlass || block.bg,
        borderColor: block.border,
        color: block.text,
      }}
    >
      {Icon && (
        <span className="bmc-figure__icon" aria-hidden="true">
          <Icon size={12} strokeWidth={2} />
        </span>
      )}
      <span className="bmc-figure__label">{block.label}</span>
    </div>
  );
}

/**
 * Compact expanded Business Model Canvas (11 blocks) for the guided tour.
 */
export default function BmcCanvasFigure() {
  const byId = Object.fromEntries(BMC_PILLARS.map((p) => [p.id, p]));
  const hero = byId.value;

  return (
    <div className="bmc-figure" role="img" aria-label="Expanded Business Model Canvas with 11 blocks">
      {hero && (
        <div className="bmc-figure__hero">
          <p className="bmc-figure__eyebrow">{hero.label}</p>
          {hero.blocks.map((id) => (
            <BlockCell key={id} blockId={id} />
          ))}
        </div>
      )}
      {BMC_PILLAR_ROWS.map((row) => (
        <div key={row.join("-")} className="bmc-figure__row">
          {row.map((pillarId) => {
            const pillar = byId[pillarId];
            if (!pillar) return null;
            return (
              <div key={pillar.id} className="bmc-figure__pillar">
                <p className="bmc-figure__eyebrow">{pillar.label}</p>
                <div className="bmc-figure__cells">
                  {pillar.blocks.map((id) => (
                    <BlockCell key={id} blockId={id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
