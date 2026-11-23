import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Switch,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  CameraOffRegular,
  CheckmarkRegular,
  CodeRegular,
  CopyRegular,
  DeleteRegular,
  ImageAddRegular,
  LocationRegular,
  OpenRegular,
  SelectObjectRegular,
  SquareRegular,
  LineRegular,
} from '@fluentui/react-icons';
import { useCustomScrollbars } from '@axiscommunications/fluent-styles';
import { NormalizedTrackRecord } from '../../types/adf';
import { getBoxCenter, getBoxFootPoint } from '../../utils/adfParser';
import { getClassBadgeColor, getClassIcon } from '../TrackTable';
import {
  getClassStrokeColor,
  getSnapshotSrc,
  headingToCompassLabel,
} from './adfViewHelpers';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  toolGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  divider: {
    width: '1px',
    height: '20px',
    backgroundColor: tokens.colorNeutralStroke2,
    margin: '0 4px',
  },
  workspace: {
    flex: 1,
    minHeight: 0,
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    overflow: 'hidden',
  },
  canvasStage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'auto',
    gap: tokens.spacingVerticalS,
  },
  canvasBox: {
    position: 'relative',
    width: '100%',
    maxWidth: '1040px',
    aspectRatio: '16 / 9',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: '#0c1219',
    overflow: 'hidden',
    boxShadow: tokens.shadow8,
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
    touchAction: 'none',
  },
  canvasFooterHint: {
    width: '100%',
    maxWidth: '1040px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    minHeight: 0,
    overflowY: 'auto',
  },
  sidebarSection: {
    padding: tokens.spacingHorizontalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: tokens.colorNeutralForeground3,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
  },
  kpiMiniCard: {
    padding: '8px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  trackListScroll: {
    flex: 1,
    minHeight: '150px',
    overflowY: 'auto',
    padding: tokens.spacingHorizontalS,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  trackRowCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  trackRowSelected: {
    border: '1.5px solid #FFCC00',
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  thumbBox: {
    width: '54px',
    height: '40px',
    borderRadius: '4px',
    backgroundColor: '#0d131a',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  mono: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
  },
});

type InteractionMode = 'inspect' | 'roi' | 'tripwire';

interface RoiBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface TripwireLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

type CrossingDir = 'A->B' | 'B->A';

function pointToSegmentDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(denom) < 1e-9) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function evaluateTripwireCrossings(
  pts: Array<{ x: number; y: number }>,
  line: TripwireLine
): CrossingDir | null {
  const crossSide = (px: number, py: number) =>
    (line.x2 - line.x1) * (py - line.y1) - (line.y2 - line.y1) * (px - line.x1);

  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    if (segmentsIntersect(p0.x, p0.y, p1.x, p1.y, line.x1, line.y1, line.x2, line.y2)) {
      const c0 = crossSide(p0.x, p0.y);
      const c1 = crossSide(p1.x, p1.y);
      return c0 <= 0 && c1 >= 0 ? 'A->B' : 'B->A';
    }
  }
  return null;
}

export interface SpatialAnalyticsViewProps {
  tracks: NormalizedTrackRecord[];
  selectedTrack: NormalizedTrackRecord | null;
  onSelectTrack: (uid: string) => void;
  onOpenInWorkbench: (uid: string) => void;
}

export const SpatialAnalyticsView: React.FC<SpatialAnalyticsViewProps> = ({
  tracks,
  selectedTrack,
  onSelectTrack,
  onOpenInWorkbench,
}) => {
  const styles = useStyles();
  const scrollStyles = useCustomScrollbars();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const thumbCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [mode, setMode] = useState<InteractionMode>('inspect');
  const [anchorMode, setAnchorMode] = useState<'foot' | 'center'>('foot');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showAllPaths, setShowAllPaths] = useState<boolean>(true);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [showSnapshots, setShowSnapshots] = useState<boolean>(true);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [thumbTick, setThumbTick] = useState<number>(0);

  const [roiBox, setRoiBox] = useState<RoiBox | null>(null);
  const [tripwire, setTripwire] = useState<TripwireLine | null>(null);
  const [hoveredUid, setHoveredUid] = useState<string | null>(null);
  const [cursorNorm, setCursorNorm] = useState<{ x: number; y: number } | null>(null);

  const [dragRoiStart, setDragRoiStart] = useState<{ x: number; y: number } | null>(null);
  const [dragLineStart, setDragLineStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [copiedMode, setCopiedMode] = useState<'json' | 'js' | null>(null);

  const getAnchor = (box: { top: number; right: number; bottom: number; left: number }) =>
    anchorMode === 'foot' ? getBoxFootPoint(box) : getBoxCenter(box);

  const round4 = (n: number) => Math.round(n * 10000) / 10000;

  const exportedGeometry = useMemo(() => {
    const activeRoi = roiBox
      ? {
          left: round4(roiBox.left),
          top: round4(roiBox.top),
          right: round4(roiBox.right),
          bottom: round4(roiBox.bottom),
        }
      : null;
    const activeTripwire = tripwire
      ? {
          x1: round4(tripwire.x1),
          y1: round4(tripwire.y1),
          x2: round4(tripwire.x2),
          y2: round4(tripwire.y2),
        }
      : null;
    return {
      anchor: anchorMode,
      ...(activeRoi
        ? { roi_box: activeRoi }
        : !activeTripwire
          ? { roi_box: { left: 0, top: 0, right: 1, bottom: 1 } }
          : {}),
      ...(activeTripwire ? { tripwire: activeTripwire } : {}),
    };
  }, [anchorMode, roiBox, tripwire]);

  const handleCopyZoneJson = () => {
    navigator.clipboard?.writeText(JSON.stringify(exportedGeometry, null, 2));
    setCopiedMode('json');
    window.setTimeout(() => setCopiedMode(null), 1800);
  };

  const handleCopyJsSnippet = () => {
    const ptExpr =
      anchorMode === 'foot'
        ? '{ x: (b.left + b.right) / 2, y: b.bottom }'
        : '{ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 }';
    const r = exportedGeometry.roi_box;
    const tw = exportedGeometry.tripwire;

    const lines: string[] = [
      '// Normalized [0..1] spatial filter for ADF object_track.v1 `path` observations',
      'export function matchesSpatialZone(track) {',
      '  const pts = (track.path || track.observations || []).map((obs) => {',
      '    const b = obs.bounding_box;',
      `    return ${ptExpr};`,
      '  });',
      '  if (pts.length === 0) return false;',
    ];

    if (r) {
      lines.push(
        `  const roi = { left: ${r.left}, top: ${r.top}, right: ${r.right}, bottom: ${r.bottom} };`,
        '  const inRoi = pts.some((p) => p.x >= roi.left && p.x <= roi.right && p.y >= roi.top && p.y <= roi.bottom);',
        '  if (!inRoi) return false;'
      );
    }

    if (tw) {
      lines.push(
        `  const wire = { x1: ${tw.x1}, y1: ${tw.y1}, x2: ${tw.x2}, y2: ${tw.y2} };`,
        '  const crosses = pts.some((p1, i) => {',
        '    if (i === 0) return false;',
        '    const p0 = pts[i - 1];',
        '    const denom = (p1.x - p0.x) * (wire.y2 - wire.y1) - (p1.y - p0.y) * (wire.x2 - wire.x1);',
        '    if (Math.abs(denom) < 1e-9) return false;',
        '    const t = ((wire.x1 - p0.x) * (wire.y2 - wire.y1) - (wire.y1 - p0.y) * (wire.x2 - wire.x1)) / denom;',
        '    const u = ((wire.x1 - p0.x) * (p1.y - p0.y) - (wire.y1 - p0.y) * (p1.x - p0.x)) / denom;',
        '    return t >= 0 && t <= 1 && u >= 0 && u <= 1;',
        '  });',
        '  if (!crosses) return false;'
      );
    }

    lines.push('  return true;', '}');
    navigator.clipboard?.writeText(lines.join('\n'));
    setCopiedMode('js');
    window.setTimeout(() => setCopiedMode(null), 1800);
  };

  // Preload thumbnail images for on-scene snapshot rendering
  useEffect(() => {
    tracks.forEach((trk) => {
      const src = getSnapshotSrc(trk.snapshot);
      if (!src || thumbCacheRef.current.has(trk.uid)) return;
      const img = new Image();
      img.onload = () => setThumbTick((n) => n + 1);
      img.src = src;
      thumbCacheRef.current.set(trk.uid, img);
    });
  }, [tracks]);

  // Compute spatial matches (ROI or Tripwire)
  const spatialEval = useMemo(() => {
    const crossingMap = new Map<string, CrossingDir>();
    let aToB = 0;
    let bToA = 0;

    const matching = tracks.filter((trk) => {
      const pts = trk.observations.map((o) => getAnchor(o.bounding_box));
      if (pts.length === 0) return false;

      if (roiBox) {
        const inside = pts.some(
          (p) =>
            p.x >= roiBox.left &&
            p.x <= roiBox.right &&
            p.y >= roiBox.top &&
            p.y <= roiBox.bottom
        );
        if (!inside) return false;
      }

      if (tripwire) {
        const dir = evaluateTripwireCrossings(pts, tripwire);
        if (!dir) return false;
        crossingMap.set(trk.uid, dir);
        if (dir === 'A->B') aToB += 1;
        else bToA += 1;
      }

      return true;
    });

    const avgDwell =
      matching.length > 0
        ? matching.reduce((acc, t) => acc + t.durationSec, 0) / matching.length
        : 0;

    return {
      matching,
      matchingSet: new Set(matching.map((m) => m.uid)),
      crossingMap,
      aToB,
      bToA,
      avgDwell,
    };
  }, [tracks, roiBox, tripwire, anchorMode]);

  // 8-way compass sector distribution for matching tracks
  const compassSectors = useMemo(() => {
    const labels = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    const counts = new Array<number>(8).fill(0);
    spatialEval.matching.forEach((trk) => {
      if (trk.observations.length < 2) return;
      const deg = ((trk.headingDegrees % 360) + 360) % 360;
      const idx = Math.round(deg / 45) % 8;
      counts[idx] += 1;
    });
    const maxCount = Math.max(1, ...counts);
    return labels.map((label, idx) => ({
      label,
      angleDeg: idx * 45,
      count: counts[idx],
      ratio: counts[idx] / maxCount,
    }));
  }, [spatialEval.matching]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 1. Background + Grid
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, W, H);
      ctx.fillStyle = 'rgba(10, 15, 22, 0.45)';
      ctx.fillRect(0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0b1118');
      grad.addColorStop(0.5, '#121b26');
      grad.addColorStop(1, '#0d141d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        const x = (i / 10) * W;
        const y = (i / 10) * H;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    // 2. 2D Density Heatmap layer
    if (showHeatmap && tracks.length > 0) {
      const cols = 24;
      const rows = 14;
      const bins = new Float32Array(cols * rows);
      let maxBin = 0;

      const sourceTracks = spatialEval.matching.length > 0 || roiBox || tripwire ? spatialEval.matching : tracks;
      sourceTracks.forEach((trk) => {
        trk.observations.forEach((o) => {
          const pt = getAnchor(o.bounding_box);
          const cx = Math.min(cols - 1, Math.max(0, Math.floor(pt.x * cols)));
          const cy = Math.min(rows - 1, Math.max(0, Math.floor(pt.y * rows)));
          const idx = cy * cols + cx;
          bins[idx] += 1;
          if (bins[idx] > maxBin) maxBin = bins[idx];
        });
      });

      if (maxBin > 0) {
        const cellW = W / cols;
        const cellH = H / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const val = bins[r * cols + c];
            if (val <= 0) continue;
            const norm = val / maxBin;
            const cx = (c + 0.5) * cellW;
            const cy = (r + 0.5) * cellH;
            const radius = Math.max(cellW, cellH) * 1.35;
            const rg = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
            if (norm > 0.65) {
              rg.addColorStop(0, `rgba(239, 68, 68, ${(0.45 * norm).toFixed(2)})`);
              rg.addColorStop(0.5, `rgba(249, 115, 22, ${(0.25 * norm).toFixed(2)})`);
              rg.addColorStop(1, 'rgba(249, 115, 22, 0)');
            } else {
              rg.addColorStop(0, `rgba(250, 204, 21, ${(0.38 * norm).toFixed(2)})`);
              rg.addColorStop(0.55, `rgba(56, 189, 248, ${(0.18 * norm).toFixed(2)})`);
              rg.addColorStop(1, 'rgba(56, 189, 248, 0)');
            }
            ctx.fillStyle = rg;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 3. Trajectories
    tracks.forEach((trk) => {
      if (trk.observations.length === 0) return;
      const isSelected = selectedTrack?.uid === trk.uid;
      const isHovered = hoveredUid === trk.uid;
      const matchesFilter = spatialEval.matchingSet.has(trk.uid);

      if (!showAllPaths && !isSelected && !isHovered) return;

      const strokeColor = getClassStrokeColor(trk.primaryClass);
      const alpha = !matchesFilter ? 0.16 : isSelected || isHovered ? 1 : 0.72;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isSelected ? 3.5 : isHovered ? 2.8 : 2;
      ctx.beginPath();
      trk.observations.forEach((obs, i) => {
        const pt = getAnchor(obs.bounding_box);
        const x = pt.x * W;
        const y = pt.y * H;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Directional arrow at last segment
      if (trk.observations.length >= 2) {
        const p0 = getAnchor(trk.observations[trk.observations.length - 2].bounding_box);
        const p1 = getAnchor(trk.observations[trk.observations.length - 1].bounding_box);
        const x0 = p0.x * W;
        const y0 = p0.y * H;
        const x1 = p1.x * W;
        const y1 = p1.y * H;
        const angle = Math.atan2(y1 - y0, x1 - x0);
        const head = isSelected ? 10 : 7;
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - head * Math.cos(angle - Math.PI / 6), y1 - head * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x1 - head * Math.cos(angle + Math.PI / 6), y1 - head * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }

      if (showMarkers && matchesFilter) {
        const first = getAnchor(trk.observations[0].bounding_box);
        const last = getAnchor(trk.observations[trk.observations.length - 1].bounding_box);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(first.x * W, first.y * H, isSelected ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(last.x * W, last.y * H, isSelected ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Active bounding box highlight for selected track
      if (isSelected) {
        const midObs =
          trk.observations[Math.floor(trk.observations.length * 0.58)] || trk.observations[0];
        const b = midObs.bounding_box;
        ctx.strokeStyle = '#FFCC00';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(
          b.left * W,
          b.top * H,
          (b.right - b.left) * W,
          (b.bottom - b.top) * H
        );
        ctx.setLineDash([]);
      }
      ctx.restore();
    });

    // 4. On-Scene Snapshot Thumbnails at crop_box positions
    if (showSnapshots) {
      spatialEval.matching.forEach((trk) => {
        if (!trk.snapshot?.crop_box) return;
        const img = thumbCacheRef.current.get(trk.uid);
        if (!img || !img.complete || img.naturalWidth === 0) return;

        const cb = trk.snapshot.crop_box;
        const cx = ((cb.left + cb.right) / 2) * W;
        const cy = ((cb.top + cb.bottom) / 2) * H;
        const isSelected = selectedTrack?.uid === trk.uid;
        const thumbW = isSelected ? 56 : 38;
        const thumbH = Math.max(24, Math.round((img.naturalHeight / img.naturalWidth) * thumbW));
        const dx = Math.max(4, Math.min(W - thumbW - 4, cx - thumbW / 2));
        const dy = Math.max(4, Math.min(H - thumbH - 4, cy - thumbH / 2));

        ctx.save();
        ctx.fillStyle = 'rgba(13, 19, 26, 0.9)';
        ctx.fillRect(dx - 2, dy - 2, thumbW + 4, thumbH + 4);
        ctx.drawImage(img, dx, dy, thumbW, thumbH);
        ctx.strokeStyle = isSelected ? '#FFCC00' : getClassStrokeColor(trk.primaryClass);
        ctx.lineWidth = isSelected ? 2.5 : 1.25;
        ctx.strokeRect(dx - 2, dy - 2, thumbW + 4, thumbH + 4);
        ctx.restore();
      });
    }

    // 5. Active or in-progress ROI Box
    const previewRoi: RoiBox | null =
      dragRoiStart && dragCurrent
        ? {
            left: Math.min(dragRoiStart.x, dragCurrent.x),
            top: Math.min(dragRoiStart.y, dragCurrent.y),
            right: Math.max(dragRoiStart.x, dragCurrent.x),
            bottom: Math.max(dragRoiStart.y, dragCurrent.y),
          }
        : roiBox;

    if (previewRoi) {
      const rx = previewRoi.left * W;
      const ry = previewRoi.top * H;
      const rw = (previewRoi.right - previewRoi.left) * W;
      const rh = (previewRoi.bottom - previewRoi.top) * H;
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px Consolas, monospace';
      ctx.fillText('ROI ZONE', rx + 6, Math.max(14, ry - 6));
      ctx.restore();
    }

    // 6. Active or in-progress Tripwire Line
    const previewLine: TripwireLine | null =
      dragLineStart && dragCurrent
        ? { x1: dragLineStart.x, y1: dragLineStart.y, x2: dragCurrent.x, y2: dragCurrent.y }
        : tripwire;

    if (previewLine) {
      const x1 = previewLine.x1 * W;
      const y1 = previewLine.y1 * H;
      const x2 = previewLine.x2 * W;
      const y2 = previewLine.y2 * H;
      ctx.save();
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(x1, y1, 4.5, 0, Math.PI * 2);
      ctx.arc(x2, y2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Normal direction indicator showing Side A -> Side B
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      // Normal matching cross(P2-P1, Q-P1) > 0 is (-dy, dx)
      const nx = -dy / len;
      const ny = dx / len;
      ctx.font = 'bold 11px Consolas, monospace';
      ctx.fillStyle = '#22c55e';
      ctx.fillText('A', mx - nx * 16 - 4, my - ny * 16 + 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('B', mx + nx * 16 - 4, my + ny * 16 + 4);

      ctx.strokeStyle = '#FFCC00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx - nx * 10, my - ny * 10);
      ctx.lineTo(mx + nx * 10, my + ny * 10);
      ctx.stroke();
      ctx.restore();
    }
  }, [
    tracks,
    selectedTrack,
    hoveredUid,
    spatialEval,
    roiBox,
    tripwire,
    dragRoiStart,
    dragLineStart,
    dragCurrent,
    showHeatmap,
    showAllPaths,
    showMarkers,
    showSnapshots,
    bgImage,
    anchorMode,
    thumbTick,
  ]);

  const toNormCoords = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height))),
    };
  };

  const findNearestTrack = (pt: { x: number; y: number }): string | null => {
    let bestUid: string | null = null;
    let bestDist = 0.045;
    tracks.forEach((trk) => {
      const obs = trk.observations;
      for (let i = 0; i < obs.length; i++) {
        const a = getAnchor(obs[i].bounding_box);
        const dPt = Math.hypot(pt.x - a.x, pt.y - a.y);
        if (dPt < bestDist) {
          bestDist = dPt;
          bestUid = trk.uid;
        }
        if (i > 0) {
          const prev = getAnchor(obs[i - 1].bounding_box);
          const dSeg = pointToSegmentDist(pt.x, pt.y, prev.x, prev.y, a.x, a.y);
          if (dSeg < bestDist) {
            bestDist = dSeg;
            bestUid = trk.uid;
          }
        }
      }
    });
    return bestUid;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toNormCoords(e);
    if (mode === 'inspect') {
      const hit = findNearestTrack(pt);
      if (hit) onSelectTrack(hit);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragCurrent(pt);
    if (mode === 'roi') {
      setDragRoiStart(pt);
    } else if (mode === 'tripwire') {
      setDragLineStart(pt);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = toNormCoords(e);
    setCursorNorm(pt);
    if (dragRoiStart || dragLineStart) {
      setDragCurrent(pt);
    } else if (mode === 'inspect') {
      setHoveredUid(findNearestTrack(pt));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRoiStart && dragCurrent) {
      const left = Math.min(dragRoiStart.x, dragCurrent.x);
      const right = Math.max(dragRoiStart.x, dragCurrent.x);
      const top = Math.min(dragRoiStart.y, dragCurrent.y);
      const bottom = Math.max(dragRoiStart.y, dragCurrent.y);
      if (right - left > 0.02 && bottom - top > 0.02) {
        setRoiBox({ left, top, right, bottom });
      }
      e.currentTarget.releasePointerCapture(e.pointerId);
    } else if (dragLineStart && dragCurrent) {
      const len = Math.hypot(dragCurrent.x - dragLineStart.x, dragCurrent.y - dragLineStart.y);
      if (len > 0.03) {
        setTripwire({
          x1: dragLineStart.x,
          y1: dragLineStart.y,
          x2: dragCurrent.x,
          y2: dragCurrent.y,
        });
      }
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragRoiStart(null);
    setDragLineStart(null);
    setDragCurrent(null);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setBgImage(img);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const trafficSharePct =
    tracks.length > 0 ? Math.round((spatialEval.matching.length / tracks.length) * 100) : 0;

  return (
    <div className={styles.root}>
      {/* Spatial Analytics Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <Button
            size="small"
            appearance={mode === 'inspect' ? 'primary' : 'outline'}
            icon={<SelectObjectRegular />}
            onClick={() => setMode('inspect')}
          >
            Inspect Track
          </Button>
          <Button
            size="small"
            appearance={mode === 'roi' ? 'primary' : 'outline'}
            icon={<SquareRegular />}
            onClick={() => setMode('roi')}
          >
            Draw ROI Box
          </Button>
          <Button
            size="small"
            appearance={mode === 'tripwire' ? 'primary' : 'outline'}
            icon={<LineRegular />}
            onClick={() => setMode('tripwire')}
          >
            Draw Tripwire
          </Button>

          <span className={styles.divider} />

          <Button
            size="small"
            appearance="subtle"
            onClick={() => setRoiBox({ left: 0.25, top: 0.25, right: 0.75, bottom: 0.78 })}
          >
            Preset Center ROI
          </Button>
          <Button
            size="small"
            appearance="subtle"
            onClick={() => setTripwire({ x1: 0.5, y1: 0.12, x2: 0.5, y2: 0.88 })}
          >
            Preset Center Tripwire
          </Button>
          {(roiBox || tripwire) && (
            <Button
              size="small"
              appearance="subtle"
              icon={<DeleteRegular />}
              onClick={() => {
                setRoiBox(null);
                setTripwire(null);
              }}
            >
              Clear Zones
            </Button>
          )}
        </div>

        <div className={styles.toolGroup}>
          <Switch label="Heatmap" checked={showHeatmap} onChange={(_, d) => setShowHeatmap(d.checked)} />
          <Switch label="Paths" checked={showAllPaths} onChange={(_, d) => setShowAllPaths(d.checked)} />
          <Switch label="Entry/Exit" checked={showMarkers} onChange={(_, d) => setShowMarkers(d.checked)} />
          <Switch label="Snapshots" checked={showSnapshots} onChange={(_, d) => setShowSnapshots(d.checked)} />
          <Button
            size="small"
            appearance="subtle"
            onClick={() => setAnchorMode((m) => (m === 'foot' ? 'center' : 'foot'))}
          >
            {anchorMode === 'foot' ? 'Anchor: Foot' : 'Anchor: Center'}
          </Button>
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleBgUpload}
          />
          <Tooltip content="Upload camera scene reference image" relationship="label">
            <Button
              size="small"
              appearance="subtle"
              icon={<ImageAddRegular />}
              onClick={() => bgInputRef.current?.click()}
            >
              {bgImage ? 'Change BG' : 'Scene BG'}
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Main Canvas + Spatial Intelligence Sidebar */}
      <div className={styles.workspace}>
        <div className={styles.canvasStage}>
          <div className={styles.canvasBox}>
            <canvas
              ref={canvasRef}
              width={960}
              height={540}
              className={styles.canvas}
              style={{
                cursor: mode === 'inspect' ? (hoveredUid ? 'pointer' : 'default') : 'crosshair',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => {
                setHoveredUid(null);
                setCursorNorm(null);
              }}
            />
          </div>

          <div className={styles.canvasFooterHint}>
            <span>
              {mode === 'inspect'
                ? 'Click any trajectory or on-scene snapshot to inspect. Switch to Draw ROI Box or Draw Tripwire to filter tracks spatially.'
                : mode === 'roi'
                  ? 'Click and drag on the canvas to define a rectangular ROI zone.'
                  : 'Click and drag across the scene to place a directional virtual tripwire.'}
            </span>
            <span className={styles.mono}>
              {cursorNorm
                ? `Scene (${cursorNorm.x.toFixed(3)}, ${cursorNorm.y.toFixed(3)})`
                : 'Normalized Scene [0..1]'}
            </span>
          </div>
        </div>

        <aside className={mergeClasses(styles.sidebar, scrollStyles.scrollable)}>
          {/* Zone & Traffic Summary */}
          <div className={styles.sidebarSection}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={styles.sectionTitle}>Spatial Intelligence</span>
              <Badge appearance="tint" color={roiBox || tripwire ? 'brand' : 'subtle'}>
                {roiBox && tripwire
                  ? 'ROI + Tripwire'
                  : roiBox
                    ? 'ROI Active'
                    : tripwire
                      ? 'Tripwire Active'
                      : 'Full Scene'}
              </Badge>
            </div>

            <div className={styles.kpiGrid}>
              <div className={styles.kpiMiniCard}>
                <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                  Matching Tracks
                </Text>
                <Text size={500} weight="semibold" className={styles.mono}>
                  {spatialEval.matching.length}{' '}
                  <span style={{ fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
                    ({trafficSharePct}%)
                  </span>
                </Text>
              </div>
              <div className={styles.kpiMiniCard}>
                <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                  Avg Dwell Duration
                </Text>
                <Text size={500} weight="semibold" className={styles.mono}>
                  {spatialEval.avgDwell.toFixed(1)}s
                </Text>
              </div>
            </div>

            {tripwire && (
              <div className={styles.kpiGrid}>
                <div className={styles.kpiMiniCard}>
                  <Text size={100} style={{ color: '#22c55e' }}>
                    Crossing A → B
                  </Text>
                  <Text size={400} weight="semibold" className={styles.mono}>
                    {spatialEval.aToB}
                  </Text>
                </div>
                <div className={styles.kpiMiniCard}>
                  <Text size={100} style={{ color: '#38bdf8' }}>
                    Crossing B → A
                  </Text>
                  <Text size={400} weight="semibold" className={styles.mono}>
                    {spatialEval.bToA}
                  </Text>
                </div>
              </div>
            )}
          </div>

          {/* 8-Way Directional Flow Rose */}
          <div className={styles.sidebarSection}>
            <span className={styles.sectionTitle}>8-Way Directional Flow Rose</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="136" height="136" viewBox="-70 -70 140 140" style={{ flexShrink: 0 }}>
                <circle cx="0" cy="0" r="52" fill="none" stroke="rgba(148,163,184,0.22)" />
                <circle cx="0" cy="0" r="34" fill="none" stroke="rgba(148,163,184,0.16)" strokeDasharray="2 2" />
                <circle cx="0" cy="0" r="17" fill="none" stroke="rgba(148,163,184,0.16)" />
                <line x1="-54" y1="0" x2="54" y2="0" stroke="rgba(148,163,184,0.2)" />
                <line x1="0" y1="-54" x2="0" y2="54" stroke="rgba(148,163,184,0.2)" />
                {compassSectors.map((sec) => {
                  const r = 10 + sec.ratio * 40;
                  const a1 = ((sec.angleDeg - 18) * Math.PI) / 180;
                  const a2 = ((sec.angleDeg + 18) * Math.PI) / 180;
                  const x1 = Math.cos(a1) * r;
                  const y1 = Math.sin(a1) * r;
                  const x2 = Math.cos(a2) * r;
                  const y2 = Math.sin(a2) * r;
                  const lx = Math.cos((sec.angleDeg * Math.PI) / 180) * 61;
                  const ly = Math.sin((sec.angleDeg * Math.PI) / 180) * 61;
                  return (
                    <g key={sec.label}>
                      {sec.count > 0 && (
                        <path
                          d={`M 0 0 L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`}
                          fill="rgba(255, 204, 0, 0.45)"
                          stroke="#FFCC00"
                          strokeWidth="1.2"
                        />
                      )}
                      <text
                        x={lx}
                        y={ly + 3}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#94a3b8"
                        fontFamily="Consolas, monospace"
                      >
                        {sec.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 10px', flex: 1, fontSize: '11px' }}>
                {compassSectors.map((sec) => (
                  <div key={sec.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: tokens.colorNeutralForeground3 }}>{sec.label}</span>
                    <span className={styles.mono}>{sec.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Developer Zone Geometry & Code Export */}
          <div className={styles.sidebarSection}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={styles.sectionTitle}>Developer Zone Geometry</span>
              <Badge appearance="outline" size="small">
                anchor: {anchorMode}
              </Badge>
            </div>

            {!roiBox && !tripwire && (
              <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                Draw an ROI Box or Tripwire on the canvas to generate exact normalized coordinates (defaults to full [0..1] scene).
              </Text>
            )}

            <pre
              className={styles.mono}
              style={{
                margin: 0,
                padding: '6px 8px',
                fontSize: '11px',
                lineHeight: '1.35',
                borderRadius: tokens.borderRadiusSmall,
                backgroundColor: tokens.colorNeutralBackground1,
                border: `1px solid ${tokens.colorNeutralStroke2}`,
                overflowX: 'auto',
                color: tokens.colorNeutralForeground1,
              }}
            >
              {JSON.stringify(exportedGeometry, null, 2)}
            </pre>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Button
                size="small"
                appearance="secondary"
                icon={copiedMode === 'json' ? <CheckmarkRegular /> : <CopyRegular />}
                onClick={handleCopyZoneJson}
              >
                {copiedMode === 'json' ? 'Copied!' : 'Copy JSON Geometry'}
              </Button>
              <Button
                size="small"
                appearance="primary"
                icon={copiedMode === 'js' ? <CheckmarkRegular /> : <CodeRegular />}
                onClick={handleCopyJsSnippet}
              >
                {copiedMode === 'js' ? 'Copied!' : 'Copy JS Filter Snippet'}
              </Button>
            </div>
          </div>

          {/* Matching Tracks List */}
          <div style={{ padding: '8px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={styles.sectionTitle}>Filtered Tracks ({spatialEval.matching.length})</span>
            {selectedTrack && (
              <Button
                size="small"
                appearance="subtle"
                icon={<OpenRegular />}
                onClick={() => onOpenInWorkbench(selectedTrack.uid)}
              >
                Workbench
              </Button>
            )}
          </div>

          <div className={mergeClasses(styles.trackListScroll, scrollStyles.scrollable)}>
            {spatialEval.matching.map((trk) => {
              const isSelected = selectedTrack?.uid === trk.uid;
              const src = getSnapshotSrc(trk.snapshot);
              const crossDir = spatialEval.crossingMap.get(trk.uid);
              return (
                <div
                  key={trk.uid}
                  className={mergeClasses(styles.trackRowCard, isSelected && styles.trackRowSelected)}
                  onClick={() => onSelectTrack(trk.uid)}
                  onMouseEnter={() => setHoveredUid(trk.uid)}
                  onMouseLeave={() => setHoveredUid(null)}
                >
                  <div className={styles.thumbBox}>
                    {src ? (
                      <img src={src} alt={trk.primaryClass} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                    ) : (
                      <CameraOffRegular fontSize={16} style={{ color: '#64748b' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Badge
                        size="small"
                        appearance="tint"
                        color={getClassBadgeColor(trk.primaryClass)}
                        icon={getClassIcon(trk.primaryClass)}
                      >
                        {trk.primaryClass}
                      </Badge>
                      <Text size={100} className={styles.mono} style={{ color: tokens.colorNeutralForeground3 }}>
                        {trk.trackId.slice(0, 8)}
                      </Text>
                      {crossDir && (
                        <Badge size="small" appearance="outline" color={crossDir === 'A->B' ? 'success' : 'informative'}>
                          {crossDir}
                        </Badge>
                      )}
                    </div>
                    <Text size={100} className={styles.mono} style={{ color: tokens.colorNeutralForeground3 }}>
                      Ch {trk.channelId} · {trk.durationSec.toFixed(1)}s · {headingToCompassLabel(trk.headingDegrees)} (
                      {Math.round(trk.headingDegrees)}°)
                    </Text>
                  </div>
                  <LocationRegular style={{ color: getClassStrokeColor(trk.primaryClass) }} />
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};
