import { useState, useCallback, useRef } from "react";
import ChatInterface from "./ChatInterface";
import SidePanel from "./SidePanel";
import { compileStory } from "../../utils/compileStory";

const ALL_QUESTIONS = [
  "Tell me about your business idea in your own words. What's the name, what do you do, and what stage are you at?",
  "What problem are you solving, and how does your product or service address it?",
  "Who are your target customers? How do you reach them today or plan to?",
];

export default function GuidedInput({ onComplete, onBack }) {
  const [allResponses, setAllResponses] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "ai-0",
      role: "ai",
      content: ALL_QUESTIONS[0],
      timestamp: new Date().toISOString(),
    },
  ]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const contentAreaRef = useRef(null);

  const currentPhase = questionIndex < 1 ? 1 : questionIndex < 2 ? 2 : 3;
  const canContinue = allResponses.trim().length > 0;

  const handleSendMessage = useCallback((text) => {
    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setAllResponses((prev) => (prev ? `${prev}\n${text}` : text));
    setInputValue("");
  }, []);

  const handleNextBaseQuestion = useCallback(() => {
    const nextIdx = questionIndex + 1;
    if (nextIdx < ALL_QUESTIONS.length) {
      setQuestionIndex(nextIdx);
      setTimeout(() => {
        const aiMsg = {
          id: `ai-${nextIdx}`,
          role: "ai",
          content: ALL_QUESTIONS[nextIdx],
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }, 500);
    }
  }, [questionIndex]);

  const handlePhaseComplete = useCallback(() => {
    setTimeout(() => {
      const doneMsg = {
        id: `ai-done-${Date.now()}`,
        role: "ai",
        content: "Thanks! I have a good understanding of your business idea. Click Continue → when you're ready to generate your business plan.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, doneMsg]);
    }, 500);
  }, []);

  const isLastBaseQuestion = questionIndex >= ALL_QUESTIONS.length - 1;

  const handleBack = useCallback(() => {
    if (questionIndex > 0) {
      const prevIdx = questionIndex - 1;
      const targetId = `ai-${prevIdx}`;
      const targetMessageIdx = messages.findIndex((m) => m.id === targetId);
      const trimmed = targetMessageIdx >= 0
        ? messages.slice(0, targetMessageIdx + 1)
        : messages.slice(0, 1);
      const userTexts = trimmed.filter((m) => m.role === "user").map((m) => m.content);

      setQuestionIndex(prevIdx);
      setMessages(trimmed);
      setAllResponses(userTexts.join("\n"));
      setInputValue("");
      return;
    }
    if (onBack) onBack();
  }, [questionIndex, messages, onBack]);

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    const compiled = compileStory({
      basics: allResponses,
      problem: "",
      customers: "",
    });
    if (onComplete) onComplete(compiled || allResponses);
  }, [canContinue, allResponses, onComplete]);

  return (
    <div className="guided-input-shell" role="region" aria-label="Guided input">
      <header className="guided-input-header" role="banner">
        <h1 className="guided-input-header__title">Tell us about your business</h1>
        <p className="guided-input-header__subtitle">
          Answer a few questions so we can craft your business plan
        </p>
      </header>

      <div className="guided-input-grid">
        <div ref={contentAreaRef} className="glass-content-card guided-input-chat" tabIndex={-1}>
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={false}
            inputValue={inputValue}
            onInputChange={setInputValue}
            currentPhase={currentPhase === 1 ? "basics" : currentPhase === 2 ? "problem" : "customers"}
            isLastBaseQuestion={isLastBaseQuestion}
            onNextBaseQuestion={handleNextBaseQuestion}
            onPhaseComplete={handlePhaseComplete}
          />
        </div>

        <SidePanel currentPhase={currentPhase} confidence="high" />
      </div>

      <div className="guided-input-nav">
        <button type="button" className="btn-secondary" onClick={handleBack} aria-label="Go back">
          ← Back
        </button>

        {/* Your story is mandatory — only the follow-up questions are optional
            (feedback p30, item 2). This used to read "Skip this step" and was
            offered before anything had been entered. */}
        {canContinue && !isLastBaseQuestion && (
          <button
            type="button"
            className="btn-ghost"
            onClick={handleContinue}
            aria-label="Skip the remaining follow-up questions"
          >
            Skip remaining questions
          </button>
        )}

        <button
          type="button"
          className="btn-primary"
          onClick={handleContinue}
          disabled={!canContinue}
          aria-label="Continue to generate business plan"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
