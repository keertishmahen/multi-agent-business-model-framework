import React from 'react';

/**
 * BackButton — Step-level back navigation button.
 * Renders a left-arrow with "Back" label, styled consistently
 * with existing navigation elements (btn-secondary pattern).
 *
 * Requirements: 7.1
 */
export default function BackButton({ onBack, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onBack}
      disabled={disabled}
      aria-label="Go back to previous step"
      className="btn-secondary"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 500,
        padding: '8px 14px',
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>←</span>
      Back
    </button>
  );
}
