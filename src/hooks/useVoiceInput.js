import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Check if the Web Speech API is available in the current browser.
 */
function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Error mapping table for SpeechRecognition error event types.
 * Maps error codes to user-friendly messages with recovery suggestions.
 * Never exposes raw error codes or technical internals to the user.
 *
 * Requirements: 3.5 (user-friendly error messages),
 *               3.6 (hide microphone when API unsupported)
 */
const ERROR_MAP = {
  "not-allowed": {
    message: "Microphone access denied",
    recovery: "Please allow microphone access in your browser settings to use voice input.",
  },
  "no-speech": {
    message: "Didn't catch that — try again or type your response",
    recovery: "Try speaking closer to the microphone, or type your response instead.",
  },
  "audio-capture": {
    message: "No microphone detected",
    recovery: "Please check that a microphone is connected and not in use by another app.",
  },
  "network": {
    message: "Network error during speech recognition",
    recovery: "Please check your internet connection and try again.",
  },
  "aborted": {
    message: null, // Silent handling — no user-facing message
    recovery: null,
  },
};

/**
 * Get a user-friendly error message and recovery suggestion for a
 * SpeechRecognition error type. For unknown error types, returns a
 * generic message without exposing technical internals.
 *
 * @param {string} errorType - The SpeechRecognition error event type
 * @returns {{ message: string | null, recovery: string | null }}
 */
export function getErrorMessage(errorType) {
  if (ERROR_MAP[errorType] !== undefined) {
    return ERROR_MAP[errorType];
  }

  // Generic fallback for unknown error types — never expose raw error codes
  return {
    message: "Something went wrong with voice input. Please try again.",
    recovery: "If the problem persists, try typing your response instead.",
  };
}

/**
 * useVoiceInput — Web Speech API wrapper for voice dictation.
 *
 * Provides startListening, stopListening, resetTranscript,
 * along with transcript, isListening, isSupported, and error state.
 *
 * Requirements: 3.1 (begin capturing speech with visual indicator),
 * 3.2 (real-time transcript display), 3.3 (finalize transcript on stop),
 * 3.4 (handle recognition errors with recovery options),
 * 3.5 (user-friendly error messages with recovery suggestions),
 * 3.6 (hide microphone when API unsupported)
 */
export default function useVoiceInput() {
  const SpeechRecognition = getSpeechRecognitionConstructor();
  const isSupported = SpeechRecognition !== null;

  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);

  /**
   * Start listening for speech input.
   * Creates a new SpeechRecognition instance, configures it for
   * continuous recognition with interim results, and begins capturing.
   */
  const startListening = useCallback(() => {
    if (!isSupported) return;

    // Clear any previous error
    setError(null);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      const { message, recovery } = getErrorMessage(event.error);

      // "aborted" is silently handled — no error shown to user
      if (message === null) {
        setIsListening(false);
        return;
      }

      // Combine message and recovery for the error state
      const userMessage = recovery
        ? `${message}. ${recovery}`
        : message;

      setError(userMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      setError("Something went wrong with voice input. Please try again.");
      setIsListening(false);
    }
  }, [isSupported, SpeechRecognition]);

  /**
   * Stop listening and finalize the transcript.
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  /**
   * Clear the transcript to an empty string.
   */
  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  // Cleanup on unmount: stop recognition if active
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
