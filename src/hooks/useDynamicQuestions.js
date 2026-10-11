import { useState, useCallback, useRef } from "react";
import { callGemini } from "../services/geminiClient";
import { PROMPTS } from "../constants/prompts";

const MAX_FOLLOW_UPS = 2;

/**
 * Hook for generating LLM-powered dynamic follow-up questions.
 * Calls Gemini after each user answer, tracks follow-up count per base question (max 2),
 * provides skip functionality, and resets count on next base question.
 *
 * @returns {object} { generateFollowUp, isGenerating, followUpCount, resetCount }
 */
export function useDynamicQuestions() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);
  const followUpCountRef = useRef(0);

  /**
   * Reset the follow-up counter (call when moving to the next base question).
   */
  const resetCount = useCallback(() => {
    setFollowUpCount(0);
    followUpCountRef.current = 0;
  }, []);

  /**
   * Format conversation history into a readable string for the prompt.
   * @param {Array} history - Array of message objects with role and content
   * @returns {string} Formatted conversation string
   */
  const formatHistory = useCallback((history) => {
    if (!history || history.length === 0) return "(No prior conversation)";

    return history
      .map((msg) => {
        const role = msg.role === "user" ? "User" : "Coach";
        return `${role}: ${msg.content}`;
      })
      .join("\n");
  }, []);

  /**
   * Generate a follow-up question based on the user's answer.
   * Returns null if the max follow-up limit is reached or on error.
   * Skips follow-ups for very short/trivial answers.
   *
   * @param {string} userAnswer - The user's latest answer
   * @param {string} phase - Current guided input phase (e.g., "basics", "problem", "customers")
   * @param {Array} history - Conversation history array
   * @returns {Promise<string|null>} The follow-up question or null
   */
  const generateFollowUp = useCallback(
    async (userAnswer, phase, history) => {
      // Check follow-up limit using ref for latest value
      if (followUpCountRef.current >= MAX_FOLLOW_UPS) {
        return null;
      }

      // Skip follow-ups for very short/trivial answers (less than 10 chars)
      // Words like "yes", "no", "ok", "sure" don't merit a follow-up
      const trimmedAnswer = userAnswer?.trim() || "";
      if (trimmedAnswer.length < 5) {
        return null;
      }

      setIsGenerating(true);

      try {
        const conversationHistory = formatHistory(history);
        const prompt = PROMPTS.dynamicFollowUp(trimmedAnswer, phase, conversationHistory);

        const response = await callGemini(prompt, {
          temperature: 0.7,
          maxTokens: 512,
        });

        let trimmed = response?.trim();
        if (!trimmed) {
          return null;
        }

        // Strip common preamble patterns the LLM might add despite instructions
        trimmed = trimmed
          .replace(/^(That's (great|interesting|a powerful|wonderful|fantastic)[^.]*[.!]\s*)/i, "")
          .replace(/^(Great[!.]?\s*)/i, "")
          .replace(/^(Interesting[!.]?\s*)/i, "")
          .replace(/^(To (clarify|understand better)[,:]?\s*)/i, "")
          .trim();

        if (!trimmed || trimmed.length < 5) {
          return null;
        }

        // Increment follow-up count
        followUpCountRef.current += 1;
        setFollowUpCount(followUpCountRef.current);

        return trimmed;
      } catch (error) {
        // Handle errors gracefully — return null so the user isn't blocked
        console.warn("[useDynamicQuestions] Failed to generate follow-up:", error.message);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [formatHistory]
  );

  return {
    generateFollowUp,
    isGenerating,
    followUpCount,
    resetCount,
  };
}
