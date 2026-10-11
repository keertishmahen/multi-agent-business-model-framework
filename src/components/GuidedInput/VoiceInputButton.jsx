import React, { useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import useVoiceInput from "../../hooks/useVoiceInput";

/**
 * VoiceInputButton — microphone button that uses the Web Speech API
 * to capture voice input. Shows clear mic on/off state.
 *
 * FIXED: Only sends final transcript (not interim repeats) to parent.
 *
 * Props:
 *   onTranscript: (text: string) => void — called with FINAL transcript text
 */
export default function VoiceInputButton({ onTranscript, compact = false, hideInlineError = false }) {
  const {
    transcript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput();

  // Track previous transcript to only send new content
  const lastSentRef = useRef("");

  // When transcript updates while listening, track it but don't send yet
  // Only send the final transcript when listening stops
  useEffect(() => {
    if (!isListening && transcript && transcript !== lastSentRef.current) {
      // Listening stopped — send the final transcript
      if (onTranscript) {
        onTranscript(transcript);
      }
      lastSentRef.current = transcript;
      resetTranscript();
    }
  }, [isListening, transcript, onTranscript, resetTranscript]);

  // Hide if not supported
  if (!isSupported) return null;

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      lastSentRef.current = "";
      resetTranscript();
      startListening();
    }
  };

  const btnStyle = compact
    ? (isListening ? styles.btnActiveCompact : styles.btnCompact)
    : (isListening ? styles.btnActive : styles.btn);

  const iconSize = compact ? 14 : 18;
  const iconColor = compact ? "var(--color-text-secondary)" : "#fff";

  return (
    <div style={compact ? styles.wrapperCompact : styles.wrapper}>
      <button
        type="button"
        style={btnStyle}
        onClick={handleClick}
        aria-label={isListening ? "Stop recording (mic is on)" : "Start voice input (mic is off)"}
        title={isListening ? "Mic ON — click to stop" : "Mic OFF — click to speak"}
      >
        {isListening ? (
          <MicOff size={iconSize} strokeWidth={2} color={iconColor} aria-hidden="true" />
        ) : (
          <Mic size={iconSize} strokeWidth={2} color={iconColor} aria-hidden="true" />
        )}
      </button>

      {/* Show recording state */}
      {isListening && !compact && (
        <span style={styles.recordingLabel}>Recording...</span>
      )}

      {error && !hideInlineError && !compact && (
        <span style={styles.errorText}>{error}</span>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#1A1A18",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    transition: "transform 0.15s",
  },
  btnActive: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "#1A1A18",
    border: "2.5px solid #DC2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  btnCompact: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(23, 33, 64, 0.12)",
    border: "1px solid rgba(23, 33, 64, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  },
  btnActiveCompact: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "rgba(23, 33, 64, 0.18)",
    border: "2px solid #DC2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  },
  wrapperCompact: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  recordingLabel: {
    fontSize: "0.7rem",
    color: "#DC2626",
    fontWeight: 500,
  },
  errorText: {
    fontSize: "0.7rem",
    color: "#DC2626",
    maxWidth: 120,
  },
};
