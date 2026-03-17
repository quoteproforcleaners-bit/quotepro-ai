import { useState } from "react";
import {
  MessageSquare,
  Mail,
  Repeat,
  Shield,
  TrendingUp,
  Star,
  Copy,
  Check,
  RefreshCw,
  Zap,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Textarea,
  SectionLabel,
} from "../components/ui";
import { ProGate } from "../components/ProGate";
import { apiRequest } from "../lib/api";

type MessageType =
  | "text_message"
  | "email"
  | "follow_up"
  | "objection_handling"
  | "recurring_upsell"
  | "deep_clean_first";

type Tone = "professional" | "friendly" | "premium" | "warm" | "direct" | "confident";
type Language = "en" | "es" | "pt" | "ru";

const MESSAGE_TYPES: { value: MessageType; label: string; icon: typeof MessageSquare }[] = [
  { value: "text_message", label: "Text Message", icon: MessageSquare },
  { value: "email", label: "Email", icon: Mail },
  { value: "follow_up", label: "Follow-up", icon: Repeat },
  { value: "objection_handling", label: "Objection Handling", icon: Shield },
  { value: "recurring_upsell", label: "Recurring Upsell", icon: TrendingUp },
  { value: "deep_clean_first", label: "Deep Clean First", icon: Star },
];

const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "premium", label: "Premium" },
  { value: "warm", label: "Warm" },
  { value: "direct", label: "Direct" },
  { value: "confident", label: "Confident" },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
];

function ChipButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
        selected
          ? "border-primary-500 bg-primary-50 text-primary-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function ClosingAssistantContent() {
  const [messageType, setMessageType] = useState<MessageType>("text_message");
  const [tone, setTone] = useState<Tone>("friendly");
  const [language, setLanguage] = useState<Language>("en");
  const [customerName, setCustomerName] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    setGeneratedMessage("");
    setCopied(false);
    try {
      const res = await apiRequest("POST", "/api/ai/closing-message", {
        messageType,
        tone,
        language,
        customerName: customerName || undefined,
        quoteAmount: quoteAmount ? parseFloat(quoteAmount) : undefined,
        serviceType: serviceType || undefined,
        notes: notes || undefined,
      });
      const data = await res.json();
      setGeneratedMessage(data.message || "");
    } catch (e: any) {
      setError(e?.message || "Failed to generate message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedMessage) return;
    await navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Message Settings" />
          <div className="px-4 pb-4 space-y-5">
            <div>
              <SectionLabel>Message Type</SectionLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {MESSAGE_TYPES.map((mt) => {
                  const Icon = mt.icon;
                  return (
                    <button
                      key={mt.value}
                      onClick={() => setMessageType(mt.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        messageType === mt.value
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {mt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionLabel>Tone</SectionLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {TONES.map((t) => (
                  <ChipButton
                    key={t.value}
                    selected={tone === t.value}
                    onClick={() => setTone(t.value)}
                  >
                    {t.label}
                  </ChipButton>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Language</SectionLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {LANGUAGES.map((l) => (
                  <ChipButton
                    key={l.value}
                    selected={language === l.value}
                    onClick={() => setLanguage(l.value)}
                  >
                    {l.label}
                  </ChipButton>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Quote Context" />
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Sarah Johnson"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Quote Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Service Type</label>
              <input
                type="text"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder="e.g. Weekly recurring, Deep clean"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Additional Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific details or objections to address..."
                rows={3}
              />
            </div>
          </div>
        </Card>

        <Button
          variant="primary"
          size="lg"
          icon={isLoading ? Loader2 : Zap}
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Generating..." : "Generate Message"}
        </Button>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isLoading && !generatedMessage && (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-sm text-slate-500">Crafting your message...</p>
            </div>
          </Card>
        )}

        {generatedMessage && (
          <Card>
            <CardHeader
              title="Generated Message"
              actions={
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      copied
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>
                </div>
              }
            />
            <div className="px-4 pb-4">
              <textarea
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
                rows={16}
                className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none leading-relaxed"
              />
            </div>
          </Card>
        )}

        {!generatedMessage && !isLoading && !error && (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-500" />
              </div>
              <p className="font-medium text-slate-900 text-sm">Ready to generate</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Configure your settings on the left, then click Generate Message to create a personalized closing message.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ClosingAssistantPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Closing Assistant"
        subtitle="Generate personalized messages to close more quotes"
      />
      <ProGate feature="Closing Assistant">
        <ClosingAssistantContent />
      </ProGate>
    </div>
  );
}
