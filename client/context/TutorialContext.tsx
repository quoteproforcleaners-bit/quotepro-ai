import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { LayoutRectangle } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COMPLETED_TOURS_KEY = "@quotepro_completed_tours";
const TOUR_DISMISSED_KEY = "@quotepro_tour_dismissed";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetRef?: string;
  position?: "top" | "bottom" | "center";
  icon?: string;
}

export interface TourDefinition {
  id: string;
  name: string;
  steps: TourStep[];
  triggerOnce?: boolean;
}

interface TargetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
}

interface TutorialContextValue {
  activeTour: TourDefinition | null;
  currentStepIndex: number;
  isActive: boolean;
  completedTours: string[];
  startTour: (tour: TourDefinition) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  registerTarget: (id: string, layout: TargetLayout) => void;
  unregisterTarget: (id: string) => void;
  getTargetLayout: (id: string) => TargetLayout | undefined;
  hasCompletedTour: (tourId: string) => boolean;
  resetAllTours: () => Promise<void>;
  allDismissed: boolean;
  dismissAll: () => Promise<void>;
}

const TutorialContext = createContext<TutorialContextValue>({
  activeTour: null,
  currentStepIndex: 0,
  isActive: false,
  completedTours: [],
  startTour: () => {},
  nextStep: () => {},
  previousStep: () => {},
  skipTour: () => {},
  completeTour: () => {},
  registerTarget: () => {},
  unregisterTarget: () => {},
  getTargetLayout: () => undefined,
  hasCompletedTour: () => false,
  resetAllTours: async () => {},
  allDismissed: false,
  dismissAll: async () => {},
});

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [activeTour, setActiveTour] = useState<TourDefinition | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedTours, setCompletedTours] = useState<string[]>([]);
  const [allDismissed, setAllDismissed] = useState(false);
  const targetsRef = useRef<Map<string, TargetLayout>>(new Map());

  useEffect(() => {
    loadCompleted();
    loadDismissed();
  }, []);

  const loadCompleted = async () => {
    try {
      const raw = await AsyncStorage.getItem(COMPLETED_TOURS_KEY);
      if (raw) setCompletedTours(JSON.parse(raw));
    } catch {}
  };

  const loadDismissed = async () => {
    try {
      const val = await AsyncStorage.getItem(TOUR_DISMISSED_KEY);
      if (val === "true") setAllDismissed(true);
    } catch {}
  };

  const saveCompleted = async (tours: string[]) => {
    try {
      await AsyncStorage.setItem(COMPLETED_TOURS_KEY, JSON.stringify(tours));
    } catch {}
  };

  const startTour = useCallback((tour: TourDefinition) => {
    if (allDismissed) return;
    if (tour.triggerOnce && completedTours.includes(tour.id)) return;
    setActiveTour(tour);
    setCurrentStepIndex(0);
  }, [completedTours, allDismissed]);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (currentStepIndex < activeTour.steps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      completeTour();
    }
  }, [activeTour, currentStepIndex]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  const completeTour = useCallback(() => {
    if (activeTour) {
      const updated = [...completedTours, activeTour.id].filter((v, i, a) => a.indexOf(v) === i);
      setCompletedTours(updated);
      saveCompleted(updated);
    }
    setActiveTour(null);
    setCurrentStepIndex(0);
  }, [activeTour, completedTours]);

  const skipTour = useCallback(() => {
    if (activeTour) {
      const updated = [...completedTours, activeTour.id].filter((v, i, a) => a.indexOf(v) === i);
      setCompletedTours(updated);
      saveCompleted(updated);
    }
    setActiveTour(null);
    setCurrentStepIndex(0);
  }, [activeTour, completedTours]);

  const registerTarget = useCallback((id: string, layout: TargetLayout) => {
    targetsRef.current.set(id, layout);
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    targetsRef.current.delete(id);
  }, []);

  const getTargetLayout = useCallback((id: string) => {
    return targetsRef.current.get(id);
  }, []);

  const hasCompletedTour = useCallback((tourId: string) => {
    return completedTours.includes(tourId);
  }, [completedTours]);

  const resetAllTours = useCallback(async () => {
    setCompletedTours([]);
    setAllDismissed(false);
    await AsyncStorage.removeItem(COMPLETED_TOURS_KEY);
    await AsyncStorage.removeItem(TOUR_DISMISSED_KEY);
  }, []);

  const dismissAll = useCallback(async () => {
    setAllDismissed(true);
    setActiveTour(null);
    setCurrentStepIndex(0);
    await AsyncStorage.setItem(TOUR_DISMISSED_KEY, "true");
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        activeTour,
        currentStepIndex,
        isActive: activeTour !== null,
        completedTours,
        startTour,
        nextStep,
        previousStep,
        skipTour,
        completeTour,
        registerTarget,
        unregisterTarget,
        getTargetLayout,
        hasCompletedTour,
        resetAllTours,
        allDismissed,
        dismissAll,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  return useContext(TutorialContext);
}
