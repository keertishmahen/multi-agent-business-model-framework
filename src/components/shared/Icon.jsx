import React from 'react';

/**
 * Shared inline SVG icon components for the Business Model Studio UI.
 * All icons accept `size` and `color` props with sensible defaults.
 * Decorative icons include role="img" and aria-hidden="true".
 */

/**
 * ShieldIcon — teal shield for onboarding capability cards.
 * Default: 32px, var(--color-brand) teal.
 */
export function ShieldIcon({ size = 32, color = 'var(--color-brand)', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 2L4 5.5V11C4 16.25 7.4 21.15 12 22.5C16.6 21.15 20 16.25 20 11V5.5L12 2Z"
        fill={color}
        opacity="0.15"
      />
      <path
        d="M12 2L4 5.5V11C4 16.25 7.4 21.15 12 22.5C16.6 21.15 20 16.25 20 11V5.5L12 2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12L11 14L15 10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * RobotIcon — 24px circle with brand background and white robot glyph for AI chat bubbles.
 */
export function RobotIcon({ size = 24, color = 'var(--color-brand)', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="12" fill={color} />
      <rect x="7" y="9" width="10" height="8" rx="2" fill="white" />
      <circle cx="9.5" cy="12.5" r="1.25" fill={color} />
      <circle cx="14.5" cy="12.5" r="1.25" fill={color} />
      <rect x="11" y="6" width="2" height="3" rx="1" fill="white" />
      <rect x="10" y="5" width="4" height="2" rx="1" fill="white" />
    </svg>
  );
}

/**
 * MicrophoneIcon — 36px touch target for chat input voice button.
 */
export function MicrophoneIcon({ size = 36, color = 'var(--color-text-secondary)', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth="1.5" />
      <path
        d="M5 11C5 14.866 8.134 18 12 18C15.866 18 19 14.866 19 11"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 18V22"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9 22H15"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * SendIcon — 36px touch target for chat input send button.
 */
export function SendIcon({ size = 36, color = 'var(--color-brand)', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M22 2L11 13"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color}
        fillOpacity="0.1"
      />
    </svg>
  );
}

/**
 * CheckmarkIcon — white checkmark for completed steps in progress indicators.
 */
export function CheckmarkIcon({ size = 16, color = '#FFFFFF', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5 13L9 17L19 7"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * ExternalLinkIcon — for detail panel source links (↗ style).
 */
export function ExternalLinkIcon({ size = 14, color = 'var(--color-text-muted)', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M18 13V19C18 20.1046 17.1046 21 16 21H5C3.89543 21 3 20.1046 3 19V8C3 6.89543 3.89543 6 5 6H11"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 3H21V9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 14L21 3"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
