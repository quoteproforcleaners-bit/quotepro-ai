import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ChatWidgetProps {
  businessName: string;
  businessSlug: string;
  primaryColor?: string;
  position?: "bottom-right" | "bottom-left";
}

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

export function ChatWidget({
  businessName,
  businessSlug,
  primaryColor = "#0F6E56",
  position = "bottom-right",
}: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const positionStyle = position === "bottom-right" ? { right: "24px" } : { left: "24px" };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
    }
  }, [open]);

  // Show unread badge after 3 seconds if not yet opened
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!open && messages.length === 0) {
        setUnread(1);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show greeting when first opened
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `Hi there! I'm the virtual assistant for ${businessName}. I can answer questions, give you a price estimate, or help you book a cleaning. What can I help you with?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(
    async (text?: string) => {
      const messageText = text || input.trim();
      if (!messageText || loading) return;

      setInput("");

      const userMsg: Message = { role: "user", content: messageText, timestamp: new Date() };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}/api/public/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
            businessSlug,
            sessionId,
          }),
        });

        const data = await res.json();

        if (data.error && !data.reply) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Sorry, I'm having a connection issue. Please try again or fill out the quote form.",
              timestamp: new Date(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: data.reply, timestamp: new Date() },
          ]);
          if (!open) setUnread((prev) => prev + 1);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I'm having a connection issue. Please try again or fill out the quote form.",
            timestamp: new Date(),
          },
        ]);
      }

      setLoading(false);
    },
    [messages, input, loading, businessSlug, sessionId, open]
  );

  const quickReplies =
    messages.length === 1
      ? [
          "How much does a cleaning cost?",
          "What services do you offer?",
          "I want to book a cleaning",
          "Do you have availability this week?",
        ]
      : [];

  return (
    <>
      {/* Floating button */}
      <div style={{ position: "fixed", bottom: "24px", zIndex: 9999, ...positionStyle }}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close chat" : "Open chat"}
          style={{
            width: "58px",
            height: "58px",
            borderRadius: "50%",
            background: primaryColor,
            border: "none",
            cursor: "pointer",
            boxShadow: `0 4px 20px ${primaryColor}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            color: "white",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }}
        >
          {open ? "✕" : "💬"}
        </button>

        {/* Unread badge */}
        {!open && unread > 0 && (
          <div
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              width: "20px",
              height: "20px",
              background: "#ef4444",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 700,
              color: "white",
              border: "2px solid white",
              pointerEvents: "none",
            }}
          >
            {unread}
          </div>
        )}
      </div>

      {/* Chat window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "96px",
            zIndex: 9998,
            width: "min(360px, calc(100vw - 32px))",
            height: "min(520px, calc(100vh - 120px))",
            background: "white",
            borderRadius: "20px",
            boxShadow: "0 12px 48px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "Inter, -apple-system, sans-serif",
            animation: "chatSlideUp 0.2s ease",
            ...positionStyle,
          }}
        >
          {/* Header */}
          <div
            style={{
              background: primaryColor,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              ✨
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: "15px", lineHeight: "1.2" }}>
                {businessName}
              </div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px", marginTop: "2px" }}>
                ● Typically replies instantly
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                fontSize: "20px",
                padding: "0",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: "#fafafa",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: "8px",
                }}
              >
                {msg.role === "assistant" && (
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      background: primaryColor,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    ✨
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.role === "user" ? primaryColor : "white",
                    color: msg.role === "user" ? "white" : "#1a1f1c",
                    fontSize: "14px",
                    lineHeight: "1.55",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Quick replies */}
            {quickReplies.length > 0 && !loading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
                {quickReplies.map((qr, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(qr)}
                    style={{
                      padding: "8px 14px",
                      background: "white",
                      border: `1.5px solid ${primaryColor}`,
                      borderRadius: "20px",
                      color: primaryColor,
                      fontSize: "13px",
                      cursor: "pointer",
                      fontWeight: 500,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.style.background = primaryColor;
                      el.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.background = "white";
                      el.style.color = primaryColor;
                    }}
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    background: primaryColor,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                  }}
                >
                  ✨
                </div>
                <div
                  style={{
                    padding: "12px 16px",
                    background: "white",
                    borderRadius: "18px 18px 18px 4px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#aaa",
                        animation: `chatBounce 1.2s ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #e5e7eb",
              background: "white",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 16px",
                border: "1.5px solid #e5e7eb",
                borderRadius: "24px",
                outline: "none",
                fontSize: "14px",
                background: "#f9fafb",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = primaryColor;
                e.target.style.background = "white";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.background = "#f9fafb";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: input.trim() && !loading ? primaryColor : "#e5e7eb",
                border: "none",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                color: "white",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              ↑
            </button>
          </div>

          {/* Powered by */}
          <div
            style={{
              textAlign: "center",
              padding: "6px",
              fontSize: "11px",
              color: "#9ca3af",
              background: "white",
              borderTop: "1px solid #f3f4f6",
            }}
          >
            Powered by QuotePro AI
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chatBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @media (max-width: 480px) {
          /* On small screens the widget occupies more of the viewport */
        }
      `}</style>
    </>
  );
}
