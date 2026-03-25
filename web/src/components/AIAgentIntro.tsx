import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart2, Target, BookOpen, ArrowRight, Sparkles, X } from "lucide-react";
import { apiPost } from "../lib/api";
import { trackEvent } from "../lib/analytics";

interface Mode {
  id: "business" | "coach" | "teach";
  label: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  example: string;
  staticAnswer: string;
}

const MODES: Mode[] = [
  {
    id: "business",
    label: "My Business",
    icon: BarChart2,
    color: "from-blue-600/30 to-blue-800/20",
    borderColor: "border-blue-500/40",
    example: "Which of my quotes are about to expire this week?",
    staticAnswer: "You have 3 quotes expiring this week. Your largest is $340 for a 4-bed home sent 5 days ago. I'd follow up today with a short SMS — want me to draft it?",
  },
  {
    id: "coach",
    label: "Coach Me",
    icon: Target,
    color: "from-purple-600/30 to-purple-800/20",
    borderColor: "border-purple-500/40",
    example: "How do I handle a customer who says my price is too high?",
    staticAnswer: "Don't drop your price — anchor to your value. Say: 'I completely understand. Our clients tell us the reliability and attention to detail is worth every dollar. What specifically concerns you about the investment?' Then listen and address the real objection.",
  },
  {
    id: "teach",
    label: "Teach Me",
    icon: BookOpen,
    color: "from-green-600/30 to-green-800/20",
    borderColor: "border-green-500/40",
    example: "What's a good profit margin for a residential cleaning business?",
    staticAnswer: "For residential cleaning, aim for 15–25% net margin. Most owners run 40–55% gross before labor. The key levers: minimize drive time between jobs, keep crew size matched to job size, and price recurring clients at a 5–10% discount that still clears 20% net.",
  },
];

interface Props {
  onComplete: () => void;
  userId: string;
}

export default function AIAgentIntro({ onComplete, userId }: Props) {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [cardClicked, setCardClicked] = useState(false);

  const handleModeClick = async (mode: Mode) => {
    if (cardClicked) return;
    setCardClicked(true);
    setSelectedMode(mode);
    setLoading(true);
    setAnswer(null);

    trackEvent("AI_AGENT_INTRO_SHOWN");
    trackEvent("AI_AGENT_INTRO_CARD_CLICKED", { mode: mode.id });

    try {
      const data: any = await apiPost("/api/ai/agent-chat", {
        message: mode.example,
        mode: mode.id,
        conversationHistory: [],
      });
      setAnswer(data.reply || data.message || mode.staticAnswer);
    } catch {
      setAnswer(mode.staticAnswer);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAI = () => {
    localStorage.setItem("ai_intro_shown", "true");
    if (selectedMode) {
      sessionStorage.setItem("ai_preload_mode", selectedMode.id);
      sessionStorage.setItem("ai_preload_question", selectedMode.example);
    }
    onComplete();
    navigate("/ai-assistant");
  };

  const handleSkip = () => {
    localStorage.setItem("ai_intro_shown", "true");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto" style={{ background: "linear-gradient(135deg, #020617 0%, #0f172a 40%, #0c1a3a 100%)" }}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "6s" }} />
      </div>

      <div className="relative w-full max-w-3xl mx-auto px-6 py-12">
        <button onClick={handleSkip} className="absolute top-4 right-6 text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-blue-300 text-xs font-semibold tracking-wide uppercase">AI-Powered</span>
          </div>
          <h1 className="text-white text-4xl font-bold tracking-tight mb-3">
            Meet your AI Business Coach
          </h1>
          <p className="text-slate-400 text-lg">
            Ask it anything about your business, your quotes, or how to grow.
          </p>
          {!cardClicked && (
            <p className="text-slate-500 text-sm mt-2">Click a card to see it in action</p>
          )}
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode?.id === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleModeClick(mode)}
                disabled={cardClicked && !isSelected}
                className={`relative text-left rounded-2xl border p-5 transition-all duration-300 group ${
                  isSelected
                    ? `bg-gradient-to-br ${mode.color} ${mode.borderColor} ring-1 ring-white/10 scale-[1.02]`
                    : `bg-gradient-to-br ${mode.color} ${mode.borderColor} hover:scale-[1.01] hover:ring-1 hover:ring-white/10`
                } ${cardClicked && !isSelected ? "opacity-40" : ""}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-bold text-sm">{mode.label}</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed italic">
                  "{mode.example}"
                </p>
                {!cardClicked && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                    <span>Try this</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Response preview */}
        {selectedMode && (
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 mb-8 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-slate-400 text-sm font-medium">QuotePro AI</span>
            </div>

            <p className="text-slate-400 text-sm mb-3 italic">"{selectedMode.example}"</p>

            {loading ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Thinking...</span>
              </div>
            ) : (
              <p className="text-white text-sm leading-relaxed">{answer}</p>
            )}
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleOpenAI}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all"
          >
            Open AI Assistant <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-200 text-sm transition-colors flex items-center gap-1"
          >
            Go to dashboard <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
