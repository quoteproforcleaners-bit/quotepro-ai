import { useState, useRef, useEffect, useCallback } from "react";
import { X, Sparkles, Send, RotateCcw, ChevronDown } from "lucide-react";
import { apiRequest } from "../lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  isError?: boolean;
}

const QUICK_PROMPTS = [
  "How can I win more quotes?",
  "What should I charge for a deep clean?",
  "How do I handle a difficult customer?",
];

// ─── Inline markdown renderer (no external dependency) ─────────────────────

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded bg-slate-200 text-xs font-mono text-slate-700">{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**"))
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-xs font-bold text-slate-800 mt-3 mb-1 first:mt-0">{renderInline(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      const lvl = line.startsWith("## ") ? 3 : 2;
      elements.push(<h3 key={i} className={`text-${lvl === 2 ? "sm" : "xs"} font-bold text-slate-900 mt-3 mb-1 first:mt-0`}>{renderInline(line.replace(/^#+ /, ""))}</h3>);
      i++; continue;
    }
    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) { items.push(lines[i].slice(2)); i++; }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 my-1.5 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-slate-700 leading-relaxed">
              <span className="mt-2 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(lines[i].replace(/^\d+\. /, "")); i++; }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 my-1.5 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-slate-700 leading-relaxed">
              <span className="shrink-0 w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 mt-0.5">{idx + 1}</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }
    if (line.match(/^---+$/)) { elements.push(<hr key={i} className="my-2 border-slate-200" />); i++; continue; }
    elements.push(<p key={i} className="text-slate-700 leading-relaxed my-1">{renderInline(line)}</p>);
    i++;
  }
  return <>{elements}</>;
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0 mt-0.5 mr-2">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600 text-white rounded-br-sm"
            : msg.isError
            ? "bg-rose-50 text-rose-700 border border-rose-200 rounded-bl-sm"
            : "bg-slate-100 text-slate-800 rounded-bl-sm"
        }`}
      >
        {msg.isLoading ? (
          <TypingDots />
        ) : isUser ? (
          <span className="whitespace-pre-wrap">{msg.content}</span>
        ) : (
          <div className="text-sm">{renderMarkdown(msg.content)}</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function AIChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setUnread(false);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && open) setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: trimmed };
    const loadingMsg: Message = { id: "loading", role: "assistant", content: "", isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);
    if (inputRef.current) inputRef.current.style.height = "auto";

    const history = [...messages, userMsg]
      .filter((m) => !m.isLoading && !m.isError)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await apiRequest("POST", "/api/ai/agent-chat", {
        message: trimmed,
        mode: "coach",
        conversationHistory: history,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "loading"
            ? { id: (Date.now() + 1).toString(), role: "assistant", content: data.reply || "I couldn't generate a response." }
            : m
        )
      );
      if (!open) setUnread(true);
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "loading"
            ? { id: (Date.now() + 1).toString(), role: "assistant", content: err.message || "Something went wrong.", isError: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading, messages, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* ── Chat Panel ── */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 flex flex-col bg-white"
          style={{
            width: 380,
            height: 520,
            borderRadius: 20,
            boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.07)",
            animation: "bubbleIn 0.22s cubic-bezier(0.34,1.56,0.64,1)",
            transformOrigin: "bottom right",
          }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-100" style={{ borderRadius: "20px 20px 0 0" }}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-900 leading-tight">QuotePro AI</div>
              <div className="text-xs text-slate-400 leading-tight">Your business coach</div>
            </div>
            <div className="flex items-center gap-1">
              {hasMessages && (
                <button
                  onClick={() => { setMessages([]); setInput(""); setTimeout(() => inputRef.current?.focus(), 50); }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="New conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "thin" }}>
            {!hasMessages ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col items-center justify-center text-center pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-violet-100 flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="text-sm font-semibold text-slate-700 mb-1">How can I help?</div>
                  <div className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
                    Ask me anything about pricing, sales, or growing your cleaning business.
                  </div>
                </div>
                <div className="space-y-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-slate-600 font-medium border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 px-3 pb-3">
            <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 focus-within:border-indigo-400 focus-within:bg-white transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent resize-none text-sm text-slate-800 placeholder-slate-400 outline-none leading-relaxed disabled:opacity-60"
                style={{ maxHeight: 96, minHeight: 24 }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all mb-0.5 disabled:cursor-not-allowed"
                style={{ background: input.trim() && !isLoading ? "#4f46e5" : "#e5e7eb" }}
              >
                <Send className="w-3.5 h-3.5" style={{ color: input.trim() && !isLoading ? "#fff" : "#9ca3af" }} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bubble Button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: open ? "#374151" : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          boxShadow: open
            ? "0 4px 20px rgba(0,0,0,0.25)"
            : "0 4px 20px rgba(79,70,229,0.4), 0 2px 8px rgba(0,0,0,0.15)",
        }}
        title="QuotePro AI"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <div className="relative">
            <Sparkles className="w-5 h-5 text-white" />
            {unread && (
              <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
            )}
          </div>
        )}
      </button>

      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: scale(0.85) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </>
  );
}
