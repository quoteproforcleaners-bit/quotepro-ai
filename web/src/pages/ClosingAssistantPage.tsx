import { useState, useRef } from "react";
import {
  Shield,
  Copy,
  Check,
  RefreshCw,
  Zap,
  AlertCircle,
  Loader2,
  Image,
  ChevronDown,
  ChevronUp,
  ArrowRightCircle,
  Tag,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  SectionLabel,
} from "../components/ui";
import { ProGate } from "../components/ProGate";
import { apiRequest } from "../lib/api";

type ObjectionType =
  | "price_objection"
  | "need_to_think"
  | "recurring_hesitation"
  | "deep_clean_resistance"
  | "one_time_only"
  | "follow_up";

type Tone = "friendly" | "professional" | "warm" | "confident" | "direct" | "premium";
type Language = "en" | "es" | "pt" | "ru";

const OBJECTION_TYPES: { value: ObjectionType; label: string; example: string }[] = [
  { value: "price_objection", label: "Too Expensive", example: "Can you do it cheaper?" },
  { value: "need_to_think", label: "Need to Think", example: "I'll think about it." },
  { value: "recurring_hesitation", label: "No Recurring", example: "I just want a one-time clean." },
  { value: "deep_clean_resistance", label: "Skip Deep Clean", example: "I don't need a deep clean." },
  { value: "one_time_only", label: "One-Time Only", example: "I only want this once." },
  { value: "follow_up", label: "Follow-Up", example: "Checking in after the quote." },
];

const TONES: { value: Tone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "warm", label: "Warm" },
  { value: "confident", label: "Confident" },
  { value: "direct", label: "Direct" },
  { value: "premium", label: "Premium" },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
];

interface GeneratedResult {
  primaryReply: string;
  alternateReply: string;
  objectionType: string;
  nextMove: string;
}

function ChipButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
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

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
        copied
          ? "border-green-300 bg-green-50 text-green-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

function ObjectionAssistantContent() {
  const [objectionText, setObjectionText] = useState("");
  const [objectionType, setObjectionType] = useState<ObjectionType>("price_objection");
  const [tone, setTone] = useState<Tone>("friendly");
  const [language, setLanguage] = useState<Language>("en");
  const [showContext, setShowContext] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setIsExtracting(true);
    setError("");
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await apiRequest("POST", "/api/ai/objection-extract", {
        imageBase64: base64,
        mimeType: file.type || "image/jpeg",
      });
      const data = await res.json();
      if (data.text) {
        setObjectionText(data.text);
      } else {
        setError("Could not extract text from the image. Please type the message manually.");
      }
    } catch {
      setError("Could not extract text from the image. Please type it manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    if (!objectionText.trim() && !notes.trim()) {
      setError("Please paste the customer's message or add some context first.");
      return;
    }
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await apiRequest("POST", "/api/ai/closing-message", {
        objectionText: objectionText.trim() || undefined,
        objectionType,
        tone,
        language,
        customerName: customerName || undefined,
        quoteAmount: quoteAmount ? parseFloat(quoteAmount) : undefined,
        serviceType: serviceType || undefined,
        notes: notes || undefined,
      });
      const data = await res.json();
      setResult({
        primaryReply: data.primaryReply || data.message || "",
        alternateReply: data.alternateReply || "",
        objectionType: data.objectionType || "",
        nextMove: data.nextMove || "",
      });
    } catch (e: any) {
      setError(e?.message || "Failed to generate reply. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column — inputs */}
      <div className="space-y-5">
        {/* Customer message */}
        <Card>
          <CardHeader title="Customer Message" />
          <div className="px-4 pb-4 space-y-3">
            <textarea
              value={objectionText}
              onChange={(e) => setObjectionText(e.target.value)}
              rows={5}
              placeholder={`Paste the customer's message here...\n\nExamples:\n• "That's more than I was expecting."\n• "I need to think about it."\n• "I only want a one-time clean."`}
              className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none leading-relaxed"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting}
              className="flex items-center justify-center gap-2 w-full py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              {isExtracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Image className="w-4 h-4" />
              )}
              {isExtracting ? "Extracting text..." : "Upload screenshot to extract text"}
            </button>
          </div>
        </Card>

        {/* Objection type */}
        <Card>
          <CardHeader title="Objection Type" />
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {OBJECTION_TYPES.map((ot) => (
                <ChipButton key={ot.value} selected={objectionType === ot.value} onClick={() => setObjectionType(ot.value)}>
                  {ot.label}
                </ChipButton>
              ))}
            </div>
          </div>
        </Card>

        {/* Tone + Language */}
        <Card>
          <CardHeader title="Tone & Language" />
          <div className="px-4 pb-4 space-y-4">
            <div>
              <SectionLabel>Tone</SectionLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {TONES.map((t) => (
                  <ChipButton key={t.value} selected={tone === t.value} onClick={() => setTone(t.value)}>
                    {t.label}
                  </ChipButton>
                ))}
              </div>
            </div>
            <div>
              <SectionLabel>Language</SectionLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {LANGUAGES.map((l) => (
                  <ChipButton key={l.value} selected={language === l.value} onClick={() => setLanguage(l.value)}>
                    {l.label}
                  </ChipButton>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Optional context */}
        <button
          onClick={() => setShowContext((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          {showContext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showContext ? "Hide quote context" : "Add quote context (optional)"}
        </button>

        {showContext && (
          <Card>
            <div className="px-4 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Sarah"
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
                <label className="block text-xs font-medium text-slate-600 mb-1">Extra Context</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Price-sensitive, resisting recurring service"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </Card>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button variant="primary" size="lg" icon={isLoading ? Loader2 : Zap} onClick={handleGenerate} disabled={isLoading} className="w-full">
          {isLoading ? "Analyzing objection..." : "Generate Reply"}
        </Button>
      </div>

      {/* Right column — results */}
      <div className="space-y-4">
        {isLoading && (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Analyzing objection...</p>
              <p className="text-xs text-slate-400">Building your reply...</p>
            </div>
          </Card>
        )}

        {result && !isLoading && (
          <>
            {result.objectionType && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-primary-200 bg-primary-50 w-fit">
                <Tag className="w-3.5 h-3.5 text-primary-600" />
                <span className="text-xs font-semibold text-primary-700">{result.objectionType}</span>
              </div>
            )}

            <Card>
              <CardHeader
                title="Primary Reply"
                actions={
                  <div className="flex gap-2">
                    <CopyButton text={result.primaryReply} label="Copy Reply" />
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
                  value={result.primaryReply}
                  onChange={(e) => setResult((r) => r ? { ...r, primaryReply: e.target.value } : r)}
                  rows={7}
                  className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none leading-relaxed"
                />
              </div>
            </Card>

            {result.alternateReply && (
              <Card>
                <CardHeader
                  title="Alternate Version"
                  actions={<CopyButton text={result.alternateReply} />}
                />
                <div className="px-4 pb-4">
                  <textarea
                    value={result.alternateReply}
                    onChange={(e) => setResult((r) => r ? { ...r, alternateReply: e.target.value } : r)}
                    rows={6}
                    className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none leading-relaxed"
                  />
                </div>
              </Card>
            )}

            {result.nextMove && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 border border-primary-100">
                <ArrowRightCircle className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-primary-700 uppercase tracking-wide mb-1">Suggested Next Move</p>
                  <p className="text-sm text-primary-800 leading-relaxed">{result.nextMove}</p>
                </div>
              </div>
            )}
          </>
        )}

        {!result && !isLoading && (
          <Card>
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-500" />
              </div>
              <p className="font-medium text-slate-900 text-sm">Ready to generate</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Paste a customer objection or upload a screenshot, then click Generate Reply.
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
        title="Objection Assistant"
        subtitle="Paste a customer objection or upload a screenshot to generate a reply that closes the job."
      />
      <ProGate feature="Objection Assistant">
        <ObjectionAssistantContent />
      </ProGate>
    </div>
  );
}
