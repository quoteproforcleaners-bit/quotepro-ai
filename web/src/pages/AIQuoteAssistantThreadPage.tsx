import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Zap, UserCheck, Bot, UserX, RefreshCw } from "lucide-react";
import { apiPost } from "../lib/api";

const PURPLE = "#7C3AED";

function IntakeCard({ intake }: { intake: any }) {
  if (!intake) return null;
  const score = intake.completionScore ?? 0;
  const fields = [
    ["Service", intake.serviceType],
    ["ZIP", intake.zipCode],
    ["Bedrooms", intake.bedrooms],
    ["Bathrooms", intake.bathrooms],
    ["Sq. Ft.", intake.squareFootage],
    ["Pets", intake.pets],
    ["Frequency", intake.frequency],
    ["Preferred Date", intake.preferredDate],
  ].filter(([, v]) => !!v);

  return (
    <div className="border border-purple-200 bg-purple-50 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-purple-700">Intake Progress</p>
        <span className="text-xs font-bold text-purple-600">{score}%</span>
      </div>
      <div className="w-full h-1.5 bg-purple-200 rounded-full mb-3">
        <div className="h-1.5 bg-purple-600 rounded-full" style={{ width: `${score}%` }} />
      </div>
      <div className="grid grid-cols-2 gap-1">
        {fields.map(([label, val]) => (
          <div key={label as string} className="text-xs">
            <span className="text-gray-500">{label}: </span>
            <span className="text-gray-800 font-medium">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIQuoteAssistantThreadPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestedReply, setSuggestedReply] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/ai-assistant/threads", id],
    queryFn: async () => {
      const res = await fetch(`/api/ai-assistant/threads/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load thread");
      return res.json();
    },
  });

  const thread = data?.thread;
  const messages: any[] = data?.messages || [];
  const intake = data?.intake;

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await apiPost(`/api/ai-assistant/threads/${id}/reply`, { body: replyText.trim() });
      setReplyText("");
      setSuggestedReply("");
      refetch();
    } finally {
      setSending(false);
    }
  }

  async function generateSuggestion() {
    setGenerating(true);
    try {
      const res = await apiPost(`/api/ai-assistant/threads/${id}/generate-suggested-reply`, {});
      setSuggestedReply(res.suggestedReply || "");
    } finally {
      setGenerating(false);
    }
  }

  async function takeOver() {
    await apiPost(`/api/ai-assistant/threads/${id}/take-over`, {});
    refetch();
    queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/threads"] });
  }

  async function resumeAI() {
    await apiPost(`/api/ai-assistant/threads/${id}/release-to-ai`, {});
    refetch();
    queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/threads"] });
  }

  const isHuman = thread?.handoffStatus === "human";
  const isAiActive = thread?.aiStatus === "active";

  if (isLoading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/ai-quote-assistant" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="font-semibold text-gray-900">{thread?.customerName || thread?.phoneNumber}</p>
            <p className="text-sm text-gray-500">{thread?.phoneNumber}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {isAiActive && !isHuman ? (
            <button onClick={takeOver} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
              <UserX size={14} /> Take Over
            </button>
          ) : (
            <button onClick={resumeAI} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border hover:bg-purple-50" style={{ color: PURPLE, borderColor: PURPLE + "44" }}>
              <Bot size={14} /> Resume AI
            </button>
          )}
          <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Intake */}
      {intake ? <IntakeCard intake={intake} /> : null}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No messages yet.</div>
        ) : messages.map((m) => {
          const isInbound = m.direction === "inbound";
          return (
            <div key={m.id} className={`flex ${isInbound ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isInbound ? "bg-gray-100 text-gray-900 rounded-bl-sm" : "text-white rounded-br-sm"}`} style={!isInbound ? { backgroundColor: PURPLE } : {}}>
                <p className="leading-relaxed">{m.body}</p>
                <p className={`text-xs mt-1 text-right ${isInbound ? "text-gray-400" : "text-purple-200"}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {!isInbound ? "  AI" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Reply */}
      {suggestedReply && (
        <button
          onClick={() => setReplyText(suggestedReply)}
          className="mb-2 w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg border text-sm"
          style={{ backgroundColor: PURPLE + "10", borderColor: PURPLE + "44", color: PURPLE }}
        >
          <Zap size={14} className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">{suggestedReply}</span>
          <span className="text-xs font-bold whitespace-nowrap">Tap to use</span>
        </button>
      )}

      {/* Composer */}
      <div className="flex gap-2 items-end border-t border-gray-100 pt-3">
        <button onClick={generateSuggestion} disabled={generating} className="p-2 rounded-lg hover:bg-purple-50 transition-colors" style={{ color: PURPLE }}>
          {generating ? <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> : <Zap size={20} />}
        </button>
        <textarea
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Type a reply..."
          rows={2}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); }
          }}
        />
        <button
          onClick={sendReply}
          disabled={sending || !replyText.trim()}
          className="p-2.5 rounded-xl text-white transition-opacity"
          style={{ backgroundColor: replyText.trim() ? PURPLE : "#D1D5DB" }}
        >
          {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
