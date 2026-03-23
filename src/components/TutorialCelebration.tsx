"use client";

import { useEffect, useRef, useCallback } from "react";
import { Box, Typography, Zoom } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { colors } from "@/muiStyles";
import { useTutorial } from "./TutorialProvider";
import { TUTORIAL_STEPS } from "@/tutorialConfig";
import { useTranslations } from "next-intl";

const CELEBRATION_STYLE = `
@keyframes tutorial-celebration-glow {
  0%, 100% { text-shadow: 0 0 10px rgba(74, 222, 128, 0.5), 0 0 20px rgba(74, 222, 128, 0.3); }
  50% { text-shadow: 0 0 20px rgba(74, 222, 128, 0.8), 0 0 40px rgba(74, 222, 128, 0.5), 0 0 60px rgba(74, 222, 128, 0.3); }
}
@keyframes tutorial-trophy-bounce {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.2) rotate(-10deg); }
  50% { transform: scale(1.3) rotate(0deg); }
  75% { transform: scale(1.2) rotate(10deg); }
}
@keyframes tutorial-finale-bg {
  0% { opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

function fireConfetti() {
  import("canvas-confetti").then((mod) => {
    const confetti = mod.default;
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ["#4ade80", "#f0f0f0", "#94a3b8", "#22c55e", "#ffffff"],
    });
  });
}

function fireFinale() {
  import("canvas-confetti").then((mod) => {
    const confetti = mod.default;
    const defaults = {
      origin: { y: 0.6 },
      colors: ["#4ade80", "#22c55e", "#f0f0f0", "#fbbf24", "#f472b6", "#60a5fa"],
    };

    confetti({ ...defaults, particleCount: 60, spread: 26, startVelocity: 55 });
    setTimeout(() => confetti({ ...defaults, particleCount: 40, spread: 60 }), 150);
    setTimeout(
      () =>
        confetti({
          ...defaults,
          particleCount: 80,
          spread: 100,
          startVelocity: 35,
          decay: 0.91,
          scalar: 0.8,
        }),
      300,
    );
    setTimeout(
      () =>
        confetti({ ...defaults, particleCount: 30, spread: 120, startVelocity: 45, scalar: 1.2 }),
      500,
    );

    setTimeout(() => {
      confetti({ ...defaults, particleCount: 50, spread: 150, origin: { y: 0.4 } });
      confetti({ ...defaults, particleCount: 50, spread: 150, origin: { y: 0.8 } });
    }, 800);

    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 100,
        spread: 180,
        startVelocity: 30,
        gravity: 0.5,
        origin: { y: 0.5 },
      });
    }, 1200);
  });
}

export default function TutorialCelebration() {
  const t = useTranslations("tutorial");
  const { celebratingStep, allComplete, dismissCelebration } = useTutorial();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPlayedFinaleRef = useRef(false);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dismissCelebration();
  }, [dismissCelebration]);

  useEffect(() => {
    if (!celebratingStep) {
      hasPlayedFinaleRef.current = false;
      return;
    }

    const isFinale = allComplete && !hasPlayedFinaleRef.current;

    if (isFinale) {
      hasPlayedFinaleRef.current = true;
      fireFinale();
      timerRef.current = setTimeout(dismiss, 6000);
    } else if (!allComplete) {
      fireConfetti();
      timerRef.current = setTimeout(dismiss, 3000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [celebratingStep, allComplete, dismiss]);

  if (!celebratingStep) return null;

  const step = TUTORIAL_STEPS.find((s) => s.id === celebratingStep);
  const stepName = step ? t(`step_${step.id}` as Parameters<typeof t>[0]) : "";

  return (
    <>
      <style>{CELEBRATION_STYLE}</style>

      {allComplete && (
        <Box
          onClick={dismiss}
          sx={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            zIndex: 1300,
            animation: "tutorial-finale-bg 6s ease-in-out forwards",
            cursor: "pointer",
          }}
        />
      )}

      <Box
        onClick={dismiss}
        sx={{
          position: "fixed",
          top: allComplete ? "50%" : "20%",
          left: "50%",
          transform: allComplete ? "translate(-50%, -50%)" : "translateX(-50%)",
          zIndex: 1400,
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        <Zoom in timeout={400}>
          <Box>
            {allComplete ? (
              <Box>
                <EmojiEventsIcon
                  sx={{
                    fontSize: 80,
                    color: colors.warning,
                    animation: "tutorial-trophy-bounce 1s ease-in-out infinite",
                    filter: "drop-shadow(0 0 20px rgba(251, 191, 36, 0.5))",
                  }}
                />
                <Typography
                  variant="h3"
                  sx={{
                    color: colors.green400,
                    fontWeight: 800,
                    animation: "tutorial-celebration-glow 2s ease-in-out infinite",
                    mb: 1,
                  }}
                >
                  {t("finaleTitle")}
                </Typography>
                <Typography variant="h6" sx={{ color: colors.slate100 }}>
                  {t("finaleMessage")}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  backgroundColor: colors.slate700,
                  border: `2px solid ${colors.green400}`,
                  borderRadius: "12px",
                  px: 4,
                  py: 2,
                  boxShadow: `0 0 30px rgba(74, 222, 128, 0.3)`,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    color: colors.green400,
                    fontWeight: 700,
                    animation: "tutorial-celebration-glow 2s ease-in-out infinite",
                    mb: 0.5,
                  }}
                >
                  {t("taskComplete")}
                </Typography>
                <Typography variant="body1" sx={{ color: colors.slate100 }}>
                  {stepName}
                </Typography>
              </Box>
            )}
          </Box>
        </Zoom>
      </Box>
    </>
  );
}
