import { createContext, useContext, useState, useCallback, type ReactNode } from"react";
import { X, RefreshCw, WifiOff } from"lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface AIToastState {
 visible: boolean;
 message: string;
 retryFn?: () => void;
}

interface AIToastContextValue {
 showAIError: (message?: string, retryFn?: () => void) => void;
 clearAIError: () => void;
}

/* ─── Context ────────────────────────────────────────────────────────────── */

const AIToastContext = createContext<AIToastContextValue>({
 showAIError: () => {},
 clearAIError: () => {},
});

/* ─── Provider ───────────────────────────────────────────────────────────── */

export function AIToastProvider({ children }: { children: ReactNode }) {
 const [toast, setToast] = useState<AIToastState>({ visible: false, message:""});

 const showAIError = useCallback((
 message ="AI is taking a moment. Please try again.",
 retryFn?: () => void
 ) => {
 setToast({ visible: true, message, retryFn });
 }, []);

 const clearAIError = useCallback(() => {
 setToast({ visible: false, message:""});
 }, []);

 return (
 <AIToastContext.Provider value={{ showAIError, clearAIError }}>
 {children}
 {toast.visible && (
 <div className="fixed bottom-6 right-6 z-[9999] animate-slide-up">
 <div className="bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-3 max-w-sm">
 <WifiOff className="w-4 h-4 text-amber-400 shrink-0"/>
 <span className="flex-1">{toast.message}</span>
 {toast.retryFn && (
 <button
 onClick={() => {
 clearAIError();
 toast.retryFn?.();
 }}
 className="flex items-center gap-1 text-primary-400 hover:text-primary-300 transition-colors shrink-0 font-semibold"
 aria-label="Retry AI request"
 >
 <RefreshCw className="w-3.5 h-3.5"/>
 Retry
 </button>
 )}
 <button
 onClick={clearAIError}
 className="text-zinc-400 hover:text-white transition-colors shrink-0"
 aria-label="Dismiss"
 >
 <X className="w-3.5 h-3.5"/>
 </button>
 </div>
 </div>
 )}
 </AIToastContext.Provider>
 );
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export function useAIToast() {
 return useContext(AIToastContext);
}

/* ─── Utility: wrap any AI apiPost call with auto-toast on failure ────────── */

export function useAIRequest() {
 const { showAIError } = useAIToast();

 const withAIToast = useCallback(
 async <T,>(fn: () => Promise<T>, retryFn?: () => void): Promise<T | null> => {
 try {
 return await fn();
 } catch (err: any) {
 const isAIError =
 err?.status === 503 ||
 err?.status === 500 ||
 err?.message?.toLowerCase().includes("ai") ||
 err?.message?.toLowerCase().includes("temporarily");
 const message = isAIError
 ?"AI is taking a moment. Please try again."
 : (err?.message ||"Something went wrong. Please try again.");
 showAIError(message, retryFn);
 return null;
 }
 },
 [showAIError]
 );

 return { withAIToast };
}
