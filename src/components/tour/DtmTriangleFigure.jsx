import React from "react";

const DRIVERS = [
  { id: "people", label: "People", hint: "Equity, access, community" },
  { id: "planet", label: "Planet", hint: "Climate, resources, nature" },
  { id: "prosperity", label: "Prosperity", hint: "Viability, jobs, growth" },
];

/**
 * Compact People–Planet–Prosperity triangle for the guided tour.
 */
export default function DtmTriangleFigure() {
  return (
    <div className="dtm-figure" role="img" aria-label="Dilemma Triangle: People, Planet, and Prosperity">
      <div className="dtm-figure__stage">
        <div className="dtm-figure__tri" aria-hidden="true" />
        <span className="dtm-figure__node dtm-figure__node--people">People</span>
        <span className="dtm-figure__node dtm-figure__node--planet">Planet</span>
        <span className="dtm-figure__node dtm-figure__node--prosperity">Prosperity</span>
        <span className="dtm-figure__center" aria-hidden="true">DTM</span>
      </div>
      <ul className="dtm-figure__legend">
        {DRIVERS.map((d) => (
          <li key={d.id} className={`dtm-figure__legend-item dtm-figure__legend-item--${d.id}`}>
            <strong>{d.label}</strong>
            <span>{d.hint}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
