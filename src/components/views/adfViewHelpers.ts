import { AdfBoundingBox, AdfColorCandidate, AdfImageSnapshot, NormalizedTrackRecord } from '../../types/adf';

export type ColorScope = 'object' | 'upper' | 'lower';

export interface TrackColorEntry {
  name: string;
  score: number;
  scope: ColorScope;
  hex: string;
}

const COLOR_HEX_MAP: Record<string, string> = {
  gray: '#94a3b8',
  grey: '#94a3b8',
  silver: '#cbd5e1',
  blue: '#3b82f6',
  navy: '#1e3a8a',
  black: '#1e293b',
  white: '#f8fafc',
  red: '#ef4444',
  maroon: '#991b1b',
  yellow: '#facc15',
  gold: '#eab308',
  orange: '#f97316',
  green: '#22c55e',
  purple: '#a855f7',
  pink: '#ec4899',
  brown: '#92400e',
  beige: '#d6d3d1',
  tan: '#d4a373',
  cyan: '#06b6d4',
};

export function getColorHex(colorName: string): string {
  const key = colorName.trim().toLowerCase();
  return COLOR_HEX_MAP[key] || '#64748b';
}

export function getClassStrokeColor(cls: string): string {
  const c = cls.toLowerCase();
  if (c.includes('human') || c.includes('person') || c.includes('pedestrian')) return '#38bdf8';
  if (c.includes('truck') || c.includes('bus') || c.includes('van')) return '#f97316';
  if (c.includes('bike') || c.includes('bicycle') || c.includes('motorcycle')) return '#22c55e';
  if (c.includes('car') || c.includes('vehicle') || c.includes('suv')) return '#FFCC00';
  return '#a855f7';
}

export function getSnapshotSrc(snap?: AdfImageSnapshot): string | null {
  if (!snap?.data) return null;
  if (snap.data.startsWith('data:image/')) return snap.data;
  return `data:${snap.mime_type || 'image/jpeg'};base64,${snap.data}`;
}

/**
 * Extracts deduplicated color candidates across `colors`, `upper_clothing_colors`, and
 * `lower_clothing_colors` from a track's primary class candidate (falling back to secondary
 * candidates only if the primary candidate has no colors).
 */
export function extractTrackColorEntries(track: NormalizedTrackRecord): TrackColorEntry[] {
  const classes = track.raw.classes;
  if (!Array.isArray(classes) || classes.length === 0) return [];

  const sorted = [...classes].sort(
    (a, b) => (b.score ?? b.probability ?? 0) - (a.score ?? a.probability ?? 0)
  );

  const deduped = new Map<string, TrackColorEntry>();
  const addList = (list: AdfColorCandidate[] | undefined, scope: ColorScope) => {
    if (!Array.isArray(list)) return;
    list.forEach((c) => {
      if (!c || typeof c.name !== 'string') return;
      const name = c.name.trim().toLowerCase();
      if (!name) return;
      const score = typeof c.score === 'number' ? c.score : 0;
      const key = `${scope}:${name}`;
      const existing = deduped.get(key);
      if (!existing || score > existing.score) {
        deduped.set(key, {
          name,
          score,
          scope,
          hex: getColorHex(name),
        });
      }
    });
  };

  for (const candidate of sorted) {
    addList(candidate.colors, 'object');
    addList(candidate.upper_clothing_colors, 'upper');
    addList(candidate.lower_clothing_colors, 'lower');
    if (deduped.size > 0) break;
  }

  return Array.from(deduped.values()).sort((a, b) => b.score - a.score);
}

export function headingToCompassLabel(deg: number): string {
  const dirs = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const norm = ((deg % 360) + 360) % 360;
  return dirs[Math.round(norm / 45) % 8];
}

export type TimelineAlignMode = 'relative' | 't0' | 'wall';

export interface PlacedTrackSpan {
  track: NormalizedTrackRecord;
  startOffsetSec: number;
  endOffsetSec: number;
  snapshotOffsetSec: number | null;
}

export function interpolateBoxAtProgress(
  track: NormalizedTrackRecord,
  progress: number
): AdfBoundingBox | null {
  const obs = track.observations;
  if (obs.length === 0) return null;
  if (obs.length === 1) return obs[0].bounding_box;

  const clamped = Math.max(0, Math.min(1, progress));
  const exactIdx = clamped * (obs.length - 1);
  const i0 = Math.floor(exactIdx);
  const i1 = Math.min(obs.length - 1, i0 + 1);
  const f = exactIdx - i0;
  const b0 = obs[i0].bounding_box;
  const b1 = obs[i1].bounding_box;

  return {
    left: b0.left + (b1.left - b0.left) * f,
    top: b0.top + (b1.top - b0.top) * f,
    right: b0.right + (b1.right - b0.right) * f,
    bottom: b0.bottom + (b1.bottom - b0.bottom) * f,
  };
}

export function computeTimelineSpans(
  tracks: NormalizedTrackRecord[],
  alignMode: TimelineAlignMode
): { spans: PlacedTrackSpan[]; totalWindowSec: number } {
  if (tracks.length === 0) {
    return { spans: [], totalWindowSec: 10 };
  }

  const withMs = tracks.map((t, idx) => {
    const sMs = Date.parse(t.startTime);
    const eMs = Date.parse(t.endTime);
    const dur = Math.max(
      0.4,
      t.durationSec || (!Number.isNaN(sMs) && !Number.isNaN(eMs) ? (eMs - sMs) / 1000 : 1)
    );
    const snapMs = t.snapshot?.timestamp ? Date.parse(t.snapshot.timestamp) : NaN;
    return {
      track: t,
      idx,
      startMs: Number.isNaN(sMs) ? idx * 2000 : sMs,
      dur,
      snapRelFrac:
        !Number.isNaN(snapMs) && !Number.isNaN(sMs) && dur > 0
          ? Math.max(0, Math.min(1, (snapMs - sMs) / 1000 / dur))
          : null,
    };
  });

  const sorted = [...withMs].sort((a, b) => a.startMs - b.startMs);
  const minWallMs = sorted[0].startMs;
  const spans: PlacedTrackSpan[] = [];

  sorted.forEach((item, i) => {
    let startOffsetSec = 0;
    if (alignMode === 't0') {
      startOffsetSec = 0;
    } else if (alignMode === 'wall') {
      startOffsetSec = (item.startMs - minWallMs) / 1000;
    } else if (i > 0) {
      const prev = sorted[i - 1];
      const prevSpan = spans[i - 1];
      const rawGap = (item.startMs - prev.startMs) / 1000;
      if (rawGap >= 0 && rawGap <= 20) {
        startOffsetSec = prevSpan.startOffsetSec + rawGap;
      } else {
        startOffsetSec = prevSpan.startOffsetSec + Math.min(4, Math.max(1.5, prev.dur * 0.45));
      }
    }

    const endOffsetSec = startOffsetSec + item.dur;
    spans.push({
      track: item.track,
      startOffsetSec,
      endOffsetSec,
      snapshotOffsetSec:
        item.snapRelFrac !== null ? startOffsetSec + item.snapRelFrac * item.dur : null,
    });
  });

  return {
    spans,
    totalWindowSec: Math.max(1, ...spans.map((s) => s.endOffsetSec)),
  };
}
