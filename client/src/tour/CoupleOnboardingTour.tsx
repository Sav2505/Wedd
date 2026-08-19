import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, LinearProgress, Paper, Typography } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import { COUPLE_TOUR_STEPS } from './coupleTourScript';

const MAX_ANCHOR_RETRIES = 18;
const ANCHOR_RETRY_MS = 160;
const TOUR_MODAL_ESTIMATED_HEIGHT = 220;
const TOUR_MODAL_GAP = 14;
const VIEWPORT_SAFE_MARGIN = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getProgressKey(guestId: string, weddingId: number): string {
  return `wedding.coupleTour.step.${weddingId}.${guestId}`;
}

type OverlayPosition = {
  top: number;
  left: number;
  width: number;
  height: number;
  arrowSide: 'top' | 'bottom';
};

function computeOverlayPosition(targetRect: DOMRect | null): OverlayPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(390, vw - 24);
  const height = TOUR_MODAL_ESTIMATED_HEIGHT;

  if (!targetRect) {
    return {
      top: Math.round((vh - height) / 2),
      left: Math.round((vw - width) / 2),
      width,
      height,
      arrowSide: 'top',
    };
  }

  const shouldShowAbove = targetRect.bottom + height + 34 > vh && targetRect.top > height + 34;
  const top = shouldShowAbove
    ? targetRect.top - height - 14
    : targetRect.bottom + 14;

  const left = clamp(
    targetRect.left + targetRect.width / 2 - width / 2,
    12,
    vw - width - 12,
  );

  return {
    top: Math.round(clamp(top, 12, vh - height - 12)),
    left: Math.round(left),
    width,
    height,
    arrowSide: shouldShowAbove ? 'bottom' : 'top',
  };
}

function getViewportAdjustmentDelta(rect: DOMRect): number {
  const vh = window.innerHeight;
  const requiredSpace = TOUR_MODAL_ESTIMATED_HEIGHT + TOUR_MODAL_GAP + VIEWPORT_SAFE_MARGIN;
  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;

  // First, ensure the target itself is not clipped by viewport edges.
  if (rect.top < VIEWPORT_SAFE_MARGIN) {
    return rect.top - VIEWPORT_SAFE_MARGIN;
  }
  if (rect.bottom > vh - VIEWPORT_SAFE_MARGIN) {
    return rect.bottom - (vh - VIEWPORT_SAFE_MARGIN);
  }

  // Then, ensure enough vertical room for the tour modal so it won't cover the target.
  if (spaceAbove >= requiredSpace || spaceBelow >= requiredSpace) {
    return 0;
  }

  // Prefer the side with more free room.
  if (spaceBelow >= spaceAbove) {
    // Move target up to create more room below.
    return -(requiredSpace - spaceBelow);
  }

  // Move target down to create more room above.
  return requiredSpace - spaceAbove;
}

function getAnchorPlacementDelta(rect: DOMRect): number {
  const vh = window.innerHeight;
  const desiredTop = Math.round(vh * 0.28);
  return rect.top - desiredTop;
}

type CoupleOnboardingTourProps = {
  open: boolean;
  guestId: string;
  weddingId: number;
  activeTab: number;
  onTabChange: (nextTab: number) => void;
  onComplete: () => Promise<void> | void;
  onSkip: () => void;
};

export default function CoupleOnboardingTour({
  open,
  guestId,
  weddingId,
  activeTab,
  onTabChange,
  onComplete,
  onSkip,
}: CoupleOnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [anchorFound, setAnchorFound] = useState(false);
  const stepScrollAdjustmentsRef = useRef(0);

  const progressKey = useMemo(() => getProgressKey(guestId, weddingId), [guestId, weddingId]);
  const step = COUPLE_TOUR_STEPS[stepIndex];
  const progressPct = ((stepIndex + 1) / COUPLE_TOUR_STEPS.length) * 100;

  useEffect(() => {
    if (!open) return;

    const rawSaved = localStorage.getItem(progressKey);
    const parsed = rawSaved == null ? 0 : Number(rawSaved);
    const safeStep = Number.isFinite(parsed)
      ? clamp(Math.floor(parsed), 0, COUPLE_TOUR_STEPS.length - 1)
      : 0;

    setStepIndex(safeStep);
  }, [open, progressKey]);

  useEffect(() => {
    if (!open) return;
    localStorage.setItem(progressKey, String(stepIndex));
  }, [open, progressKey, stepIndex]);

  useEffect(() => {
    if (!open || !step) return;
    if (activeTab !== step.tabIndex) {
      onTabChange(step.tabIndex);
    }
  }, [open, step, activeTab, onTabChange]);

  useEffect(() => {
    if (!open || !step) return;

    let retries = 0;
    let cancelled = false;
    stepScrollAdjustmentsRef.current = 0;

    const refreshTarget = () => {
      const el = document.querySelector(`[data-tour-anchor="${step.anchorId}"]`) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();

        const placementDelta = getAnchorPlacementDelta(rect);
        const viewportDelta = getViewportAdjustmentDelta(rect);
        const delta = Math.abs(viewportDelta) > Math.abs(placementDelta)
          ? viewportDelta
          : placementDelta;

        if (Math.abs(delta) > 2 && stepScrollAdjustmentsRef.current < 3) {
          stepScrollAdjustmentsRef.current += 1;
          window.scrollBy({ top: delta, behavior: 'auto' });
          return false;
        }

        setTargetRect(rect);
        setAnchorFound(true);
        return true;
      }
      return false;
    };

    const timer = window.setInterval(() => {
      if (cancelled) return;
      const found = refreshTarget();
      retries += 1;
      if (found || retries >= MAX_ANCHOR_RETRIES) {
        if (!found) {
          setAnchorFound(false);
          setTargetRect(null);
        }
        window.clearInterval(timer);
      }
    }, ANCHOR_RETRY_MS);

    const onViewportChange = () => {
      if (!open) return;
      refreshTarget();
    };

    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, step]);

  if (!open || !step) return null;

  const isLastStep = stepIndex === COUPLE_TOUR_STEPS.length - 1;
  const position = computeOverlayPosition(targetRect);
  const spotlight = targetRect
    ? {
        top: Math.max(0, targetRect.top - 6),
        left: Math.max(0, targetRect.left - 6),
        right: Math.min(window.innerWidth, targetRect.right + 6),
        bottom: Math.min(window.innerHeight, targetRect.bottom + 6),
      }
    : null;

  const handleBack = () => {
    setStepIndex((prev) => clamp(prev - 1, 0, COUPLE_TOUR_STEPS.length - 1));
  };

  const handleNext = async () => {
    if (!isLastStep) {
      setStepIndex((prev) => clamp(prev + 1, 0, COUPLE_TOUR_STEPS.length - 1));
      return;
    }

    localStorage.removeItem(progressKey);
    await onComplete();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 2200,
        direction: 'ltr',
      }}
    >
      {spotlight ? (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: spotlight.top,
              background: 'rgba(23, 16, 12, 0.66)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: spotlight.bottom,
              left: 0,
              width: '100%',
              height: Math.max(0, window.innerHeight - spotlight.bottom),
              background: 'rgba(23, 16, 12, 0.66)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: spotlight.top,
              left: 0,
              width: spotlight.left,
              height: Math.max(0, spotlight.bottom - spotlight.top),
              background: 'rgba(23, 16, 12, 0.66)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: spotlight.top,
              left: spotlight.right,
              width: Math.max(0, window.innerWidth - spotlight.right),
              height: Math.max(0, spotlight.bottom - spotlight.top),
              background: 'rgba(23, 16, 12, 0.66)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />
        </>
      ) : (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(23, 16, 12, 0.66)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      )}

      {targetRect && (
        <Box
          sx={{
            position: 'absolute',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: 2,
            border: '2px solid #E0C97A',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.2), 0 0 20px rgba(224,201,122,0.65)',
            pointerEvents: 'none',
            transition: 'all 180ms ease',
          }}
        />
      )}

      <Paper
        elevation={8}
        sx={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          width: position.width,
          minHeight: position.height,
          maxHeight: 'calc(100vh - 24px)',
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid rgba(201,168,76,0.45)',
          background: 'linear-gradient(165deg, #FFFEFA 0%, #F8F0DF 100%)',
        }}
      >
        <Box sx={{ height: 4, background: 'linear-gradient(90deg, #C9A84C, #E0C97A, #9A7833)' }} />

        <Box sx={{ p: 1.8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
            <TipsAndUpdatesOutlinedIcon sx={{ color: '#9A7833', fontSize: 20 }} />
            <Typography sx={{ color: '#8A6A2B', fontWeight: 700, fontSize: '0.78rem' }}>
              סיור מודרך
            </Typography>
          </Box>

          <Typography
            sx={{
              fontFamily: "'Frank Ruhl Libre', serif",
              color: '#2C1810',
              fontSize: '1.06rem',
              fontWeight: 700,
              mb: 0.8,
              lineHeight: 1.3,
            }}
          >
            {step.title}
          </Typography>

          <Typography sx={{ color: '#6A4E3B', lineHeight: 1.65, fontSize: '0.88rem', mb: 1.5 }}>
            {step.body}
          </Typography>

          {!anchorFound && (
            <Typography sx={{ color: '#9A7833', fontSize: '0.76rem', mb: 1.2 }}>
              האלמנט עבור שלב זה נטען כעת. אפשר להמשיך לשלב הבא בכל רגע.
            </Typography>
          )}

          <Typography sx={{ color: '#A08070', fontSize: '0.74rem', mb: 0.85 }}>
            שלב {stepIndex + 1} מתוך {COUPLE_TOUR_STEPS.length}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            sx={{
              height: 7,
              borderRadius: 10,
              mb: 1.35,
              backgroundColor: 'rgba(201,168,76,0.2)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 10,
                background: 'linear-gradient(90deg, #C9A84C, #E0C97A)',
              },
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.8 }}>
            <Button
              onClick={onSkip}
              sx={{ color: '#A08070', textTransform: 'none', fontWeight: 600, fontSize: '0.82rem' }}
            >
              דלג כרגע
            </Button>

            <Box sx={{ display: 'flex', gap: 0.8 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={stepIndex === 0}
                startIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  borderColor: 'rgba(201,168,76,0.45)',
                  color: '#9A7833',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  minWidth: 74,
                }}
              >
                חזור
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowBackRoundedIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #C9A84C, #9A7833)',
                  color: '#FAF7F2',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  minWidth: 84,
                  '&:hover': { background: 'linear-gradient(135deg, #E0C97A, #C9A84C)' },
                }}
              >
                {step.actionLabel ?? (isLastStep ? 'סיום' : 'הבא')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {targetRect && (
        <Box
          sx={{
            position: 'absolute',
            left: clamp(targetRect.left + targetRect.width / 2 - 14, 8, window.innerWidth - 36),
            top: position.arrowSide === 'top' ? position.top - 14 : position.top + position.height - 2,
            width: 24,
            height: 24,
            transform: position.arrowSide === 'top' ? 'rotate(45deg)' : 'rotate(225deg)',
            background: '#F9F2E1',
            borderLeft: '1px solid rgba(201,168,76,0.45)',
            borderTop: '1px solid rgba(201,168,76,0.45)',
            zIndex: 1,
          }}
        />
      )}
    </Box>
  );
}
