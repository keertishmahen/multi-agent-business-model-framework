import { useState, useMemo, useEffect } from "react";
import { TOOLTIP_CONTENT } from "../../constants/tooltips";
import { BMC_BLOCKS, BMC_PILLARS, BMC_PILLAR_ROWS } from "../../constants/bmcBlocks";
import { normalizeBlocks } from "../../utils/bmcFormat";

/**
 * A single editable item within a BMC block.
 */
function BMCItem({ item, blockId, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const handleStartEdit = () => {
    setEditText(item.text);
    setEditing(true);
  };

  const handleSave = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      onSave(blockId, item.id, trimmed);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditText(item.text);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (editing) {
    return (
      <div className="bmc-item__edit-row">
        <input
          type="text"
          className="bmc-item__edit-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            if (e.relatedTarget && e.relatedTarget.dataset.action === "delete") return;
            handleSave();
          }}
          autoFocus
          aria-label={`Edit item in ${BMC_BLOCKS[blockId]?.label || blockId}`}
        />
        <button
          type="button"
          data-action="delete"
          className="bmc-item__delete"
          onClick={() => onDelete(blockId, item.id)}
          aria-label={`Delete item: ${item.text}`}
          title="Delete item"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      className="bmc-item"
      role="button"
      tabIndex={0}
      onClick={handleStartEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleStartEdit();
        }
      }}
      aria-label={`Edit: ${item.text}`}
    >
      <span className="bmc-item__bullet">•</span>
      <span className="bmc-item__text">{item.text}</span>
    </div>
  );
}

/**
 * A single BMC block with heading, items, and add button.
 */
function BMCBlock({ blockId, config, items, onSave, onDelete, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const { Icon } = config;

  const impactClass =
    config.impactType === "cost"
      ? "bmc-block--impact-cost"
      : config.impactType === "benefit"
        ? "bmc-block--impact-benefit"
        : "";

  const handleAddSave = () => {
    const trimmed = newText.trim();
    if (trimmed) {
      onAdd(blockId, trimmed);
    }
    setNewText("");
    setAdding(false);
  };

  const handleAddKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setNewText("");
      setAdding(false);
    }
  };

  return (
    <div
      className={`bmc-block bmc-block--${blockId} ${impactClass}`}
      aria-label={`${config.label} block`}
    >
      <div className="bmc-block__header">
        {Icon && <Icon size={14} strokeWidth={2} aria-hidden="true" />}
        <span>{config.label}</span>
      </div>

      <div className="bmc-block__items">
        {items.map((item) => (
          <BMCItem
            key={item.id}
            item={item}
            blockId={blockId}
            onSave={onSave}
            onDelete={onDelete}
          />
        ))}
        {items.length === 0 && !adding && (
          <span className="bmc-block__empty">—</span>
        )}
      </div>

      {adding ? (
        <div className="bmc-block__add-row">
          <input
            type="text"
            className="bmc-block__add-input"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={handleAddKeyDown}
            onBlur={handleAddSave}
            autoFocus
            placeholder="New item..."
            aria-label={`Add new item to ${config.label}`}
          />
        </div>
      ) : (
        <button
          type="button"
          className="bmc-block__add-btn"
          onClick={() => setAdding(true)}
          aria-label={`Add item to ${config.label}`}
        >
          + Add item
        </button>
      )}
    </div>
  );
}

function BMCPillar({ pillar, renderBlock }) {
  const isHero = pillar.variant === "hero";

  return (
    <section
      className={`bmc-pillar bmc-pillar--${pillar.id}${isHero ? " bmc-pillar--hero" : ""}`}
      aria-label={`${pillar.label} pillar`}
    >
      {/* Pillar eyebrow labels ("Core Value" / "Who & How" / "How We Deliver")
          were removed: they were not part of the BMC and read as incorrect
          headings over the blocks (feedback p33, item 2). */}
      <div className="bmc-pillar__sections">
        {pillar.blocks.map((blockId) => (
          <div key={blockId} className={`bmc-section bmc-section--${blockId}`}>
            {renderBlock(blockId)}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * BMCStep — Five-pillar business model layout (11 editable sections).
 */
export default function BMCStep({ data, onEdit }) {
  const [blocks, setBlocks] = useState(() => normalizeBlocks(data));

  useEffect(() => {
    setBlocks(normalizeBlocks(data));
  }, [data]);

  const pillarById = useMemo(
    () => Object.fromEntries(BMC_PILLARS.map((p) => [p.id, p])),
    []
  );

  const heroPillar = pillarById.value;

  const emitEdit = (updatedBlocks) => {
    if (onEdit) {
      onEdit({ blocks: updatedBlocks });
    }
  };

  const handleSave = (blockId, itemId, newText) => {
    setBlocks((prev) => {
      const updated = { ...prev };
      updated[blockId] = prev[blockId].map((item) =>
        item.id === itemId ? { ...item, text: newText } : item
      );
      emitEdit(updated);
      return updated;
    });
  };

  const handleDelete = (blockId, itemId) => {
    setBlocks((prev) => {
      const updated = { ...prev };
      updated[blockId] = prev[blockId].filter((item) => item.id !== itemId);
      emitEdit(updated);
      return updated;
    });
  };

  const handleAdd = (blockId, text) => {
    setBlocks((prev) => {
      const updated = { ...prev };
      const newItem = { id: `${blockId}-${Date.now()}`, text };
      updated[blockId] = [...prev[blockId], newItem];
      emitEdit(updated);
      return updated;
    });
  };

  const renderBlock = (blockId) => (
    <BMCBlock
      key={blockId}
      blockId={blockId}
      config={BMC_BLOCKS[blockId]}
      items={blocks[blockId] || []}
      onSave={handleSave}
      onDelete={handleDelete}
      onAdd={handleAdd}
    />
  );

  return (
    <div className="bmc-step animate-fade-in" aria-label="Business Model Canvas">
      <div className="bmc-pillars">
        {heroPillar && (
          <BMCPillar pillar={heroPillar} renderBlock={renderBlock} />
        )}

        {BMC_PILLAR_ROWS.map((row) => (
          <div key={row.join("-")} className="bmc-pillars__row">
            {row.map((pillarId) => (
              <BMCPillar
                key={pillarId}
                pillar={pillarById[pillarId]}
                renderBlock={renderBlock}
              />
            ))}
          </div>
        ))}
      </div>

      {/* The definition used to sit behind an (i) tooltip, so it was effectively
          hidden (feedback p33, item 1). It is now stated plainly, and the
          "Five-pillar business model" chip is gone. */}
      <p className="bmc-definition">{TOOLTIP_CONTENT["bmc"]}</p>
    </div>
  );
}
