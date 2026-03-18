import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, ArrowRight } from "lucide-react";
import { useWalkthrough } from "../lib/walkthrough";
import { WALKTHROUGH_STEPS, TOTAL_STEPS } from "../lib/walkthroughSteps";

export function WalkthroughOverlay() {
  const {
    isActive,
    currentStep,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
  } = useWalkthrough();

  const navigate = useNavigate();
  const prevStepRef = useRef<number>(-1);
  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const step = WALKTHROUGH_STEPS[currentStep];

  useEffect(() => {
    if (!isActive || !step) return;
    if (prevStepRef.current === currentStep) return;
    prevStepRef.current = currentStep;

    if (step.navigateTo) {
      navigate(step.navigateTo);
    }
  }, [isActive, currentStep, step, navigate]);

  useEffect(() => {
    if (!isActive) {
      prevStepRef.current = -1;
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipTour();
      if (e.key === "ArrowRight" && !isLastStep) nextStep();
      if (e.key === "ArrowLeft" && currentStep > 0) previousStep();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isActive, isLastStep, currentStep, nextStep, previousStep, skipTour]);

  if (!isActive || !step) return null;

  const Icon = step.icon;

  const handleCta = () => {
    if (step.ctaPath) {
      completeTour();
      navigate(step.ctaPath);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      completeTour();
    } else {
      nextStep();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) skipTour();
      }}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          animation: "walkthroughEnter 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 bg-slate-100 dark:bg-slate-800 w-full">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%`,
              background: "linear-gradient(90deg, #2563EB, #7c3aed)",
            }}
          />
        </div>

        <button
          onClick={skipTour}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
          title="Skip tour"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-7 pt-7 pb-6">
          <div className="flex items-center gap-2 mb-5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: step.iconColor + "18" }}
            >
              <Icon className="w-5 h-5" style={{ color: step.iconColor }} />
            </div>
            <div className="flex gap-1.5 ml-auto pr-6">
              {WALKTHROUGH_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === currentStep ? 20 : 6,
                    height: 6,
                    backgroundColor:
                      i === currentStep
                        ? step.iconColor
                        : i < currentStep
                        ? "#94a3b8"
                        : "#e2e8f0",
                  }}
                />
              ))}
            </div>
          </div>

          <h2 className="text-[19px] font-bold text-slate-900 dark:text-white mb-2.5 leading-snug">
            {step.title}
          </h2>
          <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            {step.description}
          </p>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={previousStep}
              disabled={currentStep === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-0 disabled:pointer-events-none transition-all rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-2">
              {!isLastStep ? (
                <button
                  onClick={skipTour}
                  className="px-3 py-2 text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Skip
                </button>
              ) : null}

              {step.ctaLabel && step.ctaPath ? (
                <button
                  onClick={handleCta}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border transition-colors"
                  style={{
                    color: step.iconColor,
                    borderColor: step.iconColor + "30",
                    backgroundColor: step.iconColor + "08",
                  }}
                >
                  {step.ctaLabel}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: isLastStep
                    ? "linear-gradient(135deg, #16a34a, #059669)"
                    : "linear-gradient(135deg, #2563EB, #4f46e5)",
                }}
              >
                {isLastStep ? "Done" : "Next"}
                {!isLastStep ? <ChevronRight className="w-4 h-4" /> : null}
              </button>
            </div>
          </div>
        </div>

        <div className="px-7 pb-4 flex items-center justify-between">
          <p className="text-[11px] text-slate-300 dark:text-slate-600">
            {currentStep + 1} of {TOTAL_STEPS}
          </p>
          <p className="text-[11px] text-slate-300 dark:text-slate-600">
            Press Esc to skip
          </p>
        </div>
      </div>

      <style>{`
        @keyframes walkthroughEnter {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
