"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Paper, Popper, Typography } from "@mui/material";
import { colors } from "@/muiStyles";
import { useTutorial } from "./TutorialProvider";
import { matchRoute } from "@/tutorialConfig";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const GLOW_STYLE = `
@keyframes tutorial-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.3), 0 0 20px 8px rgba(74, 222, 128, 0.15); }
  50% { box-shadow: 0 0 0 8px rgba(74, 222, 128, 0.5), 0 0 40px 16px rgba(74, 222, 128, 0.25); }
}
.tutorial-spotlight-target {
  position: relative;
  z-index: 10;
  border-radius: 4px;
  animation: tutorial-pulse 2s ease-in-out infinite;
}
`;

export default function TutorialSpotlight() {
  const t = useTranslations("tutorial");
  const { isActive, currentStep, completedSteps } = useTutorial();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const previousTargetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  const isOnStepRoute = currentStep && matchRoute(currentStep.route, pathname);

  useEffect(() => {
    if (!isActive || !currentStep || !isOnStepRoute) {
      if (previousTargetRef.current) {
        previousTargetRef.current.classList.remove("tutorial-spotlight-target");
        previousTargetRef.current = null;
      }
      setAnchorEl(null);
      return;
    }

    const findTarget = () => {
      const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;

      if (previousTargetRef.current && previousTargetRef.current !== el) {
        previousTargetRef.current.classList.remove("tutorial-spotlight-target");
      }

      if (el) {
        el.classList.add("tutorial-spotlight-target");
        previousTargetRef.current = el;
        setAnchorEl(el);
      } else {
        setAnchorEl(null);
      }
    };

    findTarget();

    observerRef.current = new MutationObserver(() => {
      findTarget();
    });
    observerRef.current.observe(document.body, { childList: true, subtree: true });

    return () => {
      observerRef.current?.disconnect();
      if (previousTargetRef.current) {
        previousTargetRef.current.classList.remove("tutorial-spotlight-target");
        previousTargetRef.current = null;
      }
    };
  }, [isActive, currentStep, isOnStepRoute, completedSteps]);

  if (!isActive || !currentStep || !isOnStepRoute || !anchorEl) return null;

  const stepIndex = completedSteps.size + 1;
  const hintKey = `hint_${currentStep.id}` as Parameters<typeof t>[0];

  return (
    <>
      <style>{GLOW_STYLE}</style>
      <Popper
        open
        anchorEl={anchorEl}
        placement="top"
        modifiers={[
          { name: "offset", options: { offset: [0, 12] } },
          { name: "preventOverflow", options: { padding: 8 } },
        ]}
        sx={{ zIndex: 1200 }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 2,
            maxWidth: 320,
            backgroundColor: colors.slate700,
            border: `2px solid ${colors.green400}`,
            borderRadius: "8px",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                backgroundColor: colors.green400,
                color: colors.slate700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {stepIndex}
            </Box>
            <Typography variant="subtitle2" sx={{ color: colors.green400, fontWeight: 600 }}>
              {t(`step_${currentStep.id}` as Parameters<typeof t>[0])}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: colors.slate100, lineHeight: 1.4 }}>
            {t(hintKey)}
          </Typography>
        </Paper>
      </Popper>
    </>
  );
}
