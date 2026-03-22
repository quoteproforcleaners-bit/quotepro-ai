import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { apiRequest } from "../lib/api";
import {
  Send,
  Loader2,
  RotateCcw,
  Sparkles,
  Building2,
  GraduationCap,
  Lightbulb,
  Copy,
  Check,
  Trash2,
  ChevronRight,
  BarChart3,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  MessageSquare,
  BookOpen,
  Briefcase,
  Target,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "../lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentMode = "business" | "coach" | "teach";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  isError?: boolean;
}

// ─── Mode Config ──────────────────────────────────────────────────────────────

const MODES: Record<AgentMode, {
  label: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  color: string;
  accent: string;
  border: string;
  bg: string;
  activeBg: string;
  activeText: string;
  loadingText: string;
  placeholder: string;
  prompts: { icon: React.ElementType; category: string; questions: string[] }[];
}> = {
  business: {
    label: "My Business",
    tagline: "Analyze your QuotePro data",
    description: "Answers questions using your real quotes, customers, jobs, and revenue inside QuotePro.",
    icon: Building2,
    color: "blue",
    accent: "text-blue-600",
    border: "border-blue-200",
    bg: "bg-blue-50",
    activeBg: "bg-blue-600",
    activeText: "text-white",
    loadingText: "Pulling your business data...",
    placeholder: "Ask about your quotes, customers, revenue, pipeline...",
    prompts: [
      {
        icon: FileText,
        category: "Pipeline",
        questions: [
          "Summarize my open pipeline",
          "Which quotes have gone stale?",
          "What is my current quote conversion rate?",
        ],
      },
      {
        icon: Users,
        category: "Customers",
        questions: [
          "Who are my top customers by revenue?",
          "Which customers haven't booked in 60 days?",
          "How many VIP customers do I have?",
        ],
      },
      {
        icon: DollarSign,
        category: "Revenue",
        questions: [
          "How much revenue have I generated this month?",
          "What is my average quote size?",
          "How many of my wins are recurring?",
        ],
      },
      {
        icon: BarChart3,
        category: "Insights",
        questions: [
          "What should I focus on this week?",
          "Where is revenue at risk right now?",
          "What are my biggest missed opportunities?",
        ],
      },
    ],
  },
  coach: {
    label: "Coach Me",
    tagline: "Sales & operations advice",
    description: "Get expert sales coaching, objection handling, follow-up scripts, and revenue strategy tailored to cleaning.",
    icon: Lightbulb,
    color: "amber",
    accent: "text-amber-600",
    border: "border-amber-200",
    bg: "bg-amber-50",
    activeBg: "bg-amber-500",
    activeText: "text-white",
    loadingText: "Crafting the best approach...",
    placeholder: "Ask about closing jobs, objections, follow-up strategy...",
    prompts: [
      {
        icon: MessageSquare,
        category: "Follow-Up",
        questions: [
          "Write a follow-up text for a quote with no response",
          "What is the ideal follow-up sequence after sending a quote?",
          "How do I re-engage a lead that went quiet 2 weeks ago?",
        ],
      },
      {
        icon: Target,
        category: "Objections",
        questions: [
          "How should I handle 'That's too expensive'?",
          "What do I say when someone says 'I need to think about it'?",
          "How do I respond when they compare me to a cheaper competitor?",
        ],
      },
      {
        icon: TrendingUp,
        category: "Revenue Growth",
        questions: [
          "How do I convert one-time clients to recurring?",
          "What add-ons should I be offering on every quote?",
          "Give me 5 actions to increase my close rate this month",
        ],
      },
      {
        icon: Briefcase,
        category: "Operations",
        questions: [
          "How should I prioritize my pipeline this week?",
          "What KPIs should I be tracking every week?",
          "How do I handle a situation where a client is unhappy?",
        ],
      },
    ],
  },
  teach: {
    label: "Teach Me",
    tagline: "Cleaning industry knowledge",
    description: "Learn cleaning industry best practices, pricing norms, business growth, and operational excellence.",
    icon: GraduationCap,
    color: "violet",
    accent: "text-violet-600",
    border: "border-violet-200",
    bg: "bg-violet-50",
    activeBg: "bg-violet-600",
    activeText: "text-white",
    loadingText: "Preparing your lesson...",
    placeholder: "Ask about pricing, services, operations, growth...",
    prompts: [
      {
        icon: DollarSign,
        category: "Pricing",
        questions: [
          "How do cleaning companies price a move-out clean?",
          "What is the right discount for recurring service?",
          "How should I price a deep clean vs a standard clean?",
        ],
      },
      {
        icon: BookOpen,
        category: "Services",
        questions: [
          "What are the best upsells for residential cleaning?",
          "What is the difference between residential and commercial cleaning?",
          "What tasks are included in a standard cleaning?",
        ],
      },
      {
        icon: TrendingUp,
        category: "Growth",
        questions: [
          "What are the best ways to get new cleaning clients?",
          "How do I build a referral program for my cleaning business?",
          "When is the right time to hire my first employee?",
        ],
      },
      {
        icon: HelpCircle,
        category: "Industry",
        questions: [
          "What KPIs matter most for a cleaning business?",
          "What is a good profit margin for a cleaning company?",
          "How do I compete with large franchise cleaners?",
        ],
      },
    ],
  },
};

// ─── Markdown Renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Heading
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-slate-800 mt-4 mb-1.5 first:mt-0">
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-bold text-slate-900 mt-4 mb-2 first:mt-0">
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-base font-black text-slate-900 mt-4 mb-2 first:mt-0">
          {renderInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 my-2 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      let num = 1;
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
        num++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1.5 my-2 pl-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 leading-relaxed">
              <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 mt-0.5">
                {idx + 1}
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-3 border-slate-200" />);
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="text-sm text-slate-700 leading-relaxed my-1.5">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Process bold, italic, inline code
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return <em key={i} className="italic text-slate-600">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
      title="Copy response"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Message Row ──────────────────────────────────────────────────────────────

function MessageRow({
  msg,
  mode,
  onRetry,
}: {
  msg: Message;
  mode: AgentMode;
  onRetry?: () => void;
}) {
  const cfg = MODES[mode];

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-slate-900 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.isLoading) {
    return (
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
          <cfg.icon className={`w-4 h-4 ${cfg.accent}`} />
        </div>
        <div className="flex items-center gap-2.5 px-4 py-3 bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${cfg.activeBg} opacity-60`}
                style={{ animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }}
              />
            ))}
          </div>
          <span className="text-xs text-slate-500 font-medium">{cfg.loadingText}</span>
        </div>
      </div>
    );
  }

  if (msg.isError) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl rounded-bl-sm">
          <span className="text-sm text-red-700">{msg.content}</span>
          {onRetry ? (
            <button onClick={onRetry} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-semibold shrink-0">
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group">
      <div className={`w-8 h-8 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0 mt-0.5`}>
        <cfg.icon className={`w-4 h-4 ${cfg.accent}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm">
          <div className="prose-sm max-w-none">{renderMarkdown(msg.content)}</div>
          <div className="flex items-center justify-end mt-3 pt-2.5 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={msg.content} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mode Selector ────────────────────────────────────────────────────────────

function ModePicker({
  mode,
  onChange,
}: {
  mode: AgentMode;
  onChange: (m: AgentMode) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl" data-testid="mode-selector">
      {(Object.entries(MODES) as [AgentMode, typeof MODES[AgentMode]][]).map(([key, cfg]) => {
        const isActive = mode === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            data-testid={`mode-btn-${key}`}
            data-active={isActive ? "true" : "false"}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              isActive
                ? `${cfg.activeBg} ${cfg.activeText} shadow-sm`
                : "text-slate-600 hover:text-slate-800 hover:bg-white/60"
            }`}
          >
            <cfg.icon className={`w-4 h-4 shrink-0 ${isActive ? "opacity-90" : ""}`} />
            <span className="truncate">{cfg.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  mode,
  onSend,
}: {
  mode: AgentMode;
  onSend: (text: string) => void;
}) {
  const cfg = MODES[mode];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className={`w-16 h-16 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-center justify-center mb-4 shadow-sm`}>
          <cfg.icon className={`w-8 h-8 ${cfg.accent}`} />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">{cfg.label}</h2>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-8">{cfg.description}</p>
      </div>

      <div className="px-4 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {cfg.prompts.map((group) => (
            <div key={group.category} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <group.icon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{group.category}</span>
              </div>
              <div className="p-2 space-y-1">
                {group.questions.map((q) => (
                  <button
                    key={q}
                    onClick={() => onSend(q)}
                    className="w-full flex items-center gap-2 text-left text-sm text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors group"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                    <span className="leading-snug">{q}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Chat Component ──────────────────────────────────────────────────────

function AgentChat() {
  const { business } = useAuth();
  const [mode, setMode] = useState<AgentMode>("business");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastUserMsg = useRef("");

  const cfg = useMemo(() => MODES[mode], [mode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const clearConversation = () => {
    setMessages([]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const switchMode = (newMode: AgentMode) => {
    setMode(newMode);
    setMessages([]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    lastUserMsg.current = text.trim();

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    const loadingMsg: Message = { id: "loading", role: "assistant", content: "", isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    setIsLoading(true);

    const history = [...messages, userMsg]
      .filter((m) => !m.isLoading && !m.isError)
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await apiRequest("POST", "/api/ai/agent-chat", {
        message: text.trim(),
        mode,
        conversationHistory: history,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Request failed");

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "I couldn't generate a response. Please try again.",
      };
      setMessages((prev) => prev.map((m) => (m.id === "loading" ? assistantMsg : m)));
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err.message || "Something went wrong. Please check your connection and try again.",
        isError: true,
      };
      setMessages((prev) => prev.map((m) => (m.id === "loading" ? errMsg : m)));
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading, messages, mode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="shrink-0 px-5 pt-5 pb-4 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight" data-testid="agent-title">QuotePro AI</h1>
            </div>
            <p className="text-xs text-slate-500 ml-9">
              {cfg.tagline}
              {mode === "business" && business ? ` · ${business.companyName}` : ""}
            </p>
          </div>
          {hasMessages ? (
            <button
              onClick={clearConversation}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors py-1 px-2 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          ) : null}
        </div>
        <ModePicker mode={mode} onChange={switchMode} />
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <EmptyState mode={mode} onSend={sendMessage} />
        ) : (
          <div className="p-5 space-y-5 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <MessageRow
                key={msg.id}
                msg={msg}
                mode={mode}
                onRetry={msg.isError ? () => sendMessage(lastUserMsg.current) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className={`flex-1 flex items-end gap-2 border rounded-2xl px-4 py-2.5 transition-colors ${
            isLoading
              ? "border-slate-200 bg-slate-50"
              : `border-slate-300 focus-within:border-${cfg.color}-400 focus-within:ring-2 focus-within:ring-${cfg.color}-400/20 bg-white`
          }`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={cfg.placeholder}
              rows={1}
              className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none resize-none leading-relaxed"
              style={{ minHeight: "22px", maxHeight: "120px" }}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className={`w-10 h-10 rounded-xl ${cfg.activeBg} text-white flex items-center justify-center disabled:opacity-40 transition-all hover:opacity-90 shrink-0 shadow-sm`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-1.5">
          {mode === "business"
            ? "Analyzing your real QuotePro data"
            : mode === "coach"
            ? "Sales & ops coaching for cleaning businesses"
            : "Cleaning industry knowledge & best practices"}
          {" · "}Enter to send
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  return (
    <div
      className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      style={{ height: "calc(100vh - 7.75rem)" }}
    >
      <AgentChat />
    </div>
  );
}
