import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

const STORAGE_COMPLETED = "quotepro_web_tour_completed";
const STORAGE_DISMISSED = "quotepro_web_tour_dismissed";

interface WalkthroughContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  isCompleted: boolean;
  isDismissed: boolean;
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextType>({
  isActive: false,
  currentStep: 0,
  totalSteps: 9,
  isCompleted: false,
  isDismissed: false,
  startTour: () => {},
  nextStep: () => {},
  previousStep: () => {},
  skipTour: () => {},
  completeTour: () => {},
  resetTour: () => {},
});

export function WalkthroughProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const totalSteps = 9;

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_COMPLETED) === "true";
    const dismissed = localStorage.getItem(STORAGE_DISMISSED) === "true";
    setIsCompleted(completed);
    setIsDismissed(dismissed);
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev < totalSteps - 1) return prev + 1;
      return prev;
    });
  }, [totalSteps]);

  const previousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setIsDismissed(true);
    setCurrentStep(0);
    localStorage.setItem(STORAGE_DISMISSED, "true");
  }, []);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setIsCompleted(true);
    setCurrentStep(0);
    localStorage.setItem(STORAGE_COMPLETED, "true");
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_COMPLETED);
    localStorage.removeItem(STORAGE_DISMISSED);
    setIsCompleted(false);
    setIsDismissed(false);
    setCurrentStep(0);
    setTimeout(() => setIsActive(true), 100);
  }, []);

  return (
    <WalkthroughContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps,
        isCompleted,
        isDismissed,
        startTour,
        nextStep,
        previousStep,
        skipTour,
        completeTour,
        resetTour,
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
}

export function useWalkthrough() {
  return useContext(WalkthroughContext);
}
