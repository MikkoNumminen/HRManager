"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  TUTORIAL_STEPS,
  DEMO_EMAIL,
  STORAGE_KEY,
  TutorialStep,
  TutorialStepId,
  matchRoute,
} from "@/tutorialConfig";

interface TutorialContextValue {
  isActive: boolean;
  steps: TutorialStep[];
  completedSteps: Set<TutorialStepId>;
  currentStep: TutorialStep | null;
  completeStep: (stepId: TutorialStepId) => void;
  resetTutorial: () => void;
  totalSteps: number;
  completedCount: number;
  celebratingStep: TutorialStepId | null;
  allComplete: boolean;
  dismissCelebration: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}

export function useTutorialMaybe() {
  return useContext(TutorialContext);
}

function loadProgress(): Set<TutorialStepId> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch {
    /* empty */
  }
  return new Set();
}

function saveProgress(completed: Set<TutorialStepId>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  } catch {
    /* empty */
  }
}

export default function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isDemo = session?.user?.email === DEMO_EMAIL;

  const [completedSteps, setCompletedSteps] = useState<Set<TutorialStepId>>(new Set());
  const [celebratingStep, setCelebratingStep] = useState<TutorialStepId | null>(null);
  const [initialized, setInitialized] = useState(false);

  const completedStepsRef = useRef(completedSteps);
  useEffect(() => {
    completedStepsRef.current = completedSteps;
  }, [completedSteps]);

  // Reset tutorial when demo user logs out (isDemo goes true → false)
  const wasDemoRef = useRef(isDemo);
  useEffect(() => {
    if (wasDemoRef.current && !isDemo) {
      setCompletedSteps(new Set());
      setCelebratingStep(null);
      saveProgress(new Set());
    }
    wasDemoRef.current = isDemo;
  }, [isDemo]);

  useEffect(() => {
    if (isDemo) {
      setCompletedSteps(loadProgress());
    }
    setInitialized(true);
  }, [isDemo]);

  const completeStep = useCallback((stepId: TutorialStepId) => {
    setCompletedSteps((prev) => {
      if (prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.add(stepId);
      saveProgress(next);
      setCelebratingStep(stepId);
      return next;
    });
  }, []);

  const resetTutorial = useCallback(() => {
    setCompletedSteps(new Set());
    setCelebratingStep(null);
    saveProgress(new Set());
  }, []);

  const dismissCelebration = useCallback(() => {
    setCelebratingStep(null);
  }, []);

  useEffect(() => {
    if (!isDemo || !initialized) return;
    TUTORIAL_STEPS.forEach((step) => {
      if (step.autoCompleteOnRoute && !completedStepsRef.current.has(step.id)) {
        if (matchRoute(step.route, pathname)) {
          completeStep(step.id);
        }
      }
    });
  }, [pathname, isDemo, initialized, completeStep]);

  useEffect(() => {
    if (!isDemo || !initialized) return;

    const handleEvent = (e: Event) => {
      const eventName = e.type;
      const step = TUTORIAL_STEPS.find((s) => s.event === eventName);
      if (step && !completedStepsRef.current.has(step.id)) {
        completeStep(step.id);
      }
    };

    const eventSteps = TUTORIAL_STEPS.filter((s) => s.event);
    eventSteps.forEach((step) => {
      window.addEventListener(step.event!, handleEvent);
    });

    return () => {
      eventSteps.forEach((step) => {
        window.removeEventListener(step.event!, handleEvent);
      });
    };
  }, [isDemo, initialized, completeStep]);

  const currentStep = useMemo(() => {
    return TUTORIAL_STEPS.find((s) => !completedSteps.has(s.id)) ?? null;
  }, [completedSteps]);

  const totalSteps = TUTORIAL_STEPS.length;
  const completedCount = completedSteps.size;
  const allComplete = completedCount === totalSteps;

  const value = useMemo<TutorialContextValue>(
    () => ({
      isActive: isDemo,
      steps: TUTORIAL_STEPS,
      completedSteps,
      currentStep,
      completeStep,
      resetTutorial,
      totalSteps,
      completedCount,
      celebratingStep,
      allComplete,
      dismissCelebration,
    }),
    [
      isDemo,
      completedSteps,
      currentStep,
      completeStep,
      resetTutorial,
      totalSteps,
      completedCount,
      celebratingStep,
      allComplete,
      dismissCelebration,
    ],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}
