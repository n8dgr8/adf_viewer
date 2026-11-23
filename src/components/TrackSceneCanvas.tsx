import React, { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Slider,
  Switch,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowDownloadRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  ImageAddRegular,
  PauseRegular,
  PlayRegular,
  ZoomInRegular,
  ZoomOutRegular,
} from '@fluentui/react-icons';
import { NormalizedTrackRecord } from '../types/adf';
import { getBoxCenter, getBoxFootPoint } from '../utils/adfParser';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
  },
  headerCollapsed: {
    borderBottom: 'none',
  },
  headerToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  canvasWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: '#11161d',
    overflow: 'hidden',
  },
  canvas: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  scrubberBar: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  slider: {
    flex: 1,
  },
  monoMeta: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
  },
  legendBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `4px ${tokens.spacingHorizontalM}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
  },
  legendGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  legendDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '5px',
  },
});

export interface TrackSceneCanvasProps {
  track: NormalizedTrackRecord;
  allTracks: NormalizedTrackRecord[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const TrackSceneCanvas: React.FC<TrackSceneCanvasProps> = ({
  track,
  allTracks,
  collapsed,
  onToggleCollapse,
}) => {
  const styles = useStyles();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const isCollapsed = collapsed ?? internalCollapsed;
  const handleToggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed((c) => !c);
  };

  const [compactAspect, setCompactAspect] = useState<boolean>(false);
  const [obsIndex, setObsIndex] = useState<number>(
    Math.max(0, track.observations.length - 1)
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showGhostBoxes, setShowGhostBoxes] = useState<boolean>(true);
  const [showOtherTracks, setShowOtherTracks] = useState<boolean>(true);
  const [zoomToTrack, setZoomToTrack] = useState<boolean>(false);
  const [anchorMode, setAnchorMode] = useState<'foot' | 'center'>('center');
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Reset scrubber to last path point when selected track changes
  useEffect(() => {
    setIsPlaying(false);
    setObsIndex(Math.max(0, track.observations.length - 1));
  }, [track.uid, track.observations.length]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying || track.observations.length <= 1) return;
    const timer = window.setInterval(() => {
      setObsIndex((prev) => {
        if (prev >= track.observations.length - 1) {
          return 0;
        }
        return prev + 1;
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [isPlaying, track.observations.length]);

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

  const handleDownloadPathPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `track-${track.trackId.slice(0, 8)}-path.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Render scene trajectory on canvas
  useEffect(() => {
    if (isCollapsed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const obsList = track.observations;

    // Compute viewport bounds in normalized [0..1] space (either Full [0..1] or Zoomed around track)
    let viewMinX = 0;
    let viewMaxX = 1;
    let viewMinY = 0;
    let viewMaxY = 1;

    if (zoomToTrack && obsList.length > 0) {
      let minX = 1;
      let maxX = 0;
      let minY = 1;
      let maxY = 0;
      obsList.forEach((o) => {
        minX = Math.min(minX, o.bounding_box.left);
        maxX = Math.max(maxX, o.bounding_box.right);
        minY = Math.min(minY, o.bounding_box.top);
        maxY = Math.max(maxY, o.bounding_box.bottom);
      });
      if (track.snapshot?.crop_box) {
        minX = Math.min(minX, track.snapshot.crop_box.left);
        maxX = Math.max(maxX, track.snapshot.crop_box.right);
        minY = Math.min(minY, track.snapshot.crop_box.top);
        maxY = Math.max(maxY, track.snapshot.crop_box.bottom);
      }

      const spanX = Math.max(0.08, maxX - minX);
      const spanY = Math.max(0.08, maxY - minY);
      const padX = spanX * 0.35;
      const padY = spanY * 0.35;

      // Preserve aspect ratio in normalized space
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const halfSpan = Math.max(spanX / 2 + padX, spanY / 2 + padY);

      viewMinX = Math.max(0, Math.min(1 - halfSpan * 2, cx - halfSpan));
      viewMaxX = Math.min(1, viewMinX + halfSpan * 2);
      viewMinY = Math.max(0, Math.min(1 - halfSpan * 2, cy - halfSpan));
      viewMaxY = Math.min(1, viewMinY + halfSpan * 2);
    }

    const toCanvasX = (nx: number) => ((nx - viewMinX) / (viewMaxX - viewMinX)) * W;
    const toCanvasY = (ny: number) => ((ny - viewMinY) / (viewMaxY - viewMinY)) * H;
    const toCanvasW = (nw: number) => (nw / (viewMaxX - viewMinX)) * W;
    const toCanvasH = (nh: number) => (nh / (viewMaxY - viewMinY)) * H;

    // Helper to keep text labels inside canvas borders
    const drawClampedLabel = (
      text: string,
      x: number,
      y: number,
      color: string,
      font = 'bold 11px Consolas, monospace'
    ) => {
      ctx.font = font;
      const tw = ctx.measureText(text).width;
      const clampedX = Math.max(6, Math.min(W - tw - 8, x));
      const clampedY = Math.max(14, Math.min(H - 8, y));
      ctx.fillStyle = 'rgba(13, 19, 26, 0.78)';
      ctx.fillRect(clampedX - 3, clampedY - 11, tw + 6, 14);
      ctx.fillStyle = color;
      ctx.fillText(text, clampedX, clampedY);
    };

    // 1. Scene background
    if (bgImage && !zoomToTrack) {
      ctx.drawImage(bgImage, 0, 0, W, H);
      ctx.fillStyle = 'rgba(10, 14, 20, 0.45)';
      ctx.fillRect(0, 0, W, H);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#0d131a');
      grad.addColorStop(0.28, '#151e29');
      grad.addColorStop(1, '#10161f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Coordinate grid lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      const gridStep = zoomToTrack ? 0.05 : 0.1;
      const startGridX = Math.ceil(viewMinX / gridStep) * gridStep;
      for (let gxVal = startGridX; gxVal < viewMaxX; gxVal += gridStep) {
        const gx = toCanvasX(gxVal);
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();

        ctx.fillStyle = 'rgba(148, 163, 184, 0.42)';
        ctx.font = '10px Consolas, monospace';
        ctx.fillText(gxVal.toFixed(zoomToTrack ? 2 : 1), gx + 3, 12);
      }

      const startGridY = Math.ceil(viewMinY / gridStep) * gridStep;
      for (let gyVal = startGridY; gyVal < viewMaxY; gyVal += gridStep) {
        const gy = toCanvasY(gyVal);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();

        ctx.fillStyle = 'rgba(148, 163, 184, 0.42)';
        ctx.font = '10px Consolas, monospace';
        ctx.fillText(gyVal.toFixed(zoomToTrack ? 2 : 1), 4, gy - 3);
      }
    }

    const getAnchor = (box: { top: number; right: number; bottom: number; left: number }) =>
      anchorMode === 'foot' ? getBoxFootPoint(box) : getBoxCenter(box);

    // 2. Optional background heat/ghost trajectories of other tracks
    if (showOtherTracks && !zoomToTrack) {
      allTracks.forEach((other) => {
        if (other.uid === track.uid || other.observations.length < 2) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        other.observations.forEach((obs, i) => {
          const pt = getAnchor(obs.bounding_box);
          const cx = toCanvasX(pt.x);
          const cy = toCanvasY(pt.y);
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.stroke();
        ctx.restore();
      });
    }

    if (obsList.length === 0) return;

    // 3. Historical bounding box progression along the trajectory
    if (showGhostBoxes) {
      obsList.forEach((obs, i) => {
        const isCurrent = i === obsIndex;
        if (isCurrent) return;
        const b = obs.bounding_box;
        const alpha = 0.12 + (i / obsList.length) * 0.22;
        ctx.strokeStyle = `rgba(255, 204, 0, ${alpha.toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(
          toCanvasX(b.left),
          toCanvasY(b.top),
          toCanvasW(b.right - b.left),
          toCanvasH(b.bottom - b.top)
        );
      });
    }

    // 4. Snapshot crop_box indicator if present
    if (track.snapshot?.crop_box) {
      const sb = track.snapshot.crop_box;
      const sx = toCanvasX(sb.left);
      const sy = toCanvasY(sb.top);
      const sw = toCanvasW(sb.right - sb.left);
      const sh = toCanvasH(sb.bottom - sb.top);

      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 1.75;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(sx, sy, sw, sh);
      ctx.restore();

      drawClampedLabel(
        'SNAPSHOT CROP',
        sx,
        sy - 5,
        '#38bdf8',
        'bold 10px Consolas, monospace'
      );
    }

    // 5. Trajectory line segments with gradient color progression + directional chevrons
    for (let i = 1; i < obsList.length; i++) {
      const p0 = getAnchor(obsList[i - 1].bounding_box);
      const p1 = getAnchor(obsList[i].bounding_box);
      const t = i / (obsList.length - 1);

      const x0 = toCanvasX(p0.x);
      const y0 = toCanvasY(p0.y);
      const x1 = toCanvasX(p1.x);
      const y1 = toCanvasY(p1.y);

      const played = i <= obsIndex;
      ctx.strokeStyle = played
        ? t < 0.5
          ? '#22c55e'
          : '#FFCC00'
        : 'rgba(255, 204, 0, 0.3)';
      ctx.lineWidth = played ? 3.2 : 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      // Directional arrow head
      if (i % 3 === 0 || i === obsList.length - 1) {
        const angle = Math.atan2(y1 - y0, x1 - x0);
        const headLen = 7;
        ctx.fillStyle = played ? '#FFCC00' : 'rgba(255, 204, 0, 0.35)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(
          x1 - headLen * Math.cos(angle - Math.PI / 6),
          y1 - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x1 - headLen * Math.cos(angle + Math.PI / 6),
          y1 - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    }

    // Observation anchor dots
    obsList.forEach((obs, i) => {
      const pt = getAnchor(obs.bounding_box);
      const x = toCanvasX(pt.x);
      const y = toCanvasY(pt.y);
      ctx.fillStyle =
        i === 0
          ? '#22c55e'
          : i === obsList.length - 1
            ? '#f97316'
            : i === obsIndex
              ? '#ffffff'
              : '#FFCC00';
      ctx.beginPath();
      ctx.arc(
        x,
        y,
        i === 0 || i === obsList.length - 1 || i === obsIndex ? 5 : 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Entry & Exit labels (clamped so edges near 0.999 stay fully visible)
    const startPt = getAnchor(obsList[0].bounding_box);
    const endPt = getAnchor(obsList[obsList.length - 1].bounding_box);
    drawClampedLabel('ENTRY', toCanvasX(startPt.x) - 18, toCanvasY(startPt.y) + 18, '#22c55e');
    drawClampedLabel('EXIT', toCanvasX(endPt.x) + 8, toCanvasY(endPt.y) + 18, '#f97316');

    // 6. Active Observation Bounding Box (at current scrubber index)
    const activeObs = obsList[Math.min(obsIndex, obsList.length - 1)];
    if (activeObs) {
      const b = activeObs.bounding_box;
      const bx = toCanvasX(b.left);
      const by = toCanvasY(b.top);
      const bw = toCanvasW(b.right - b.left);
      const bh = toCanvasH(b.bottom - b.top);

      ctx.fillStyle = 'rgba(255, 204, 0, 0.16)';
      ctx.fillRect(bx, by, bw, bh);

      ctx.strokeStyle = '#FFCC00';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx, by, bw, bh);

      // Label tag above active bounding box (clamped inside canvas)
      const tagText = `${track.primaryClass.toUpperCase()} #${obsIndex + 1}/${obsList.length}`;
      ctx.font = 'bold 11px Consolas, monospace';
      const textWidth = ctx.measureText(tagText).width;
      const tagX = Math.max(4, Math.min(W - textWidth - 16, bx));
      const tagY = by >= 22 ? by - 20 : Math.min(H - 22, by + bh + 4);
      ctx.fillStyle = '#FFCC00';
      ctx.fillRect(tagX, tagY, textWidth + 12, 18);
      ctx.fillStyle = '#11161d';
      ctx.fillText(tagText, tagX + 6, tagY + 13);
    }

    // 7. Auto-positioned HUD overlay (placed in bottom-left or top-left away from track points)
    const avgX =
      obsList.reduce((acc, o) => acc + (o.bounding_box.left + o.bounding_box.right) / 2, 0) /
      obsList.length;
    const avgY =
      obsList.reduce((acc, o) => acc + (o.bounding_box.top + o.bounding_box.bottom) / 2, 0) /
      obsList.length;

    const hudW = 236;
    const hudH = 54;
    const hudX = avgX < 0.45 ? W - hudW - 10 : 10;
    const hudY = avgY > 0.55 ? 10 : H - hudH - 10;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
    ctx.fillRect(hudX, hudY, hudW, hudH);
    ctx.strokeStyle = 'rgba(255, 204, 0, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hudX, hudY, hudW, hudH);
    ctx.fillStyle = '#FFCC00';
    ctx.font = 'bold 11px Consolas, monospace';
    ctx.fillText(
      `TRACK ${track.trackId.slice(0, 8)} • CH${track.channelId} (${zoomToTrack ? 'ZOOM' : 'FULL'})`,
      hudX + 8,
      hudY + 17
    );
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px Consolas, monospace';
    ctx.fillText(
      `Path: ${track.pathLengthNormalized.toFixed(3)}u | Heading: ${Math.round(track.headingDegrees)}°`,
      hudX + 8,
      hudY + 33
    );
    ctx.fillText(
      `Duration: ${track.durationSec.toFixed(2)}s (${obsList.length} path pts)`,
      hudX + 8,
      hudY + 47
    );
  }, [
    track,
    allTracks,
    obsIndex,
    showGhostBoxes,
    showOtherTracks,
    zoomToTrack,
    anchorMode,
    bgImage,
    isCollapsed,
    compactAspect,
  ]);

  const currentObs = track.observations[Math.min(obsIndex, track.observations.length - 1)];

  return (
    <div className={styles.card}>
      <div
        className={styles.header}
        style={isCollapsed ? { borderBottom: 'none' } : undefined}
      >
        <div
          className={styles.headerToggle}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          onClick={handleToggleCollapse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleCollapse();
            }
          }}
        >
          {isCollapsed ? <ChevronRightRegular /> : <ChevronDownRegular />}
          <Text weight="semibold">Scene Trajectory & Path</Text>
          <Badge appearance="tint" color="brand">
            {zoomToTrack ? 'Zoomed to Track' : 'Normalized [0..1]'}
          </Badge>
          {isCollapsed && (
            <Badge appearance="outline" size="small">
              {track.observations.length} pts • {track.durationSec.toFixed(2)}s •{' '}
              {track.pathLengthNormalized.toFixed(2)}u • {Math.round(track.headingDegrees)}°
            </Badge>
          )}
        </div>

        {!isCollapsed && (
          <div className={styles.headerControls}>
            <Tooltip
              content="Switch canvas aspect ratio between standard 16:9 and compact 21:9"
              relationship="label"
            >
              <Button
                size="small"
                appearance={compactAspect ? 'primary' : 'outline'}
                onClick={() => setCompactAspect((c) => !c)}
              >
                {compactAspect ? '21:9 Compact' : '16:9'}
              </Button>
            </Tooltip>
            <Button
              size="small"
              appearance={zoomToTrack ? 'primary' : 'outline'}
              icon={zoomToTrack ? <ZoomOutRegular /> : <ZoomInRegular />}
              onClick={() => setZoomToTrack((z) => !z)}
            >
              {zoomToTrack ? 'Full Scene [0..1]' : 'Zoom to Track'}
            </Button>
            <Switch
              label="BBox Trail"
              checked={showGhostBoxes}
              onChange={(_, d) => setShowGhostBoxes(d.checked)}
            />
            <Switch
              label="All Tracks"
              checked={showOtherTracks}
              disabled={zoomToTrack}
              onChange={(_, d) => setShowOtherTracks(d.checked)}
            />
            <Button
              size="small"
              appearance="subtle"
              onClick={() => setAnchorMode((m) => (m === 'foot' ? 'center' : 'foot'))}
            >
              Anchor: {anchorMode === 'foot' ? 'Footpoint' : 'Center'}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleBgUpload}
            />
            <Tooltip content="Load a reference scene image behind the trajectory" relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<ImageAddRegular />}
                onClick={() => fileInputRef.current?.click()}
              >
                {bgImage ? 'Change BG' : 'Scene BG'}
              </Button>
            </Tooltip>

            <Tooltip content="Export trajectory visualization as PNG" relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowDownloadRegular />}
                onClick={handleDownloadPathPng}
              />
            </Tooltip>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <>
          <div
            className={styles.canvasWrapper}
            style={{ aspectRatio: compactAspect ? '21 / 9' : '16 / 9' }}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={compactAspect ? 343 : 450}
              className={styles.canvas}
            />
          </div>

          {track.observations.length > 0 && (
            <div className={styles.scrubberBar}>
              <Button
                size="small"
                appearance="primary"
                icon={isPlaying ? <PauseRegular /> : <PlayRegular />}
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? 'Pause trajectory playback' : 'Play trajectory playback'}
              />
              <Text className={styles.monoMeta}>
                Pt {obsIndex + 1}/{track.observations.length}
              </Text>
              <Slider
                className={styles.slider}
                min={0}
                max={Math.max(0, track.observations.length - 1)}
                step={1}
                value={obsIndex}
                onChange={(_, data) => {
                  setIsPlaying(false);
                  setObsIndex(data.value);
                }}
              />
              {currentObs && (
                <Text className={styles.monoMeta}>
                  [L:{currentObs.bounding_box.left.toFixed(4)}, T:{currentObs.bounding_box.top.toFixed(4)},{' '}
                  R:{currentObs.bounding_box.right.toFixed(4)}, B:{currentObs.bounding_box.bottom.toFixed(4)}]
                </Text>
              )}
            </div>
          )}

          <div className={styles.legendBar}>
            <div className={styles.legendGroup}>
              <span>
                <span className={styles.legendDot} style={{ backgroundColor: '#22c55e' }} />
                Entry ({track.startTime.slice(11, 23)})
              </span>
              <span>
                <span className={styles.legendDot} style={{ backgroundColor: '#FFCC00' }} />
                Active BBox
              </span>
              <span>
                <span className={styles.legendDot} style={{ backgroundColor: '#f97316' }} />
                Exit ({track.endTime.slice(11, 23)})
              </span>
              <span>
                <span className={styles.legendDot} style={{ backgroundColor: '#38bdf8' }} />
                Snapshot Crop Box
              </span>
            </div>
            {currentObs && (
              <span className={styles.monoMeta}>
                t = {currentObs.timestamp.slice(11, 26)}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};
