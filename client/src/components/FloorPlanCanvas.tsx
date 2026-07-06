import React, { useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { WeddingTableWithGuests } from '../types/domain';
import { getEffectivePartySize } from '../utils/effectiveAttendance';

// ─── Types ───────────────────────────────────────────────────

const TABLE_MIN_WIDTH = 35;
const TABLE_RECT_MIN_WIDTH = 78;
const TABLE_RECT_MIN_HEIGHT = 30;

export interface FloorPlanCanvasProps {
  tables: WeddingTableWithGuests[];
  /** Table number of the logged-in guest (null = editor / no highlight) */
  ownTableNumber?: number | null;
  /** Label shown at the top stage area (default: חופה) */
  stageLabel?: string;
  /** Entrance marker location on the hall frame */
  entrancePosition?: 'right' | 'bottom' | 'left';
  /** Currently selected table id in editor mode */
  selectedId?: string | null;
  /** Whether tables are draggable (couple editor) */
  editable?: boolean;
  onSelectTable?: (id: string) => void;
  /** Fired once when drag ends with final percentage position */
  onDragEnd?: (id: string, posX: number, posY: number) => void;
  /** Table ids containing at least one guest who declined (couple editor only) */
  warningTableIds?: Set<string>;
}

// ─── Helpers ─────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Component ───────────────────────────────────────────────

export default function FloorPlanCanvas({
  tables,
  ownTableNumber = null,
  stageLabel = 'חופה',
  entrancePosition = 'bottom',
  selectedId = null,
  editable = false,
  onSelectTable,
  onDragEnd,
  warningTableIds,
}: FloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Set to true during a drag so onClick doesn't also fire onSelectTable
  const didDragRef = useRef(false);

  // ── Drag: all pointer tracking uses native window listeners.
  //    React synthetic onPointerMove/Up on individual elements are unreliable
  //    when pointer capture is active in some Chromium builds. ──────────────

  function handlePointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    table: WeddingTableWithGuests,
  ) {
    if (!editable) return;
    e.preventDefault();

    const el = e.currentTarget as HTMLDivElement;
    const startCx = e.clientX;
    const startCy = e.clientY;
    const startPosX = Number.isFinite(Number(table.pos_x)) ? Number(table.pos_x) : 50;
    const startPosY = Number.isFinite(Number(table.pos_y)) ? Number(table.pos_y) : 50;
    let latestX = startPosX;
    let latestY = startPosY;
    let hasMoved = false;
    didDragRef.current = false;

    // Capture so browser won't fire scroll/pan on touch
    el.setPointerCapture(e.pointerId);

    const onMove = (me: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((me.clientX - startCx) / rect.width) * 100;
      const dy = ((me.clientY - startCy) / rect.height) * 100;
      const deltaStartX = table.shape === 'rect' ? table.orientation === 'v' ? -1.5 : 5.5 : -0.5;
      const deltaEndX = table.shape === 'rect' ? table.orientation === 'v' ? 2 : -18.5 : 0;
      latestX = clamp(startPosX + dx, -4 - deltaStartX, 85 + deltaEndX);
      latestY = clamp(startPosY + dy, 14, 87);

      if (Math.abs(dx) > 0.8 || Math.abs(dy) > 0.8) {
        hasMoved = true;
        didDragRef.current = true;
      }

      el.style.left = `${latestX}%`;
      el.style.top = `${latestY}%`;
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };

    const onUp = () => {
      cleanup();

      if (hasMoved && Number.isFinite(latestX) && Number.isFinite(latestY)) {
        onDragEnd?.(table.id, latestX, latestY);
      }
    };

    const onCancel = () => {
      cleanup();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }

  // ── Render ───────────────────────────────────────────────────

  const topLabel = stageLabel.trim() || 'חופה';
  const entranceLabel =
    entrancePosition === 'right'
      ? 'כניסה ←'
      : entrancePosition === 'left'
        ? 'כניסה →'
        : 'כניסה ↓';

  const entranceContainerSx =
    entrancePosition === 'right'
      ? { right: 6, top: '50%', transform: 'translateY(-50%)' }
      : entrancePosition === 'left'
        ? { left: 6, top: '50%', transform: 'translateY(-50%)' }
        : { bottom: 5, left: '50%', transform: 'translateX(-50%)' };

  const entranceLineSx =
    entrancePosition === 'bottom'
      ? {
        width: 36,
        height: '1.5px',
        background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)',
      }
      : {
        width: '1.5px',
        height: 30,
        background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.5), transparent)',
      };

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        aspectRatio: '8/7',
        borderRadius: 1.5,
        overflow: 'hidden',
        background: 'linear-gradient(145deg, #FDFAF3 0%, #F9EDD8 55%, #F3E4C6 100%)',
        border: '2px solid rgba(201,168,76,0.35)',
        boxShadow: 'inset 0 0 60px rgba(201,168,76,0.07), 0 4px 24px rgba(0,0,0,0.08)',
        userSelect: 'none',
        direction: 'ltr',
      }}
    >
      {/* Subtle geometric floor tile */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
        backgroundImage: [
          'repeating-linear-gradient(45deg, #C9A84C 0, #C9A84C 1px, transparent 0, transparent 50%)',
          'repeating-linear-gradient(-45deg, #C9A84C 0, #C9A84C 1px, transparent 0, transparent 50%)',
        ].join(', '),
        backgroundSize: '24px 24px',
      }} />

      {/* ── Stage / חופה ── */}
      <Box sx={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '26%', py: 0.8,
        background: 'linear-gradient(160deg, rgba(201,168,76,0.22), rgba(224,201,122,0.10))',
        border: '1.5px solid rgba(201,168,76,0.45)', borderTop: 'none',
        borderRadius: '0 0 12px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <Typography sx={{
          fontSize: 'clamp(0.52rem, 1.5vw, 0.68rem)',
          color: '#9A7833', fontWeight: 700, letterSpacing: 1,
        }}>
          {topLabel}
        </Typography>
      </Box>

      {/* ── Entrance / כניסה ── */}
      <Box sx={{
        position: 'absolute',
        ...entranceContainerSx,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3,
        pointerEvents: 'none',
      }}>
        <Box sx={entranceLineSx} />
        <Typography sx={{
          fontSize: 'clamp(0.48rem, 1.3vw, 0.6rem)',
          color: 'rgba(154,120,51,0.55)', fontWeight: 700, letterSpacing: 1.5,
        }}>
          {entranceLabel}
        </Typography>
      </Box>

      {/* Ambient vertical dividers */}
      {[22, 78].map(x => (
        <Box key={x} sx={{
          position: 'absolute', top: 0, bottom: 0, left: `${x}%`, width: '1px',
          background: 'linear-gradient(to bottom, transparent 5%, rgba(201,168,76,0.08) 30%, rgba(201,168,76,0.08) 70%, transparent 95%)',
          pointerEvents: 'none',
        }} />
      ))}

      {/* ── Tables ── */}
      {tables.map(table => {
        const isOwn = table.table_number === ownTableNumber;
        const isSelected = table.id === selectedId;
        const isWarning = warningTableIds?.has(table.id) ?? false;
        const safeLeft = Number.isFinite(Number(table.pos_x)) ? Number(table.pos_x) : 50;
        const safeTop = Number.isFinite(Number(table.pos_y)) ? Number(table.pos_y) : 50;
        const isRect = table.shape === 'rect';
        const isPortrait = isRect && table.orientation === 'v';

        return (
          <Box
            key={table.id}
            onPointerDown={(e) => handlePointerDown(e, table)}
            onClick={() => { if (!didDragRef.current) onSelectTable?.(table.id); }}
            style={{ left: `${safeLeft}%`, top: `${safeTop}%` }}
            sx={{
              position: 'absolute',
              transform: 'translate(-50%, -50%)',
              width: isRect ? (isPortrait ? `min(${TABLE_RECT_MIN_HEIGHT}px, 10%)` : `min(${TABLE_RECT_MIN_WIDTH}px, 20%)`) : `min(${TABLE_MIN_WIDTH}px, 10%)`,
              height: isRect ? (isPortrait ? `min(${TABLE_RECT_MIN_WIDTH}px, 20%)` : `min(${TABLE_RECT_MIN_HEIGHT}px, 10%)`) : undefined,
              minWidth: isRect ? (isPortrait ? 22 : `max(${TABLE_RECT_MIN_WIDTH}px, 20%)`) : TABLE_MIN_WIDTH,
              aspectRatio: isRect ? 'unset' : '1 / 1',
              borderRadius: isRect ? '7px' : table.shape === 'square' ? '16%' : '50%',
              background: isOwn
                ? 'linear-gradient(135deg, #E0C97A 0%, #C9A84C 100%)'
                : isWarning
                  ? 'linear-gradient(145deg, rgba(255,255,253,0.94), rgba(211,80,70,0.08))'
                  : 'rgba(255,255,253,0.93)',
              border: isSelected
                ? '2.5px solid #4F86F7'
                : isOwn
                  ? '2px solid #9A7833'
                  : isWarning
                    ? '1.5px solid rgba(196,60,50,0.6)'
                    : '1.5px solid rgba(201,168,76,0.55)',
              boxShadow: isOwn
                ? '0 0 0 5px rgba(201,168,76,0.18), 0 4px 14px rgba(201,168,76,0.35)'
                : isSelected
                  ? '0 0 0 3px rgba(79,134,247,0.22)'
                  : isWarning
                    ? '0 0 0 3px rgba(196,60,50,0.16), 0 2px 8px rgba(196,60,50,0.18)'
                    : '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              cursor: editable ? 'grab' : 'pointer',
              zIndex: isOwn ? 4 : isSelected ? 3 : 2,
              touchAction: 'none',
              transition: editable ? 'box-shadow 0.15s' : 'transform 0.15s, box-shadow 0.15s',
              '&:hover': editable
                ? { boxShadow: isWarning ? '0 0 0 4px rgba(196,60,50,0.28)' : '0 0 0 4px rgba(201,168,76,0.3)', cursor: 'grab' }
                : { transform: 'translate(-50%, -50%) scale(1.1)', zIndex: 5 },
              '&:active': { cursor: editable ? 'grabbing' : 'pointer' },
            }}
          >
            {/* Small warning dot — declined guest seated here */}
            {isWarning && !isOwn && (
              <Box sx={{
                position: 'absolute',
                top: -4,
                insetInlineEnd: -4,
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#C43C32',
                border: '1.5px solid #FDFAF3',
                boxShadow: '0 1px 4px rgba(196,60,50,0.5)',
              }} />
            )}

            {/* Table number */}
            <Typography sx={{
              fontSize: 'clamp(0.64rem, 1.82vw, 0.85rem)',
              fontWeight: 800,
              color: isOwn ? '#FAF7F2' : isWarning ? '#a3392f' : '#2C1810',
              lineHeight: 1,
              fontFamily: "'Frank Ruhl Libre', serif",
            }}>
              {table.table_number}
            </Typography>

            {/* Seat fill ratio — shown on regular tables that have guests */}
            {!isOwn && table.capacity > 0 && (
              <Typography sx={{
                fontSize: 'clamp(0.425rem, 1vw, 0.46rem)',
                color: isWarning ? 'rgba(163,57,47,0.75)' : 'rgba(154,120,51,0.65)',
                lineHeight: 1,
              }}>
                {table.guests.reduce((s, g) => s + getEffectivePartySize(g), 0)}/{table.capacity}
              </Typography>
            )}

            {/* Star for own table */}
            {isOwn && (
              <Typography sx={{
                fontSize: 'clamp(0.44rem, 1.1vw, 0.52rem)',
                color: '#FAF7F2',
                lineHeight: 1,
              }}>
                ★
              </Typography>
            )}
          </Box>
        );
      })}

      {/* ── Empty state ── */}
      {tables.length === 0 && (
        <Box sx={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 1,
        }}>
          <Typography sx={{ fontSize: '2.2rem', opacity: 0.28 }}>🪑</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(154,120,51,0.38)', fontWeight: 600 }}>
            אין שולחנות עדיין
          </Typography>
        </Box>
      )}
    </Box>
  );
}
