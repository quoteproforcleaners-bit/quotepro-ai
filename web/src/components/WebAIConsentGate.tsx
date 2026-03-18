import { Shield, ChevronRight } from "lucide-react";
import { useWebAIConsent } from "../lib/webAIConsent";
import type { ReactNode } from "react";

interface WebAIConsentGateProps {
  children: ReactNode;
}

export function WebAIConsentGate({ children }: WebAIConsentGateProps) {
  const { hasAIConsent, isLoading, requestAIConsent } = useWebAIConsent();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasAIConsent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">
          Data Sharing Permission Required
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-5">
          This feature sends your business data to a third-party AI service
          (OpenAI) to generate responses and recommendations. You must review
          and agree to data sharing before using AI features.
        </p>

        <div className="w-full rounded-xl bg-slate-50 border border-slate-200 p-4 mb-5 text-left">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
            Personal data that will be shared with OpenAI
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

        <p className="text-xs text-slate-400 mb-2">
          Third-Party Service: <span className="font-medium text-slate-600">OpenAI</span>
          {" "}— data is not used to train AI models.
        </p>
        <p className="text-xs text-slate-400 mb-5">
          AI features are unavailable without data sharing permission.
        </p>

        <button
          onClick={requestAIConsent}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-md shadow-blue-600/20"
        >
          <Shield className="w-4 h-4" />
          Allow Data Sharing &amp; Continue
        </button>

        <p className="text-xs text-slate-400 mt-3">
          You can revoke this permission at any time in Settings &rarr; Account.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
