import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Sparkles, Loader2, Minus, Maximize2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_SUGGESTIONS = [
  "What beauty products do you recommend?",
  "Tell me about delivery times in Kampala",
  "What kitchen gadgets are available?",
  "What is your return policy?"
];

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm Hanna, your Shopping Assistant at Liverton Store (By Hanna AI). How can I help you find smart solutions for everyday living today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to reach AI Assistant server.");
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err.message || "I encountered an error connecting to Hanna AI. Please make sure the API key is configured or try again later.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-assistant-wrapper">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="ai-assistant-trigger-btn"
          aria-label="Open AI Shopping Assistant"
        >
          <div className="ai-trigger-icon-wrap">
            <Sparkles className="ai-sparkle-icon" size={20} />
          </div>
          <span className="ai-trigger-text">
            Ask Hanna <span className="ai-badge">By Hanna AI</span>
          </span>
        </button>
      )}

      {isOpen && (
        <div className={`ai-assistant-card ${isMinimized ? "is-minimized" : ""}`}>
          {/* Header */}
          <div className="ai-assistant-header">
            <div className="ai-assistant-title">
              <div className="ai-avatar">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="ai-name">
                  Hanna <span className="ai-subtitle">Shopping Assistant</span>
                </h3>
                <span className="ai-byline">By Hanna AI</span>
              </div>
            </div>
            <div className="ai-header-controls">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="ai-icon-btn"
                aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ai-icon-btn"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Body */}
              <div className="ai-assistant-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`ai-message-row ${msg.role === "user" ? "user-row" : "assistant-row"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="ai-msg-avatar">
                        <Bot size={15} />
                      </div>
                    )}
                    <div className={`ai-message-bubble ${msg.role === "user" ? "user-bubble" : "assistant-bubble"}`}>
                      <p className="ai-message-content">{msg.content}</p>
                      <span className="ai-message-time">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {msg.role === "user" && (
                      <div className="ai-msg-avatar user-msg-avatar">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="ai-message-row assistant-row">
                    <div className="ai-msg-avatar">
                      <Bot size={15} />
                    </div>
                    <div className="ai-message-bubble assistant-bubble ai-loading-bubble">
                      <Loader2 className="animate-spin" size={16} />
                      <span>Hanna is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {messages.length <= 2 && (
                <div className="ai-suggestions-container">
                  <p className="ai-suggestions-label">Suggested questions:</p>
                  <div className="ai-suggestions-list">
                    {QUICK_SUGGESTIONS.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(sug)}
                        className="ai-suggestion-chip"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Footer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="ai-assistant-input-form"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Hanna anything about products, delivery..."
                  className="ai-assistant-input"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="ai-assistant-send-btn"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
