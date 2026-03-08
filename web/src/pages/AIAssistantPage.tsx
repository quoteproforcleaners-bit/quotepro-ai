import { useState, useRef, useEffect } from "react";
import { apiPost } from "../lib/api";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Loader2,
} from "lucide-react";
import { PageHeader, Card } from "../components/ui";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await apiPost("/api/ai/sales-chat", {
        message: userMsg,
        history: messages,
      });
      const reply =
        (res as any).message ||
        (res as any).response ||
        (res as any).reply ||
        "I'm here to help with your cleaning business. What would you like to know?";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    }
    setLoading(false);
  };

  const suggestions = [
    "How should I follow up on a quote that hasn't been responded to?",
    "What's a good pricing strategy for deep cleaning?",
    "Help me draft a professional email for a new customer",
    "How can I increase my close rate?",
  ];

  return (
    <div className="h-[calc(100vh-8rem)]  flex flex-col">
      <PageHeader
        title="Sales Assistant"
        subtitle="AI-powered help for closing deals and growing your business"
      />

      <Card className="flex-1 flex flex-col overflow-hidden" padding={false}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 lg:p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center mb-4 shadow-lg shadow-primary-600/20">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                QuotePro Sales Assistant
              </h2>
              <p className="text-sm text-slate-500 text-center max-w-md mb-6">
                I can help you with sales strategies, follow-up messages,
                pricing advice, and more. Ask me anything!
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                    }}
                    className="text-left text-sm px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : ""
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  ) : null}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary-600 text-white rounded-br-md"
                        : "bg-slate-100 text-slate-900 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" ? (
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                  ) : null}
                </div>
              ))}
              {loading ? (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4 lg:px-6">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about sales, pricing, follow-ups..."
              className="flex-1 h-11 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center disabled:opacity-50 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
