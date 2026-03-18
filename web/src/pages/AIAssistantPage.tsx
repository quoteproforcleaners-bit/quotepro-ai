import { useState, useRef, useEffect, useCallback } from "react";
import { apiRequest } from "../lib/api";
import {
  Send,
  Award,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRightCircle,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "../components/ui";
import { ProGate } from "../components/ProGate";
import { WebAIConsentGate } from "../components/WebAIConsentGate";

interface Script {
  label: string;
  content: string;
}

interface CoachResponse {
  mode: string;
  quickTakeaway: string;
  approach: string;
  scripts: Script[];
  alternateVersions: Script[];
  nextStep: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: CoachResponse;
  isLoading?: boolean;
  isError?: boolean;
}

const QUICK_PROMPTS = [
  "Write a follow-up text for a quote with no response",
  "How should I handle 'That's too expensive'?",
  "How do I push recurring service without sounding pushy?",
  "Write a script to explain why a deep clean comes first",
  "Give me a follow-up sequence for a residential quote",
  "What should I say after sending a quote?",
  "Give me a phone script for closing a job",
  "How do I handle 'I need to think about it'?",
];

const MODE_LABELS: Record<string, string> = {
  "follow-up": "Follow-Up",
  objection: "Objection",
  script: "Script",
  strategy: "Strategy",
  coaching: "Coaching",
};

const MODE_COLORS: Record<string, string> = {
  "follow-up": "blue",
  objection: "orange",
  script: "violet",
  strategy: "green",
  coaching: "slate",
};

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
        copied
          ? "border-green-300 bg-green-50 text-green-700"
          : "border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function ScriptBlock({ script }: { script: Script }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{script.label}</span>
        <CopyBtn text={script.content} />
      </div>
      <pre className="px-4 py-3 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">{script.content}</pre>
    </div>
  );
}

function CoachingPanel({ msg }: { msg: Message }) {
  const [showAlternates, setShowAlternates] = useState(false);
  const r = msg.structured!;
  const modeLabel = MODE_LABELS[r.mode] || "Coaching";
  const modeColor = MODE_COLORS[r.mode] || "slate";

  return (
    <div className="space-y-4">
      {/* Mode badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border bg-${modeColor}-50 text-${modeColor}-700 border-${modeColor}-200`}>
          <Award className="w-3 h-3" />
          {modeLabel}
        </span>
      </div>

      {/* Quick takeaway */}
      {r.quickTakeaway ? (
        <div className="px-4 py-3 bg-primary-50 border-l-4 border-primary-500 rounded-r-xl">
          <p className="font-semibold text-slate-900 leading-relaxed">{r.quickTakeaway}</p>
        </div>
      ) : null}

      {/* Approach */}
      {r.approach ? (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Approach</p>
          <p className="text-sm text-slate-600 leading-relaxed">{r.approach}</p>
        </div>
      ) : null}

      {/* Scripts */}
      {r.scripts.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready to Send</p>
          {r.scripts.map((s, i) => (
            <ScriptBlock key={i} script={s} />
          ))}
        </div>
      ) : null}

      {/* Alternate versions */}
      {r.alternateVersions.length > 0 ? (
        <div>
          <button
            onClick={() => setShowAlternates((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 py-1 transition-colors"
          >
            {showAlternates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showAlternates ? "Hide alternates" : `${r.alternateVersions.length} alternate version${r.alternateVersions.length > 1 ? "s" : ""}`}
          </button>
          {showAlternates ? (
            <div className="mt-2 space-y-3">
              {r.alternateVersions.map((s, i) => (
                <ScriptBlock key={i} script={s} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Next step */}
      {r.nextStep ? (
        <div className="flex items-start gap-2.5 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl">
          <ArrowRightCircle className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-primary-600 uppercase tracking-wide mb-0.5">Next Move</p>
            <p className="text-sm text-slate-600 leading-relaxed">{r.nextStep}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MessageRow({ msg, onRetry }: { msg: Message; onRetry?: () => void }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-primary-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.isLoading) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
          <Award className="w-4 h-4 text-primary-500" />
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-sm">
          <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
          <span className="text-sm text-slate-500 font-medium">Thinking through the best sales move...</span>
        </div>
      </div>
    );
  }

  if (msg.isError) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl rounded-bl-sm">
          <span className="text-sm text-red-700">{msg.content}</span>
          {onRetry ? (
            <button onClick={onRetry} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium">
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0 mt-0.5">
        <Award className="w-4 h-4 text-primary-500" />
      </div>
      <div className="flex-1 min-w-0">
        {msg.structured ? (
          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm p-4 shadow-sm">
            <CoachingPanel msg={msg} />
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3">
            <p className="text-sm text-slate-800 leading-relaxed">{msg.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SalesAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastUserMsg = useRef("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    lastUserMsg.current = text.trim();

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    const loadingMsg: Message = { id: "loading", role: "assistant", content: "", isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setIsLoading(true);

    const history = [...messages, userMsg]
      .filter((m) => !m.isLoading && !m.isError)
      .slice(-4)
      .map((m) => ({ role: m.role, content: m.structured ? JSON.stringify(m.structured) : m.content }));

    try {
      const res = await apiRequest("POST", "/api/ai/sales-chat", {
        message: text.trim(),
        conversationHistory: history,
      });
      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "",
        structured: data.mode ? {
          mode: data.mode,
          quickTakeaway: data.quickTakeaway || "",
          approach: data.approach || "",
          scripts: data.scripts || [],
          alternateVersions: data.alternateVersions || [],
          nextStep: data.nextStep || "",
        } : undefined,
      };

      setMessages((prev) => prev.map((m) => (m.id === "loading" ? assistantMsg : m)));
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Something went wrong. Please check your connection and try again.",
        isError: true,
      };
      setMessages((prev) => prev.map((m) => (m.id === "loading" ? errMsg : m)));
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 lg:p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mx-auto mb-3">
                <Award className="w-7 h-7 text-primary-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Sales Coach</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Ask anything about closing jobs, handling objections, or growing your cleaning business.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-primary-300 hover:text-slate-800 transition-all leading-snug"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((msg) => (
              <MessageRow
                key={msg.id}
                msg={msg}
                onRetry={msg.isError ? () => sendMessage(lastUserMsg.current) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 px-4 py-3 lg:px-6">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your sales coach... (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors resize-none leading-relaxed"
            style={{ minHeight: "42px", maxHeight: "120px" }}
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-1.5">
          AI coaching tailored to cleaning business sales
        </p>
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <PageHeader
        title="Sales Assistant"
        subtitle="AI sales coaching tailored to your cleaning business — scripts, follow-ups, objection handling, and more."
      />
      <ProGate feature="AI Sales Assistant">
        <WebAIConsentGate>
          <SalesAssistantChat />
        </WebAIConsentGate>
      </ProGate>
    </div>
  );
}
