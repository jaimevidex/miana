// Duration and suggested schedules for bridal/beauty.
// Bridal: separate Makeup Artist vs Hair Stylist tracks.
// Same person never gets MUA + hair at the same time (pack = hair then makeup).

import type { Timing } from './pricing';
import { TIMING_FALLBACKS } from './pricing';
import { normalizeBrideService, parseGuestCounts } from './bridal-pricing';

export function calculateDuration(
  type: string,
  guestCount: number,
  timing: Timing = TIMING_FALLBACKS
): number {
  const guests = Math.max(0, guestCount) * timing.guest;
  if (type === 'bridal') return timing.setup + timing.bridal + guests;
  if (type === 'beauty') return timing.setup + guests;
  return 0;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

function padTime(totalMinutes: number): string {
  const day = 24 * 60;
  const m = ((totalMinutes % day) + day) % day;
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function parseReady(readyTime: string): number | null {
  if (!readyTime) return null;
  const [h, m] = readyTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function suggestTimeRange(readyTime: string, durationMinutes: number): string {
  if (!readyTime || durationMinutes <= 0) return '';
  const end = parseReady(readyTime);
  if (end == null) return '';
  return `${padTime(end - durationMinutes)} - ${padTime(end)}`;
}

export type ScheduleBlock = {
  label: string;
  start: string;
  end: string;
  minutes: number;
};

export type RoleSchedule = {
  role: 'makeup' | 'hair';
  title: string;
  duration: number;
  range: string;
  blocks: ScheduleBlock[];
};

export type BridalSchedule = {
  makeup: RoleSchedule;
  hair: RoleSchedule;
  setupMinutes: number;
};

function pushSetup(blocks: ScheduleBlock[], setup: number): void {
  if (blocks.length === 0 || setup <= 0) return;
  const firstStart = parseReady(blocks[0].start)!;
  blocks.unshift({
    label: 'Chegada / setup',
    start: padTime(firstStart - setup),
    end: padTime(firstStart),
    minutes: setup,
  });
}

function finalize(role: 'makeup' | 'hair', title: string, blocks: ScheduleBlock[]): RoleSchedule {
  const duration = blocks.reduce((s, b) => s + b.minutes, 0);
  const range =
    blocks.length > 0 ? `${blocks[0].start} - ${blocks[blocks.length - 1].end}` : '';
  return { role, title, duration, range, blocks };
}

/**
 * Two calendars ending at hora_pronta.
 * Pack = hair first, then makeup (never parallel on the same person).
 * Different people can be in parallel across MUA / hairstylist.
 */
export function suggestBridalDualSchedule(
  formData: Record<string, string>,
  timing: Timing = TIMING_FALLBACKS
): BridalSchedule | null {
  const ready = parseReady(formData.hora_pronta || '');
  if (ready == null) return null;

  const brideSvc = normalizeBrideService(formData.servicos_procurados || '');
  const guests = parseGuestCounts(formData);
  const brideMin = timing.bridal;
  const guestMin = timing.guest;
  const setup = timing.setup;

  const makeupBlocks: ScheduleBlock[] = [];
  const hairBlocks: ScheduleBlock[] = [];

  // Cursors = "next free end" working backwards (time when role becomes free going earlier)
  let makeupCursor = ready;
  let hairCursor = ready;

  const place = (
    list: ScheduleBlock[],
    end: number,
    minutes: number,
    label: string
  ): { start: number; end: number } => {
    const start = end - minutes;
    list.unshift({ label, start: padTime(start), end: padTime(end), minutes });
    return { start, end };
  };

  // ── 1. Bride closest to ready time ──────────────────────────────────────
  if (brideSvc === 'Pack') {
    // Makeup finishes at ready; hair finishes when makeup starts
    const mua = place(makeupBlocks, ready, brideMin, 'Noiva - makeup');
    makeupCursor = mua.start;
    const hair = place(hairBlocks, mua.start, brideMin, 'Noiva - hair');
    hairCursor = hair.start;
  } else if (brideSvc === 'Makeup') {
    const mua = place(makeupBlocks, ready, brideMin, 'Noiva - makeup');
    makeupCursor = mua.start;
  } else if (brideSvc === 'Hair') {
    const hair = place(hairBlocks, ready, brideMin, 'Noiva - hair');
    hairCursor = hair.start;
  }

  // ── 2. Guest packs (hair → makeup, same person) ─────────────────────────
  for (let i = guests.pack; i >= 1; i--) {
    // Makeup uses makeupCursor; hair must end at or before makeup start
    const muaEnd = makeupCursor;
    const mua = place(makeupBlocks, muaEnd, guestMin, `Guest pack #${i} - makeup`);
    makeupCursor = mua.start;

    const hairEnd = Math.min(hairCursor, mua.start);
    const hair = place(hairBlocks, hairEnd, guestMin, `Guest pack #${i} - hair`);
    hairCursor = hair.start;
  }

  // ── 3. Guest single-service (can run in parallel across roles) ───────────
  for (let i = guests.makeup; i >= 1; i--) {
    const mua = place(makeupBlocks, makeupCursor, guestMin, `Guest makeup #${i}`);
    makeupCursor = mua.start;
  }
  for (let i = guests.hair; i >= 1; i--) {
    const hair = place(hairBlocks, hairCursor, guestMin, `Guest hair #${i}`);
    hairCursor = hair.start;
  }

  pushSetup(makeupBlocks, setup);
  pushSetup(hairBlocks, setup);

  return {
    makeup: finalize('makeup', 'Makeup artist', makeupBlocks),
    hair: finalize('hair', 'Hair stylist', hairBlocks),
    setupMinutes: setup,
  };
}
