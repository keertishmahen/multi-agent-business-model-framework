import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { RobotIcon } from '../shared/Icon';
import useVoiceInput from '../../hooks/useVoiceInput';
import { useDynamicQuestions } from '../../hooks/useDynamicQuestions';

/**
 * ChatInterface — Figma-aligned guided input chat with:
 * - AI question bubbles on the left
 * - User response bubbles on the right
 * - Voice input with "I heard you say:" confirmation card
 * - Black circle mic icon showing in-use/not-in-use state
 * - Dynamic LLM-powered follow-up questions
 */

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatInterface({
  messages = [],
  onSendMessage,
  isLoading = false,
  inputValue = '',
  onInputChange,
  currentPhase = '',
  isLastBaseQuestion = false,
  onNextBaseQuestion,
  onPhaseComplete,
}) {
  const messageListRef = useRef(null);
  const inputRef = useRef(null);

  // Voice input
  const {
    transcript,
    isListening,
    isSupported,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput();

  // Voice confirmation state — shows "I heard you say:" card
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [showVoiceConfirm, setShowVoiceConfirm] = useState(false);
  const [editingVoice, setEditingVoice] = useState(false);

  // Dynamic follow-up questions integration
  const { generateFollowUp, isGenerating, resetCount } = useDynamicQuestions();
  const [awaitingFollowUpAnswer, setAwaitingFollowUpAnswer] = useState(false);
  const [dynamicMessages, setDynamicMessages] = useState([]);

  // Combine parent messages with locally injected dynamic messages
  const allMessages = React.useMemo(
    () => [...messages, ...dynamicMessages],
    [messages, dynamicMessages]
  );

  // Ref for latest messages (for async callbacks)
  const allMessagesRef = useRef(allMessages);
  useEffect(() => { allMessagesRef.current = allMessages; }, [allMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [allMessages, isGenerating, showVoiceConfirm]);

  // Reset dynamic messages when phase changes
  useEffect(() => {
    setDynamicMessages([]);
    setAwaitingFollowUpAnswer(false);
  }, [currentPhase]);

  // When voice transcript changes while listening, update the confirmation text
  useEffect(() => {
    if (transcript && isListening) {
      setVoiceTranscript(transcript);
    }
  }, [transcript, isListening]);

  // When user stops speaking, show the confirmation card
  useEffect(() => {
    if (!isListening && voiceTranscript && !showVoiceConfirm) {
      setShowVoiceConfirm(true);
      resetTranscript();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  // ── Voice handlers ────────────────────────────────────────────
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setVoiceTranscript('');
      setShowVoiceConfirm(false);
      setEditingVoice(false);
      startListening();
    }
  };

  const handleVoiceConfirm = () => {
    if (voiceTranscript.trim()) {
      submitMessage(voiceTranscript.trim());
    }
    setShowVoiceConfirm(false);
    setVoiceTranscript('');
    setEditingVoice(false);
  };

  const handleVoiceEdit = () => {
    setEditingVoice(true);
  };

  const handleVoiceEditChange = (e) => {
    setVoiceTranscript(e.target.value);
  };

  const handleVoiceDismiss = () => {
    setShowVoiceConfirm(false);
    setVoiceTranscript('');
    setEditingVoice(false);
  };

  // ── Dynamic questions ─────────────────────────────────────────
  const proceedAfterFollowUps = useCallback(() => {
    setAwaitingFollowUpAnswer(false);
    resetCount();
    if (isLastBaseQuestion) {
      const completionMsg = {
        id: `phase-complete-${Date.now()}`,
        role: 'ai',
        content: "Great, I've got what I need for this section. Click Continue to move on.",
        timestamp: new Date().toISOString(),
      };
      setDynamicMessages((prev) => [...prev, completionMsg]);
      if (onPhaseComplete) onPhaseComplete();
    } else {
      if (onNextBaseQuestion) onNextBaseQuestion();
    }
  }, [isLastBaseQuestion, onNextBaseQuestion, onPhaseComplete, resetCount]);

  const attemptFollowUp = useCallback(async (userAnswer) => {
    const followUp = await generateFollowUp(userAnswer, currentPhase, allMessagesRef.current);
    if (followUp) {
      const followUpMsg = {
        id: `dynamic-${Date.now()}`,
        role: 'ai',
        content: followUp,
        timestamp: new Date().toISOString(),
        isDynamic: true,
      };
      setDynamicMessages((prev) => [...prev, followUpMsg]);
      setAwaitingFollowUpAnswer(true);
    } else {
      proceedAfterFollowUps();
    }
  }, [generateFollowUp, currentPhase, proceedAfterFollowUps]);

  const handleSkipFollowUp = useCallback(() => {
    proceedAfterFollowUps();
  }, [proceedAfterFollowUps]);

  // ── Submit message (shared by text input and voice confirm) ───
  const submitMessage = useCallback((text) => {
    if (!text || isLoading || isGenerating) return;

    if (awaitingFollowUpAnswer) {
      const userMsg = {
        id: `user-dynamic-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };
      setDynamicMessages((prev) => [...prev, userMsg]);
      onInputChange('');
      onSendMessage(text);
      attemptFollowUp(text);
    } else {
      onSendMessage(text);
      onInputChange('');
      setTimeout(() => { attemptFollowUp(text); }, 300);
    }
  }, [isLoading, isGenerating, awaitingFollowUpAnswer, onSendMessage, onInputChange, attemptFollowUp]);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    submitMessage(trimmed);
  }, [inputValue, submitMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = inputValue.trim().length > 0 && !isLoading && !isGenerating;

  return (
    <div className="guided-chat" role="region" aria-label="Chat conversation">
      <div ref={messageListRef} className="guided-chat__messages" aria-live="polite" aria-relevant="additions">
        {allMessages.map((msg) => {
          const isAi = msg.role === 'ai';
          return (
            <div
              key={msg.id}
              className={`guided-chat__msg ${isAi ? 'guided-chat__msg--ai' : 'guided-chat__msg--user'}`}
            >
              {isAi ? (
                <div className="guided-chat__ai-row">
                  <div className="guided-chat__avatar"><RobotIcon size={28} /></div>
                  <div>
                    <div className="guided-chat__bubble--ai">{msg.content}</div>
                    <span className="guided-chat__time">{formatTimestamp(msg.timestamp)}</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="guided-chat__bubble--user">{msg.content}</div>
                  <span className="guided-chat__time" style={{ textAlign: 'right' }}>{formatTimestamp(msg.timestamp)}</span>
                </>
              )}
            </div>
          );
        })}

        {/* Voice confirmation card — "I heard you say:" */}
        {showVoiceConfirm && voiceTranscript && (
          <div style={layoutStyles.voiceConfirmCard}>
            <div style={layoutStyles.voiceConfirmHeader}>
              <span style={layoutStyles.quoteIcon}>"</span>
              <span style={layoutStyles.heardLabel}>I heard you say:</span>
            </div>
            {editingVoice ? (
              <textarea
                style={layoutStyles.voiceEditArea}
                value={voiceTranscript}
                onChange={handleVoiceEditChange}
                autoFocus
                rows={3}
              />
            ) : (
              <p style={layoutStyles.voiceText}>{voiceTranscript}</p>
            )}
            <div style={layoutStyles.voiceActions}>
              {editingVoice ? (
                <button style={layoutStyles.voiceConfirmBtn} onClick={handleVoiceConfirm}>
                  ✓ Confirm
                </button>
              ) : (
                <>
                  <button style={layoutStyles.voiceEditBtn} onClick={handleVoiceEdit}>
                    ✏️ Edit
                  </button>
                  <button style={layoutStyles.voiceConfirmBtn} onClick={handleVoiceConfirm}>
                    ✓ Send
                  </button>
                </>
              )}
              <button style={layoutStyles.voiceDismissBtn} onClick={handleVoiceDismiss}>
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Generating follow-up indicator */}
        {isGenerating && (
          <div style={{ ...layoutStyles.messageWrapper, ...layoutStyles.aiWrapper }}>
            <div style={layoutStyles.generatingIndicator}>
              <span className="animate-pulse">Thinking of a follow-up…</span>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !isGenerating && (
          <div style={{ ...layoutStyles.messageWrapper, ...layoutStyles.aiWrapper }}>
            <div style={layoutStyles.aiRow}>
              <div style={layoutStyles.robotIcon}><RobotIcon size={28} /></div>
              <div style={layoutStyles.aiBubble}>
                <span className="animate-pulse">Thinking…</span>
              </div>
            </div>
          </div>
        )}

        {/* Skip button for follow-up */}
        {awaitingFollowUpAnswer && !isGenerating && (
          <div style={{ ...layoutStyles.messageWrapper, ...layoutStyles.aiWrapper }}>
            <button style={layoutStyles.skipButton} onClick={handleSkipFollowUp} type="button">
              Skip →
            </button>
          </div>
        )}
      </div>

      <div className="guided-chat__input-area">
        {isSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            className={`guided-chat__mic${isListening ? ' guided-chat__mic--active' : ''}`}
            aria-label={isListening ? "Stop recording" : "Start voice input"}
            title={isListening ? "Recording… click to stop" : "Click to speak"}
          >
            {isListening ? (
              <MicOff size={18} strokeWidth={2} color="#fff" aria-hidden="true" />
            ) : (
              <Mic size={18} strokeWidth={2} color="#fff" aria-hidden="true" />
            )}
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          className="guided-chat__field"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type or speak your answer."
          disabled={isLoading || isGenerating || isListening}
          aria-label="Chat message input"
        />

        <button
          className="guided-chat__send"
          style={{ opacity: canSend ? 1 : 0.4, cursor: canSend ? 'pointer' : 'not-allowed' }}
          onClick={handleSend}
          disabled={!canSend}
          type="button"
          aria-label="Send message"
        >
          <Send size={18} strokeWidth={2} color="#fff" aria-hidden="true" />
        </button>
      </div>

      {/* Voice error display */}
      {voiceError && (
        <div style={layoutStyles.voiceError} role="alert">{voiceError}</div>
      )}

      {/* Live transcript while recording */}
      {isListening && transcript && (
        <div style={layoutStyles.liveTranscript}>
          <span style={{ color: '#DC2626', marginRight: 8 }}>●</span>
          Listening: "{transcript}"
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────────────────────────────
const layoutStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '80%',
  },
  aiWrapper: { alignSelf: 'flex-start' },
  userWrapper: { alignSelf: 'flex-end' },
  aiRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  robotIcon: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--color-brand, var(--color-brand))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBubble: {
    padding: '12px 16px',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    background: 'var(--color-brand-light, var(--color-brand-light))',
    borderRadius: '14px 14px 14px 4px',
    color: 'var(--color-text-primary)',
    wordBreak: 'break-word',
  },
  userBubble: {
    padding: '12px 16px',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    background: 'var(--color-surface, #FFFFFF)',
    border: '1.5px solid var(--color-border-mid, #D4D4D4)',
    borderRadius: '14px 14px 4px 14px',
    color: 'var(--color-text-primary)',
    wordBreak: 'break-word',
  },
  timestamp: {
    fontSize: '0.7rem',
    color: 'var(--color-text-muted, #9A9A94)',
    marginTop: 4,
    display: 'block',
  },
  // Voice confirmation card
  voiceConfirmCard: {
    alignSelf: 'flex-start',
    background: '#F0FAF6',
    border: '1.5px solid var(--color-brand-pale, var(--color-brand-pale))',
    borderRadius: 12,
    padding: '14px 18px',
    maxWidth: '80%',
    marginTop: 8,
  },
  voiceConfirmHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quoteIcon: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--color-brand, var(--color-brand))',
    lineHeight: 1,
  },
  heardLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--color-brand, var(--color-brand))',
  },
  voiceText: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
    lineHeight: 1.5,
    margin: '0 0 12px',
  },
  voiceEditArea: {
    width: '100%',
    fontSize: '0.9rem',
    padding: '8px 10px',
    border: '1px solid var(--color-border-mid)',
    borderRadius: 8,
    resize: 'vertical',
    fontFamily: 'inherit',
    marginBottom: 12,
  },
  voiceActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  voiceEditBtn: {
    padding: '6px 14px',
    fontSize: '0.8rem',
    fontWeight: 500,
    background: 'transparent',
    border: '1px solid var(--color-border-mid)',
    borderRadius: 6,
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
  },
  voiceConfirmBtn: {
    padding: '6px 14px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: 'var(--color-brand, var(--color-brand))',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    color: '#fff',
  },
  voiceDismissBtn: {
    marginLeft: 'auto',
    padding: '4px 8px',
    fontSize: '0.85rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
  },
  // Input area
  inputArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    borderTop: '1px solid var(--color-border, #E5E5E3)',
    background: 'var(--color-surface, #FFFFFF)',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#1A1A18',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'transform 0.15s',
  },
  micBtnActive: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#1A1A18',
    border: '2.5px solid #DC2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    animation: 'pulse 1.5s infinite',
  },
  textInput: {
    flex: 1,
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    color: 'var(--color-text-primary)',
    background: 'var(--color-bg, #F7F7F5)',
    border: '1.5px solid var(--color-border-mid, #D4D4D4)',
    borderRadius: 24,
    padding: '10px 16px',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--color-brand, var(--color-brand))',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    color: '#ffffff',
  },
  skipButton: {
    padding: '6px 14px',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border-mid)',
    borderRadius: 16,
    cursor: 'pointer',
    marginLeft: 42,
    marginTop: 4,
  },
  generatingIndicator: {
    marginLeft: 42,
    marginTop: 4,
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
  },
  voiceError: {
    padding: '8px 16px',
    fontSize: '0.8rem',
    color: '#DC2626',
    background: '#FEE2E2',
    borderTop: '1px solid #FECACA',
  },
  liveTranscript: {
    padding: '8px 16px',
    fontSize: '0.8rem',
    color: 'var(--color-text-secondary)',
    background: '#F0FAF6',
    borderTop: '1px solid var(--color-brand-pale, var(--color-brand-pale))',
    fontStyle: 'italic',
  },
};
