import React, { useCallback } from "react";
import VoiceInputButton from "../GuidedInput/VoiceInputButton";
import useVoiceInput from "../../hooks/useVoiceInput";

// ──────────────────────────────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────────────────────────────
const styles = {
  wrapper: {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-sm, 8px)",
    width: "100%",
  },
  input: {
    flex: 1,
    fontFamily: "var(--font-sans)",
    fontSize: "0.875rem",
    color: "var(--color-text-primary)",
    background: "var(--color-bg, #FFFFFF)",
    border: "1.5px solid var(--color-border-mid, rgba(0,0,0,0.15))",
    borderRadius: "var(--radius-lg, 8px)",
    padding: "9px 13px",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  textarea: {
    flex: 1,
    fontFamily: "var(--font-sans)",
    fontSize: "0.875rem",
    color: "var(--color-text-primary)",
    background: "var(--color-bg, #FFFFFF)",
    border: "1.5px solid var(--color-border-mid, rgba(0,0,0,0.15))",
    borderRadius: "var(--radius-lg, 8px)",
    padding: "9px 13px",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    resize: "vertical",
    minHeight: 80,
    lineHeight: 1.5,
  },
};

// ──────────────────────────────────────────────────────────────────
//  VoiceEnabledInput Component
// ──────────────────────────────────────────────────────────────────

/**
 * VoiceEnabledInput — wrapper that pairs a text input (or textarea)
 * with a VoiceInputButton for speech-to-text input.
 *
 * When voice input produces text, it appends the transcript to the
 * current value via the onChange callback. Hides the microphone
 * button when the Web Speech API is not supported.
 *
 * Props:
 *   value: string — current input value
 *   onChange: (value: string) => void — called with updated value
 *   placeholder?: string — input placeholder text
 *   disabled?: boolean — disables input and voice button
 *   multiline?: boolean — renders a textarea instead of input
 *   ariaLabel?: string — accessible label for the input element
 *
 * Requirements: 3.1 (mic on every input), 3.6 (hide if unsupported)
 */
export default function VoiceEnabledInput({
  value,
  onChange,
  placeholder = "",
  disabled = false,
  multiline = false,
  ariaLabel,
  bare = false,
  compact = false,
}) {
  const { isSupported } = useVoiceInput();

  // Append voice transcript to current value
  const handleTranscript = useCallback(
    (transcript) => {
      if (!transcript) return;
      const separator = value && !value.endsWith(" ") ? " " : "";
      onChange(value + separator + transcript);
    },
    [value, onChange]
  );

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const inputProps = {
    value,
    onChange: handleChange,
    placeholder,
    disabled,
    "aria-label": ariaLabel,
    ...(bare
      ? { className: "feedback-dock__field" }
      : { style: multiline ? styles.textarea : styles.input }),
  };

  return (
    <div
      className={bare ? "feedback-dock__field-wrap" : undefined}
      style={bare ? undefined : styles.wrapper}
    >
      {multiline ? (
        <textarea {...inputProps} rows={4} />
      ) : (
        <input type="text" {...inputProps} />
      )}

      {isSupported && !disabled && (
        <VoiceInputButton onTranscript={handleTranscript} compact={compact} />
      )}
    </div>
  );
}
