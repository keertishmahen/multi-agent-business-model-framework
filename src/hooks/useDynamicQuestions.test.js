import { renderHook, act } from "@testing-library/react";
import { useDynamicQuestions } from "./useDynamicQuestions";
import * as geminiClient from "../services/geminiClient";

// Mock the geminiClient module
jest.mock("../services/geminiClient");

describe("useDynamicQuestions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    geminiClient.callGemini.mockResolvedValue("What inspired that approach?");
  });

  describe("initial state", () => {
    it("starts with isGenerating false and followUpCount 0", () => {
      const { result } = renderHook(() => useDynamicQuestions());
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.followUpCount).toBe(0);
    });
  });

  describe("generateFollowUp", () => {
    it("calls callGemini and returns the follow-up question", async () => {
      const { result } = renderHook(() => useDynamicQuestions());

      let followUp;
      await act(async () => {
        followUp = await result.current.generateFollowUp(
          "I sell eco-friendly cleaning products",
          "basics",
          [{ role: "assistant", content: "Tell me about your business" }]
        );
      });

      expect(followUp).toBe("What inspired that approach?");
      expect(geminiClient.callGemini).toHaveBeenCalledTimes(1);
    });

    it("increments followUpCount after successful generation", async () => {
      const { result } = renderHook(() => useDynamicQuestions());

      await act(async () => {
        await result.current.generateFollowUp("answer", "basics", []);
      });

      expect(result.current.followUpCount).toBe(1);
    });

    it("returns null when followUpCount reaches max (2)", async () => {
      const { result } = renderHook(() => useDynamicQuestions());

      // Generate 2 follow-ups
      await act(async () => {
        await result.current.generateFollowUp("answer 1", "basics", []);
      });
      await act(async () => {
        await result.current.generateFollowUp("answer 2", "basics", []);
      });

      expect(result.current.followUpCount).toBe(2);

      // Third attempt should return null without calling LLM
      let followUp;
      await act(async () => {
        followUp = await result.current.generateFollowUp("answer 3", "basics", []);
      });

      expect(followUp).toBeNull();
      // callGemini should only have been called twice (not a third time)
      expect(geminiClient.callGemini).toHaveBeenCalledTimes(2);
    });

    it("returns null on LLM error without blocking user", async () => {
      geminiClient.callGemini.mockRejectedValue(new Error("Network failure"));

      const { result } = renderHook(() => useDynamicQuestions());

      let followUp;
      await act(async () => {
        followUp = await result.current.generateFollowUp("my answer", "problem", []);
      });

      expect(followUp).toBeNull();
      expect(result.current.isGenerating).toBe(false);
    });

    it("does not increment followUpCount on error", async () => {
      geminiClient.callGemini.mockRejectedValue(new Error("API error"));

      const { result } = renderHook(() => useDynamicQuestions());

      await act(async () => {
        await result.current.generateFollowUp("my answer", "basics", []);
      });

      expect(result.current.followUpCount).toBe(0);
    });

    it("returns null when LLM returns empty response", async () => {
      geminiClient.callGemini.mockResolvedValue("   ");

      const { result } = renderHook(() => useDynamicQuestions());

      let followUp;
      await act(async () => {
        followUp = await result.current.generateFollowUp("my answer", "basics", []);
      });

      expect(followUp).toBeNull();
    });

    it("formats conversation history as readable string in the prompt", async () => {
      const { result } = renderHook(() => useDynamicQuestions());

      const history = [
        { role: "assistant", content: "Tell me about your business" },
        { role: "user", content: "I run a bakery" },
        { role: "assistant", content: "Interesting! Who are your customers?" },
      ];

      await act(async () => {
        await result.current.generateFollowUp("Local families", "customers", history);
      });

      const promptArg = geminiClient.callGemini.mock.calls[0][0];
      expect(promptArg).toContain("Coach: Tell me about your business");
      expect(promptArg).toContain("User: I run a bakery");
      expect(promptArg).toContain("Coach: Interesting! Who are your customers?");
    });

    it("uses callGemini (not callGeminiJSON)", async () => {
      const { result } = renderHook(() => useDynamicQuestions());

      await act(async () => {
        await result.current.generateFollowUp("answer", "basics", []);
      });

      expect(geminiClient.callGemini).toHaveBeenCalled();
      // callGeminiJSON should not have been called
      if (geminiClient.callGeminiJSON) {
        expect(geminiClient.callGeminiJSON).not.toHaveBeenCalled();
      }
    });
  });

  describe("resetCount", () => {
    it("resets followUpCount to 0", async () => {
      const { result } = renderHook(() => useDynamicQuestions());

      // Generate a follow-up to increment count
      await act(async () => {
        await result.current.generateFollowUp("answer", "basics", []);
      });
      expect(result.current.followUpCount).toBe(1);

      // Reset
      act(() => {
        result.current.resetCount();
      });

      expect(result.current.followUpCount).toBe(0);
    });

    it("allows new follow-ups after reset", async () => {
      const { result } = renderHook(() => useDynamicQuestions());

      // Max out follow-ups
      await act(async () => {
        await result.current.generateFollowUp("answer 1", "basics", []);
      });
      await act(async () => {
        await result.current.generateFollowUp("answer 2", "basics", []);
      });
      expect(result.current.followUpCount).toBe(2);

      // Reset for next base question
      act(() => {
        result.current.resetCount();
      });

      // Should be able to generate again
      let followUp;
      await act(async () => {
        followUp = await result.current.generateFollowUp("new answer", "problem", []);
      });

      expect(followUp).toBe("What inspired that approach?");
      expect(result.current.followUpCount).toBe(1);
    });
  });

  describe("isGenerating state", () => {
    it("is true while LLM call is in flight", async () => {
      let resolvePromise;
      geminiClient.callGemini.mockImplementation(
        () => new Promise((resolve) => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() => useDynamicQuestions());

      let promise;
      act(() => {
        promise = result.current.generateFollowUp("answer", "basics", []);
      });

      // While in flight
      expect(result.current.isGenerating).toBe(true);

      // Resolve the call
      await act(async () => {
        resolvePromise("Follow-up question?");
        await promise;
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });
});
