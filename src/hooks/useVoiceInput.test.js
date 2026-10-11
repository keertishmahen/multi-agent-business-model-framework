import { getErrorMessage } from "./useVoiceInput";

describe("useVoiceInput - getErrorMessage", () => {
  describe("known error types map to user-friendly messages", () => {
    it('maps "not-allowed" to microphone access denied message', () => {
      const result = getErrorMessage("not-allowed");
      expect(result.message).toBe("Microphone access denied");
      expect(result.recovery).toContain("browser settings");
    });

    it('maps "no-speech" to try-again message', () => {
      const result = getErrorMessage("no-speech");
      expect(result.message).toBe(
        "Didn't catch that — try again or type your response"
      );
      expect(result.recovery).toBeTruthy();
    });

    it('maps "audio-capture" to no microphone message', () => {
      const result = getErrorMessage("audio-capture");
      expect(result.message).toBe("No microphone detected");
      expect(result.recovery).toContain("microphone");
    });

    it('maps "network" to network error message', () => {
      const result = getErrorMessage("network");
      expect(result.message).toBe("Network error during speech recognition");
      expect(result.recovery).toContain("internet connection");
    });

    it('maps "aborted" to silent handling (null message)', () => {
      const result = getErrorMessage("aborted");
      expect(result.message).toBeNull();
      expect(result.recovery).toBeNull();
    });
  });

  describe("unknown error types produce generic user-friendly message", () => {
    it("returns a generic message for unknown error types", () => {
      const result = getErrorMessage("some-unknown-error");
      expect(result.message).toBeTruthy();
      expect(result.message).not.toContain("some-unknown-error");
      expect(result.recovery).toBeTruthy();
    });

    it("never exposes raw error codes in messages", () => {
      const unknownErrors = [
        "service-not-allowed",
        "language-not-supported",
        "bad-grammar",
        "xyz123",
      ];

      unknownErrors.forEach((errorType) => {
        const result = getErrorMessage(errorType);
        // Message should not contain the raw error type
        if (result.message !== null) {
          expect(result.message).not.toContain(errorType);
        }
      });
    });

    it("handles empty string error type gracefully", () => {
      const result = getErrorMessage("");
      expect(result.message).toBeTruthy();
      expect(result.recovery).toBeTruthy();
    });
  });

  describe("messages never expose technical internals", () => {
    const ALL_ERROR_TYPES = [
      "not-allowed",
      "no-speech",
      "audio-capture",
      "network",
      "aborted",
      "random-unknown",
      "another-error",
    ];

    it.each(ALL_ERROR_TYPES)(
      'error type "%s" does not expose technical terms',
      (errorType) => {
        const result = getErrorMessage(errorType);
        if (result.message !== null) {
          expect(result.message).not.toMatch(/SpeechRecognition/i);
          expect(result.message).not.toMatch(/event\.error/i);
          expect(result.message).not.toMatch(/error code/i);
          expect(result.message).not.toMatch(/exception/i);
        }
      }
    );
  });
});
