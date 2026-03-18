import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { Shield, ChevronRight, X, Check } from "lucide-react";
import { useAuth } from "./auth";

const CONSENT_VERSION = "1.0";
const LS_KEY = "quotepro_ai_consent_v1";

interface ConsentData {
  aiConsentAcceptedAt: string | null;
  termsAcceptedAt: string | null;
  consentVersion: string | null;
}

interface WebAIConsentContextType {
  hasAIConsent: boolean;
  consentData: ConsentData | null;
  isLoading: boolean;
  requestAIConsent: () => Promise<boolean>;
  revokeAIConsent: () => void;
  refreshConsent: () => void;
}

const WebAIConsentContext = createContext<WebAIConsentContextType>({
  hasAIConsent: false,
  consentData: null,
  isLoading: true,
  requestAIConsent: async () => false,
  revokeAIConsent: () => {},
  refreshConsent: () => {},
});

export function useWebAIConsent() {
  return useContext(WebAIConsentContext);
}

function AIConsentModal({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden">
        <div className="px-6 pt-6 pb-5">
          <div className="flex items-center justify-between mb-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <button
              onClick={onDecline}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            AI Features Use Your Data
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-5">
            Some features in QuotePro use AI to generate content like email
            drafts, quote suggestions, and business insights. To do this, some
            of your data is sent to a third-party AI service.
          </p>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-4">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
              Data that may be shared
            </p>
            {[
              "Customer names and contact details",
              "Quote amounts and service details",
              "Job history and scheduling info",
              "Communication history and notes",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 mb-2 last:mb-0">
                <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-600">{item}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-5">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Who receives this data
            </p>
            <p className="text-sm text-slate-600">
              Your data is processed by{" "}
              <span className="font-medium text-slate-800">OpenAI</span>. It is
              used only to generate responses for you and is{" "}
              <span className="font-medium text-slate-800">
                not used to train AI models
              </span>
              .
            </p>
          </div>

          <p className="text-xs text-slate-400 text-center leading-relaxed mb-5">
            You can change this setting at any time in Settings &rarr; Account.
            See our{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-600"
            >
              Privacy Policy
            </a>{" "}
            for full details.
          </p>

          <button
            onClick={onAccept}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-md shadow-blue-600/20 mb-2.5"
          >
            <Check className="w-4 h-4" />
            I Agree, Enable AI
          </button>
          <button
            onClick={onDecline}
            className="w-full h-10 flex items-center justify-center rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            No Thanks
          </button>
        </div>
      </div>
    </div>
  );
}

export function WebAIConsentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [consentData, setConsentData] = useState<ConsentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const hasAIConsent =
    consentData?.aiConsentAcceptedAt != null ||
    localStorage.getItem(LS_KEY) === "true";

  const fetchConsent = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/consent", { credentials: "include" });
      if (res.ok) {
        const data: ConsentData = await res.json();
        setConsentData(data);
        if (data.aiConsentAcceptedAt) {
          localStorage.setItem(LS_KEY, "true");
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConsent();
  }, [fetchConsent]);

  const recordConsent = useCallback(async () => {
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ai", version: CONSENT_VERSION }),
      });
      if (res.ok) {
        const data = await res.json();
        setConsentData((prev) => ({
          ...(prev ?? {
            termsAcceptedAt: null,
            consentVersion: CONSENT_VERSION,
          }),
          aiConsentAcceptedAt: data.acceptedAt,
          consentVersion: CONSENT_VERSION,
        }));
        localStorage.setItem(LS_KEY, "true");
      }
    } catch {
      localStorage.setItem(LS_KEY, "true");
    }
  }, []);

  const requestAIConsent = useCallback(async (): Promise<boolean> => {
    const alreadyConsented =
      consentData?.aiConsentAcceptedAt != null ||
      localStorage.getItem(LS_KEY) === "true";
    if (alreadyConsented) return true;

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setShowModal(true);
    });
  }, [consentData]);

  const handleAccept = useCallback(async () => {
    setShowModal(false);
    await recordConsent();
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  }, [recordConsent]);

  const handleDecline = useCallback(() => {
    setShowModal(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  const revokeAIConsent = useCallback(async () => {
    localStorage.removeItem(LS_KEY);
    setConsentData((prev) =>
      prev ? { ...prev, aiConsentAcceptedAt: null } : null
    );
  }, []);

  return (
    <WebAIConsentContext.Provider
      value={{
        hasAIConsent,
        consentData,
        isLoading,
        requestAIConsent,
        revokeAIConsent,
        refreshConsent: fetchConsent,
      }}
    >
      {children}
      {showModal ? (
        <AIConsentModal onAccept={handleAccept} onDecline={handleDecline} />
      ) : null}
    </WebAIConsentContext.Provider>
  );
}
