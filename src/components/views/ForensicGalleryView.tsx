import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Input,
  Slider,
  Switch,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  CameraOffRegular,
  CameraRegular,
  CheckmarkRegular,
  CopyRegular,
  DataBarVerticalRegular,
  DismissRegular,
  FilterRegular,
  GridRegular,
  OpenRegular,
  PauseRegular,
  PinOffRegular,
  PinRegular,
  PlayRegular,
  SearchRegular,
  TimelineRegular,
} from '@fluentui/react-icons';
import { EmptyView } from '@axiscommunications/fluent-empty-view';
import { useCustomScrollbars } from '@axiscommunications/fluent-styles';
import { NormalizedTrackRecord } from '../../types/adf';
import { formatBytes, getBoxCenter, getBoxFootPoint } from '../../utils/adfParser';
import { getClassBadgeColor, getClassIcon } from '../TrackTable';
import {
  ColorScope,
  TimelineAlignMode,
  TrackColorEntry,
  computeTimelineSpans,
  extractTrackColorEntries,
  getClassStrokeColor,
  getSnapshotSrc,
  headingToCompassLabel,
  interpolateBoxAtProgress,
} from './adfViewHelpers';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  sidebar: {
    width: '276px',
    minWidth: '250px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowY: 'auto',
  },
  sectionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  sectionLabelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalXS,
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: tokens.colorNeutralForeground3,
  },
  chipGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  swatchGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '6px',
  },
  swatchBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 7px',
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    cursor: 'pointer',
    fontSize: '11px',
    textAlign: 'left',
    overflow: 'hidden',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  swatchBtnActive: {
    border: '1px solid #FFCC00',
    backgroundColor: tokens.colorNeutralBackground1Selected,
    boxShadow: '0 0 0 1px rgba(255, 204, 0, 0.35)',
  },
  swatchDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
    border: '1px solid rgba(148, 163, 184, 0.5)',
  },
  nativeSelect: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: tokens.borderRadiusSmall,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase200,
    fontFamily: 'inherit',
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  gridHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  cardScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: tokens.spacingHorizontalM,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: tokens.spacingHorizontalM,
    alignItems: 'stretch',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 0.12s ease, transform 0.12s ease',
    '&:hover': {
      border: `1px solid ${tokens.colorNeutralStroke1}`,
    },
  },
  cardSelected: {
    border: '1.5px solid #FFCC00',
    boxShadow: '0 0 0 1px rgba(255, 204, 0, 0.28)',
  },
  mediaStage: {
    position: 'relative',
    height: '154px',
    backgroundColor: '#0d131a',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mediaImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  overlayTopLeft: {
    position: 'absolute',
    top: '8px',
    left: '8px',
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  overlayBottomRight: {
    position: 'absolute',
    bottom: '6px',
    right: '6px',
    backgroundColor: 'rgba(13, 19, 26, 0.85)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '4px',
    padding: '2px',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: tokens.spacingHorizontalS,
    flex: 1,
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
  },
  confidenceTrack: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    backgroundColor: tokens.colorNeutralBackground4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#FFCC00',
  },
  colorStrip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  colorChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px',
    borderRadius: '999px',
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
  },
  cardMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
    marginTop: 'auto',
    paddingTop: '4px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  inspector: {
    width: '350px',
    minWidth: '320px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground2,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden',
  },
  inspectorCompare: {
    width: '480px',
    minWidth: '420px',
  },
  inspectorHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  inspectorScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: tokens.spacingHorizontalM,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  probBarRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  probBarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  probBarBg: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'hidden',
  },
  mono: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
  },
  compareGrid: {
    display: 'grid',
    gap: '8px',
    alignItems: 'start',
  },
  compareCard: {
    padding: '8px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
});

type SortOption = 'newest' | 'confidence' | 'duration' | 'displacement' | 'size';
type ScopeFilter = 'all' | ColorScope;

const SparklineTrajectory: React.FC<{ track: NormalizedTrackRecord; width?: number; height?: number }> = ({
  track,
  width = 58,
  height = 36,
}) => {
  const strokeColor = getClassStrokeColor(track.primaryClass);
  const points = track.observations.map((o) => {
    const pt = getBoxFootPoint(o.bounding_box);
    return `${(pt.x * width).toFixed(1)},${(pt.y * height).toFixed(1)}`;
  });

  if (points.length === 0) return null;
  const first = getBoxFootPoint(track.observations[0].bounding_box);
  const last = getBoxFootPoint(track.observations[track.observations.length - 1].bounding_box);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <rect x="0.5" y="0.5" width={width - 1} height={height - 1} fill="none" stroke="rgba(148,163,184,0.22)" />
      {points.length > 1 && (
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(' ')}
        />
      )}
      <circle cx={first.x * width} cy={first.y * height} r="2.3" fill="#22c55e" />
      <circle cx={last.x * width} cy={last.y * height} r="2.5" fill="#f97316" />
    </svg>
  );
};

type TopDrawerMode = 'none' | 'timeline' | 'summary';
type GroupMode = 'individual' | 'class' | 'channel';

const SessionTimelineDrawer: React.FC<{
  tracks: NormalizedTrackRecord[];
  selectedTrack: NormalizedTrackRecord | null;
  onSelectTrack: (uid: string) => void;
}> = ({ tracks, selectedTrack, onSelectTrack }) => {
  const scrollStyles = useCustomScrollbars();
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [alignMode, setAlignMode] = useState<TimelineAlignMode>('relative');
  const [groupMode, setGroupMode] = useState<GroupMode>('individual');
  const [playheadPct, setPlayheadPct] = useState<number>(350);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setPlayheadPct((p) => (p >= 1000 ? 0 : p + 14));
    }, 80);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const timelineData = useMemo(() => computeTimelineSpans(tracks, alignMode), [tracks, alignMode]);
  const currentSec = (playheadPct / 1000) * timelineData.totalWindowSec;

  const groupedSpans = useMemo(() => {
    if (groupMode === 'individual') {
      return [{ label: 'All Filtered', items: timelineData.spans }];
    }
    const groups = new Map<string, typeof timelineData.spans>();
    timelineData.spans.forEach((sp) => {
      const key = groupMode === 'class' ? sp.track.primaryClass : `Channel ${sp.track.channelId}`;
      const list = groups.get(key) || [];
      list.push(sp);
      groups.set(key, list);
    });
    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
  }, [timelineData.spans, groupMode]);

  const activeAtPlayhead = useMemo(
    () => timelineData.spans.filter((sp) => currentSec >= sp.startOffsetSec && currentSec <= sp.endOffsetSec),
    [timelineData.spans, currentSec]
  );

  useEffect(() => {
    const canvas = miniCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0c1219';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i / 4) * W, 0);
      ctx.lineTo((i / 4) * W, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i / 4) * H);
      ctx.lineTo(W, (i / 4) * H);
      ctx.stroke();
    }

    activeAtPlayhead.forEach((sp) => {
      const dur = Math.max(0.01, sp.endOffsetSec - sp.startOffsetSec);
      const progress = (currentSec - sp.startOffsetSec) / dur;
      const box = interpolateBoxAtProgress(sp.track, progress);
      if (!box) return;
      const color = getClassStrokeColor(sp.track.primaryClass);
      const isSel = selectedTrack?.uid === sp.track.uid;
      const bx = box.left * W;
      const by = box.top * H;
      const bw = Math.max(4, (box.right - box.left) * W);
      const bh = Math.max(4, (box.bottom - box.top) * H);
      ctx.fillStyle = isSel ? 'rgba(255, 204, 0, 0.24)' : 'rgba(56, 189, 248, 0.14)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = isSel ? '#FFCC00' : color;
      ctx.lineWidth = isSel ? 2 : 1.4;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = isSel ? '#FFCC00' : color;
      ctx.font = 'bold 9px Consolas, monospace';
      ctx.fillText(sp.track.primaryClass, bx, Math.max(10, by - 3));
    });
  }, [activeAtPlayhead, currentSec, selectedTrack?.uid]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground2,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '6px 12px',
          backgroundColor: tokens.colorNeutralBackground3,
          borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(
            [
              { id: 'relative', label: 'Relative' },
              { id: 't0', label: 't = 0s' },
              { id: 'wall', label: 'Wall-Clock' },
            ] as Array<{ id: TimelineAlignMode; label: string }>
          ).map((m) => (
            <Button
              key={m.id}
              size="small"
              appearance={alignMode === m.id ? 'primary' : 'subtle'}
              onClick={() => setAlignMode(m.id)}
            >
              {m.label}
            </Button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '180px', maxWidth: '380px' }}>
          <Button
            size="small"
            appearance="primary"
            icon={isPlaying ? <PauseRegular /> : <PlayRegular />}
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
          />
          <Slider
            style={{ flex: 1 }}
            min={0}
            max={1000}
            step={5}
            value={playheadPct}
            onChange={(_, d) => {
              setIsPlaying(false);
              setPlayheadPct(d.value);
            }}
          />
          <Text size={100} style={{ fontFamily: 'Consolas, monospace', minWidth: '78px', textAlign: 'right' }}>
            {currentSec.toFixed(1)}s / {timelineData.totalWindowSec.toFixed(1)}s
          </Text>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(
            [
              { id: 'individual', label: 'Tracks' },
              { id: 'class', label: 'By Class' },
              { id: 'channel', label: 'By Ch' },
            ] as Array<{ id: GroupMode; label: string }>
          ).map((g) => (
            <Button
              key={g.id}
              size="small"
              appearance={groupMode === g.id ? 'primary' : 'subtle'}
              onClick={() => setGroupMode(g.id)}
            >
              {g.label}
            </Button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '10px', padding: '8px 12px', alignItems: 'stretch' }}>
        <div
          className={scrollStyles.scrollable}
          style={{
            maxHeight: '165px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
        >
          {groupedSpans.map((grp) => (
            <React.Fragment key={grp.label}>
              {groupMode !== 'individual' && (
                <Text size={100} style={{ textTransform: 'uppercase', color: tokens.colorNeutralForeground3, fontWeight: 600 }}>
                  {grp.label} ({grp.items.length})
                </Text>
              )}
              {grp.items.map((sp) => {
                const rawLeftPct = (sp.startOffsetSec / timelineData.totalWindowSec) * 100;
                const rawWidthPct = ((sp.endOffsetSec - sp.startOffsetSec) / timelineData.totalWindowSec) * 100;
                const widthPct = Math.min(100, Math.max(2.5, rawWidthPct));
                const leftPct = Math.max(0, Math.min(100 - widthPct, rawLeftPct));
                const color = getClassStrokeColor(sp.track.primaryClass);
                const isSel = selectedTrack?.uid === sp.track.uid;
                const snapLeftPct =
                  sp.snapshotOffsetSec !== null
                    ? (sp.snapshotOffsetSec / timelineData.totalWindowSec) * 100
                    : null;

                return (
                  <div
                    key={sp.track.uid}
                    style={{ display: 'grid', gridTemplateColumns: '115px 1fr', alignItems: 'center', gap: '6px' }}
                  >
                    <div
                      onClick={() => onSelectTrack(sp.track.uid)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', overflow: 'hidden' }}
                    >
                      <Badge size="small" appearance={isSel ? 'filled' : 'tint'} color={getClassBadgeColor(sp.track.primaryClass)}>
                        {sp.track.primaryClass}
                      </Badge>
                      <Text size={100} style={{ fontFamily: 'Consolas, monospace', color: isSel ? '#FFCC00' : tokens.colorNeutralForeground3 }}>
                        {sp.track.trackId.slice(0, 5)}
                      </Text>
                    </div>
                    <div
                      onClick={(e) => {
                        onSelectTrack(sp.track.uid);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        setPlayheadPct(Math.round(frac * 1000));
                      }}
                      style={{
                        position: 'relative',
                        height: '20px',
                        backgroundColor: tokens.colorNeutralBackground1,
                        borderRadius: '3px',
                        border: isSel ? '1px solid #FFCC00' : `1px solid ${tokens.colorNeutralStroke2}`,
                        overflow: 'hidden',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          width: `${Math.min(100 - leftPct, widthPct)}%`,
                          top: '2px',
                          bottom: '2px',
                          borderRadius: '2px',
                          backgroundColor: color,
                          opacity: isSel ? 1 : 0.82,
                          fontSize: '10px',
                          fontWeight: 600,
                          color: '#0b1118',
                          padding: '0 4px',
                          display: 'flex',
                          alignItems: 'center',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                        }}
                      >
                        {sp.track.durationSec.toFixed(1)}s
                      </div>
                      {snapLeftPct !== null && (
                        <div
                          title="Snapshot capture timestamp"
                          style={{
                            position: 'absolute',
                            left: `${snapLeftPct}%`,
                            top: '50%',
                            width: '7px',
                            height: '7px',
                            backgroundColor: '#ffffff',
                            border: '1.5px solid #0b1118',
                            transform: 'translate(-50%, -50%) rotate(45deg)',
                            pointerEvents: 'none',
                          }}
                        />
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${playheadPct / 10}%`,
                          top: 0,
                          bottom: 0,
                          width: '2px',
                          backgroundColor: '#FFCC00',
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text size={100} weight="semibold" style={{ color: tokens.colorNeutralForeground3, textTransform: 'uppercase' }}>
              Concurrent Scene
            </Text>
            <Badge size="small" appearance="filled" color={activeAtPlayhead.length > 0 ? 'brand' : 'subtle'}>
              {activeAtPlayhead.length} active
            </Badge>
          </div>
          <canvas
            ref={miniCanvasRef}
            width={240}
            height={135}
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              backgroundColor: '#0c1219',
              borderRadius: '4px',
              border: `1px solid ${tokens.colorNeutralStroke1}`,
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
};

const SessionSummaryDrawer: React.FC<{
  tracks: NormalizedTrackRecord[];
  activeClassFilter: string;
  activeColorFilter: string | null;
  onToggleClass: (cls: string) => void;
  onToggleColor: (col: string | null) => void;
}> = ({ tracks, activeClassFilter, activeColorFilter, onToggleClass, onToggleColor }) => {
  const stats = useMemo(() => {
    const total = tracks.length;
    const totalDur = tracks.reduce((s, t) => s + Math.max(0, t.durationSec), 0);
    const totalBytes = tracks.reduce((s, t) => s + t.packetBytes, 0);
    const metaBytes = tracks.reduce((s, t) => s + t.metadataBytes, 0);
    const snapBytes = tracks.reduce((s, t) => s + t.snapshotBase64Bytes, 0);
    const h264Bytes = Math.max(1, Math.round(Math.max(0.5, totalDur) * ((4.0 * 1_000_000) / 8)));
    const savingsPct = totalBytes < h264Bytes ? (1 - totalBytes / h264Bytes) * 100 : 0;

    const classMap = new Map<string, number>();
    const colorMap = new Map<string, { name: string; hex: string; scoreSum: number; count: number }>();

    tracks.forEach((t) => {
      classMap.set(t.primaryClass, (classMap.get(t.primaryClass) || 0) + 1);
      const seen = new Set<string>();
      extractTrackColorEntries(t)
        .filter((e) => e.score >= 0.18)
        .forEach((e) => {
          const cur = colorMap.get(e.name) || { name: e.name, hex: e.hex, scoreSum: 0, count: 0 };
          if (!seen.has(e.name)) {
            cur.count += 1;
            seen.add(e.name);
          }
          cur.scoreSum += e.score;
          colorMap.set(e.name, cur);
        });
    });

    const classDist = Array.from(classMap.entries())
      .map(([name, count]) => ({ name, count, pct: total > 0 ? (count / total) * 100 : 0, color: getClassStrokeColor(name) }))
      .sort((a, b) => b.count - a.count);
    const colorDist = Array.from(colorMap.values()).sort((a, b) => b.scoreSum - a.scoreSum).slice(0, 5);

    return { total, totalBytes, metaBytes, snapBytes, h264Bytes, savingsPct, classDist, colorDist };
  }, [tracks]);

  const maxColorScore = Math.max(0.1, ...stats.colorDist.map((c) => c.scoreSum));
  const r = 30;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '10px',
        padding: '10px 12px',
        backgroundColor: tokens.colorNeutralBackground3,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
        flexShrink: 0,
      }}
    >
      {/* Class Mix Card */}
      <div
        style={{
          backgroundColor: tokens.colorNeutralBackground2,
          border: `1px solid ${tokens.colorNeutralStroke2}`,
          borderRadius: '6px',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: 0,
        }}
      >
        <svg width="76" height="76" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="11" />
          {stats.classDist.map((seg) => {
            const len = stats.total > 0 ? (seg.count / stats.total) * circ : 0;
            const el = (
              <circle
                key={seg.name}
                cx="40"
                cy="40"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="11"
                strokeDasharray={`${len.toFixed(2)} ${(circ - len).toFixed(2)}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 40 40)"
                style={{ cursor: 'pointer' }}
                onClick={() => onToggleClass(seg.name)}
              />
            );
            offset += len;
            return el;
          })}
          <text x="40" y="44" textAnchor="middle" fontSize="13" fontWeight="bold" fill="currentColor" fontFamily="Consolas, monospace">
            {stats.total}
          </text>
        </svg>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <Text size={100} weight="semibold" style={{ textTransform: 'uppercase', color: tokens.colorNeutralForeground3 }}>
            Class Mix
          </Text>
          {stats.classDist.slice(0, 4).map((c) => {
            const active = activeClassFilter.toLowerCase() === c.name.toLowerCase();
            return (
              <div
                key={c.name}
                onClick={() => onToggleClass(active ? 'all' : c.name)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: active ? 700 : 400,
                  color: active ? '#FFCC00' : tokens.colorNeutralForeground1,
                }}
              >
                <span>● {c.name}</span>
                <span style={{ fontFamily: 'Consolas, monospace' }}>{c.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Color DNA Card */}
      <div
        style={{
          backgroundColor: tokens.colorNeutralBackground2,
          border: `1px solid ${tokens.colorNeutralStroke2}`,
          borderRadius: '6px',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: 0,
        }}
      >
        <Text size={100} weight="semibold" style={{ textTransform: 'uppercase', color: tokens.colorNeutralForeground3 }}>
          Top Color DNA Matrix
        </Text>
        {stats.colorDist.map((col) => {
          const active = activeColorFilter === col.name;
          return (
            <div
              key={col.name}
              onClick={() => onToggleColor(active ? null : col.name)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px' }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: col.hex,
                  border: '1px solid rgba(148,163,184,0.5)',
                  flexShrink: 0,
                }}
              />
              <span style={{ width: '48px', textTransform: 'capitalize', fontWeight: active ? 700 : 400, color: active ? '#FFCC00' : undefined }}>
                {col.name}
              </span>
              <div style={{ flex: 1, height: '5px', backgroundColor: tokens.colorNeutralBackground1, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${(col.scoreSum / maxColorScore) * 100}%`, height: '100%', backgroundColor: col.hex }} />
              </div>
              <span style={{ fontFamily: 'Consolas, monospace', fontSize: '10px' }}>{col.count}</span>
            </div>
          );
        })}
      </div>

      {/* Session Payload Split & Video Savings */}
      <div
        style={{
          backgroundColor: tokens.colorNeutralBackground2,
          border: `1px solid ${tokens.colorNeutralStroke2}`,
          borderRadius: '6px',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '6px',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text size={100} weight="semibold" style={{ textTransform: 'uppercase', color: tokens.colorNeutralForeground3 }}>
            Payload Split
          </Text>
          <Badge size="small" appearance="tint" color="success">
            {stats.savingsPct.toFixed(2)}% saved vs H.264
          </Badge>
        </div>
        <div style={{ display: 'flex', height: '10px', borderRadius: '4px', overflow: 'hidden', border: `1px solid ${tokens.colorNeutralStroke2}` }}>
          <div
            style={{
              width: `${stats.totalBytes > 0 ? (stats.metaBytes / stats.totalBytes) * 100 : 100}%`,
              backgroundColor: '#22c55e',
            }}
            title="JSON Metadata Bytes"
          />
          <div
            style={{
              width: `${stats.totalBytes > 0 ? (stats.snapBytes / stats.totalBytes) * 100 : 0}%`,
              backgroundColor: '#FFCC00',
            }}
            title="Base64 JPEG Bytes"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'Consolas, monospace' }}>
          <span style={{ color: '#22c55e' }}>JSON: {formatBytes(stats.metaBytes)}</span>
          <span style={{ color: '#FFCC00' }}>JPG: {formatBytes(stats.snapBytes)}</span>
        </div>
        <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
          Total {formatBytes(stats.totalBytes)} vs {formatBytes(stats.h264Bytes)} (1080p H.264)
        </Text>
      </div>
    </div>
  );
};

export interface ForensicGalleryViewProps {
  tracks: NormalizedTrackRecord[];
  selectedTrack: NormalizedTrackRecord | null;
  onSelectTrack: (uid: string) => void;
  onOpenInWorkbench: (uid: string) => void;
}

export const ForensicGalleryView: React.FC<ForensicGalleryViewProps> = ({
  tracks,
  selectedTrack,
  onSelectTrack,
  onOpenInWorkbench,
}) => {
  const styles = useStyles();
  const scrollStyles = useCustomScrollbars();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [colorScope, setColorScope] = useState<ScopeFilter>('all');
  const [minConfidencePct, setMinConfidencePct] = useState<number>(0);
  const [channelFilter, setChannelFilter] = useState<number | 'all'>('all');
  const [onlySnapshots, setOnlySnapshots] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [pinnedUids, setPinnedUids] = useState<string[]>([]);
  const [topDrawerMode, setTopDrawerMode] = useState<TopDrawerMode>('none');
  const [copiedClipQuery, setCopiedClipQuery] = useState<boolean>(false);

  const trackColorMap = useMemo(() => {
    const map = new Map<string, TrackColorEntry[]>();
    tracks.forEach((t) => {
      map.set(t.uid, extractTrackColorEntries(t));
    });
    return map;
  }, [tracks]);

  const classCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tracks.forEach((t) => {
      const c = t.primaryClass || 'unknown';
      counts.set(c, (counts.get(c) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [tracks]);

  const channelOptions = useMemo(() => {
    const set = new Set<number>();
    tracks.forEach((t) => set.add(t.channelId));
    return Array.from(set).sort((a, b) => a - b);
  }, [tracks]);

  const paletteSwatches = useMemo(() => {
    const stats = new Map<string, { name: string; hex: string; count: number }>();
    tracks.forEach((t) => {
      const entries = trackColorMap.get(t.uid) || [];
      const seenInTrack = new Set<string>();
      entries.forEach((e) => {
        if (colorScope !== 'all' && e.scope !== colorScope) return;
        if (e.score < 0.15) return;
        if (seenInTrack.has(e.name)) return;
        seenInTrack.add(e.name);
        const cur = stats.get(e.name);
        if (cur) cur.count += 1;
        else stats.set(e.name, { name: e.name, hex: e.hex, count: 1 });
      });
    });
    return Array.from(stats.values()).sort((a, b) => b.count - a.count);
  }, [tracks, trackColorMap, colorScope]);

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = tracks.filter((t) => {
      if (onlySnapshots && !t.snapshot?.data) return false;
      if (channelFilter !== 'all' && t.channelId !== channelFilter) return false;
      if (Math.round(t.primaryConfidence * 100) < minConfidencePct) return false;
      if (classFilter !== 'all' && t.primaryClass.toLowerCase() !== classFilter.toLowerCase()) {
        return false;
      }
      if (selectedColor) {
        const entries = trackColorMap.get(t.uid) || [];
        const hasMatch = entries.some(
          (e) =>
            e.name === selectedColor &&
            e.score >= 0.15 &&
            (colorScope === 'all' || e.scope === colorScope)
        );
        if (!hasMatch) return false;
      }
      if (q) {
        const colors = (trackColorMap.get(t.uid) || []).map((c) => c.name).join(' ');
        const hay = [
          t.trackId,
          t.primaryClass,
          `ch${t.channelId}`,
          t.mqttTopic || '',
          colors,
          ...t.secondaryClasses.map((s) => s.type),
          ...t.attributesSummary.map((a) => `${a.key}:${a.value}`),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'newest') return list;
    return [...list].sort((a, b) => {
      if (sortBy === 'confidence') return b.primaryConfidence - a.primaryConfidence;
      if (sortBy === 'duration') return b.durationSec - a.durationSec;
      if (sortBy === 'displacement') return b.displacementNormalized - a.displacementNormalized;
      if (sortBy === 'size') return b.packetBytes - a.packetBytes;
      return 0;
    });
  }, [
    tracks,
    onlySnapshots,
    channelFilter,
    minConfidencePct,
    classFilter,
    selectedColor,
    colorScope,
    trackColorMap,
    searchQuery,
    sortBy,
  ]);

  const pinnedTracks = useMemo(
    () => pinnedUids.map((uid) => tracks.find((t) => t.uid === uid)).filter((t): t is NormalizedTrackRecord => Boolean(t)),
    [pinnedUids, tracks]
  );

  const togglePin = (uid: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPinnedUids((prev) => {
      if (prev.includes(uid)) return prev.filter((id) => id !== uid);
      if (prev.length >= 3) return [...prev.slice(1), uid];
      return [...prev, uid];
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setClassFilter('all');
    setSelectedColor(null);
    setColorScope('all');
    setMinConfidencePct(0);
    setChannelFilter('all');
    setOnlySnapshots(false);
  };

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (classFilter !== 'all' ? 1 : 0) +
    (selectedColor ? 1 : 0) +
    (minConfidencePct > 0 ? 1 : 0) +
    (channelFilter !== 'all' ? 1 : 0) +
    (onlySnapshots ? 1 : 0);

  const inspectedTrack = selectedTrack ?? filteredTracks[0] ?? null;
  const comparing = pinnedTracks.length >= 2;

  const handleCopyClipQuery = () => {
    if (!inspectedTrack) return;
    const query = {
      channel_id: inspectedTrack.channelId,
      start_time: inspectedTrack.startTime,
      end_time: inspectedTrack.endTime,
      track_id: inspectedTrack.trackId,
    };
    navigator.clipboard?.writeText(JSON.stringify(query, null, 2));
    setCopiedClipQuery(true);
    window.setTimeout(() => setCopiedClipQuery(false), 1800);
  };

  return (
    <div className={styles.root}>
      {/* Left Forensic Facet Sidebar */}
      <aside className={mergeClasses(styles.sidebar, scrollStyles.scrollable)}>
        <div className={styles.sectionLabelRow}>
          <Text weight="semibold" size={300}>
            Forensic Filters
          </Text>
          {activeFilterCount > 0 && (
            <Button size="small" appearance="subtle" onClick={resetFilters}>
              Reset ({activeFilterCount})
            </Button>
          )}
        </div>

        <Input
          size="small"
          contentBefore={<SearchRegular />}
          contentAfter={
            searchQuery ? (
              <Button
                appearance="transparent"
                size="small"
                icon={<DismissRegular />}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              />
            ) : undefined
          }
          placeholder="ID, class, color, topic..."
          value={searchQuery}
          onChange={(_, d) => setSearchQuery(d.value)}
        />

        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>Object Class</span>
          <div className={styles.chipGroup}>
            <Button
              size="small"
              appearance={classFilter === 'all' ? 'primary' : 'outline'}
              onClick={() => setClassFilter('all')}
            >
              All ({tracks.length})
            </Button>
            {classCounts.map(([cls, count]) => (
              <Button
                key={cls}
                size="small"
                appearance={classFilter.toLowerCase() === cls.toLowerCase() ? 'primary' : 'outline'}
                onClick={() => setClassFilter((c) => (c.toLowerCase() === cls.toLowerCase() ? 'all' : cls))}
              >
                {cls} ({count})
              </Button>
            ))}
          </div>
        </div>

        <div className={styles.sectionBlock}>
          <div className={styles.sectionLabelRow}>
            <span className={styles.sectionLabel}>Color DNA Swatches</span>
            {selectedColor && (
              <Button size="small" appearance="transparent" onClick={() => setSelectedColor(null)}>
                Clear
              </Button>
            )}
          </div>
          <div className={styles.chipGroup}>
            {(
              [
                { id: 'all', label: 'Any' },
                { id: 'object', label: 'Object' },
                { id: 'upper', label: 'Upper' },
                { id: 'lower', label: 'Lower' },
              ] as Array<{ id: ScopeFilter; label: string }>
            ).map((sc) => (
              <Button
                key={sc.id}
                size="small"
                appearance={colorScope === sc.id ? 'primary' : 'subtle'}
                onClick={() => setColorScope(sc.id)}
              >
                {sc.label}
              </Button>
            ))}
          </div>
          {paletteSwatches.length > 0 ? (
            <div className={styles.swatchGrid}>
              {paletteSwatches.map((sw) => {
                const active = selectedColor === sw.name;
                return (
                  <button
                    key={sw.name}
                    type="button"
                    className={mergeClasses(styles.swatchBtn, active && styles.swatchBtnActive)}
                    onClick={() => setSelectedColor(active ? null : sw.name)}
                    title={`Filter by ${sw.name} (${sw.count} tracks)`}
                  >
                    <span className={styles.swatchDot} style={{ backgroundColor: sw.hex }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sw.name} ({sw.count})
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              No color attributes in current scope.
            </Text>
          )}
        </div>

        <div className={styles.sectionBlock}>
          <div className={styles.sectionLabelRow}>
            <span className={styles.sectionLabel}>Min Confidence</span>
            <Text size={200} className={styles.mono}>
              {minConfidencePct}%
            </Text>
          </div>
          <Slider
            min={0}
            max={90}
            step={5}
            value={minConfidencePct}
            onChange={(_, d) => setMinConfidencePct(d.value)}
          />
        </div>

        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>Channel</span>
          <div className={styles.chipGroup}>
            <Button
              size="small"
              appearance={channelFilter === 'all' ? 'primary' : 'outline'}
              onClick={() => setChannelFilter('all')}
            >
              All Ch
            </Button>
            {channelOptions.map((ch) => (
              <Button
                key={ch}
                size="small"
                appearance={channelFilter === ch ? 'primary' : 'outline'}
                onClick={() => setChannelFilter((c) => (c === ch ? 'all' : ch))}
              >
                Ch {ch}
              </Button>
            ))}
          </div>
        </div>

        <Switch
          label="Only tracks with Snapshot JPG"
          checked={onlySnapshots}
          onChange={(_, d) => setOnlySnapshots(d.checked)}
        />

        <div className={styles.sectionBlock}>
          <span className={styles.sectionLabel}>Sort Order</span>
          <select
            className={styles.nativeSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort tracks"
          >
            <option value="newest">Arrival Order (Newest First)</option>
            <option value="confidence">Primary Class Confidence</option>
            <option value="duration">Track Duration</option>
            <option value="displacement">Scene Displacement</option>
            <option value="size">Packet Byte Size</option>
          </select>
        </div>
      </aside>

      {/* Center Card Gallery */}
      <section className={styles.mainArea}>
        <div className={styles.gridHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Text weight="semibold">Session & Attribute Explorer</Text>
            <Badge appearance="tint" color="brand">
              {filteredTracks.length} / {tracks.length} tracks
            </Badge>
            {selectedColor && (
              <Badge appearance="outline" color="informative">
                Color: {selectedColor}
              </Badge>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <Button
              size="small"
              appearance={topDrawerMode === 'none' ? 'primary' : 'outline'}
              icon={<GridRegular />}
              onClick={() => setTopDrawerMode('none')}
            >
              Cards Only
            </Button>
            <Button
              size="small"
              appearance={topDrawerMode === 'timeline' ? 'primary' : 'outline'}
              icon={<TimelineRegular />}
              onClick={() => setTopDrawerMode((m) => (m === 'timeline' ? 'none' : 'timeline'))}
            >
              Show Timeline Swimlanes
            </Button>
            <Button
              size="small"
              appearance={topDrawerMode === 'summary' ? 'primary' : 'outline'}
              icon={<DataBarVerticalRegular />}
              onClick={() => setTopDrawerMode((m) => (m === 'summary' ? 'none' : 'summary'))}
            >
              Show Session Summary
            </Button>
            <span style={{ width: '1px', height: '18px', backgroundColor: tokens.colorNeutralStroke2, margin: '0 2px' }} />
            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
              Pinned: {pinnedTracks.length}/3
            </Text>
            {pinnedTracks.length > 0 && (
              <Button size="small" appearance="subtle" onClick={() => setPinnedUids([])}>
                Clear Pins
              </Button>
            )}
          </div>
        </div>

        {topDrawerMode === 'timeline' && filteredTracks.length > 0 && (
          <SessionTimelineDrawer
            tracks={filteredTracks}
            selectedTrack={inspectedTrack}
            onSelectTrack={onSelectTrack}
          />
        )}

        {topDrawerMode === 'summary' && filteredTracks.length > 0 && (
          <SessionSummaryDrawer
            tracks={filteredTracks}
            activeClassFilter={classFilter}
            activeColorFilter={selectedColor}
            onToggleClass={(cls) => setClassFilter(cls)}
            onToggleColor={(col) => setSelectedColor(col)}
          />
        )}

        <div className={mergeClasses(styles.cardScroll, scrollStyles.scrollable)}>
          {filteredTracks.length === 0 ? (
            <EmptyView
              illustration={<FilterRegular fontSize={36} />}
              title="No matching tracks in Gallery"
              description="Try clearing the color swatch or lowering the minimum confidence slider."
              action={
                <Button appearance="secondary" size="small" onClick={resetFilters}>
                  Reset Forensic Filters
                </Button>
              }
            />
          ) : (
            <div className={styles.cardGrid}>
              {filteredTracks.map((trk) => {
                const isSelected = inspectedTrack?.uid === trk.uid;
                const isPinned = pinnedUids.includes(trk.uid);
                const imgSrc = getSnapshotSrc(trk.snapshot);
                const colors = (trackColorMap.get(trk.uid) || []).filter((c) => c.score >= 0.18).slice(0, 3);
                const confPct = Math.round(trk.primaryConfidence * 100);

                return (
                  <div
                    key={trk.uid}
                    className={mergeClasses(styles.card, isSelected && styles.cardSelected)}
                    onClick={() => onSelectTrack(trk.uid)}
                  >
                    <div className={styles.mediaStage}>
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={`${trk.primaryClass} snapshot`}
                          className={styles.mediaImg}
                        />
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#64748b',
                          }}
                        >
                          <CameraOffRegular fontSize={26} />
                          <Text size={200}>No Inline Snapshot</Text>
                        </div>
                      )}

                      <div className={styles.overlayTopLeft}>
                        <Badge appearance="filled" size="small">
                          Ch {trk.channelId}
                        </Badge>
                        <Badge appearance="tint" size="small" color="informative">
                          {trk.durationSec.toFixed(1)}s
                        </Badge>
                      </div>

                      <div style={{ position: 'absolute', top: '6px', right: '6px' }}>
                        <Tooltip
                          content={isPinned ? 'Unpin from comparison' : 'Pin to compare (up to 3)'}
                          relationship="label"
                        >
                          <Button
                            size="small"
                            appearance={isPinned ? 'primary' : 'secondary'}
                            icon={isPinned ? <PinOffRegular /> : <PinRegular />}
                            onClick={(e) => togglePin(trk.uid, e)}
                          />
                        </Tooltip>
                      </div>

                      <div className={styles.overlayBottomRight} title="Scene trajectory preview">
                        <SparklineTrajectory track={trk} />
                      </div>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.cardTitleRow}>
                        <Badge
                          appearance="filled"
                          color={getClassBadgeColor(trk.primaryClass)}
                          icon={getClassIcon(trk.primaryClass)}
                        >
                          {trk.primaryClass} {confPct}%
                        </Badge>
                        <Text size={200} className={styles.mono} style={{ color: tokens.colorNeutralForeground3 }}>
                          {trk.trackId.slice(0, 8)}
                        </Text>
                      </div>

                      <div className={styles.confidenceTrack}>
                        <div className={styles.confidenceFill} style={{ width: `${Math.min(100, confPct)}%` }} />
                      </div>

                      {trk.secondaryClasses.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {trk.secondaryClasses.slice(0, 2).map((sc, idx) => (
                            <Badge key={idx} size="small" appearance="outline">
                              {sc.type} {Math.round(sc.confidence * 100)}%
                            </Badge>
                          ))}
                        </div>
                      )}

                      {colors.length > 0 && (
                        <div className={styles.colorStrip}>
                          {colors.map((c, idx) => (
                            <span key={`${c.scope}-${c.name}-${idx}`} className={styles.colorChip}>
                              <span
                                className={styles.swatchDot}
                                style={{ width: '9px', height: '9px', backgroundColor: c.hex }}
                              />
                              {c.scope === 'upper' ? 'Up:' : c.scope === 'lower' ? 'Lo:' : ''}
                              {c.name} {Math.round(c.score * 100)}%
                            </span>
                          ))}
                        </div>
                      )}

                      <div className={styles.cardMetaRow}>
                        <span>{trk.observations.length} pts</span>
                        <span>{headingToCompassLabel(trk.headingDegrees)} ({Math.round(trk.headingDegrees)}°)</span>
                        <span>{formatBytes(trk.packetBytes)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Right Forensic Inspector or Comparison Drawer */}
      <aside className={mergeClasses(styles.inspector, comparing && styles.inspectorCompare)}>
        <div className={styles.inspectorHeader}>
          <Text weight="semibold">
            {comparing ? `Compare Pinned (${pinnedTracks.length})` : 'Forensic Inspector'}
          </Text>
          {comparing ? (
            <Button size="small" appearance="subtle" onClick={() => setPinnedUids([])}>
              Exit Compare
            </Button>
          ) : (
            inspectedTrack && (
              <Button
                size="small"
                appearance="primary"
                icon={<OpenRegular />}
                onClick={() => onOpenInWorkbench(inspectedTrack.uid)}
              >
                Open in Workbench
              </Button>
            )
          )}
        </div>

        <div className={mergeClasses(styles.inspectorScroll, scrollStyles.scrollable)}>
          {comparing ? (
            <div
              className={styles.compareGrid}
              style={{ gridTemplateColumns: `repeat(${pinnedTracks.length}, minmax(0, 1fr))` }}
            >
              {pinnedTracks.map((pt) => {
                const src = getSnapshotSrc(pt.snapshot);
                const cols = (trackColorMap.get(pt.uid) || []).slice(0, 3);
                return (
                  <div key={pt.uid} className={styles.compareCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text size={200} weight="semibold" className={styles.mono}>
                        {pt.trackId.slice(0, 8)}
                      </Text>
                      <Button
                        size="small"
                        appearance="transparent"
                        icon={<DismissRegular />}
                        onClick={() => togglePin(pt.uid)}
                        aria-label="Unpin track"
                      />
                    </div>
                    <div
                      style={{
                        height: '92px',
                        backgroundColor: '#0d131a',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {src ? (
                        <img src={src} alt={pt.primaryClass} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      ) : (
                        <CameraOffRegular fontSize={20} style={{ color: '#64748b' }} />
                      )}
                    </div>
                    <Badge appearance="filled" color={getClassBadgeColor(pt.primaryClass)}>
                      {pt.primaryClass} {Math.round(pt.primaryConfidence * 100)}%
                    </Badge>
                    <Text size={100} className={styles.mono}>
                      Ch {pt.channelId} • {pt.durationSec.toFixed(2)}s
                    </Text>
                    <Text size={100} className={styles.mono}>
                      Dist: {pt.pathLengthNormalized.toFixed(3)}u
                    </Text>
                    <Text size={100} className={styles.mono}>
                      Heading: {Math.round(pt.headingDegrees)}°
                    </Text>
                    <Text size={100} className={styles.mono}>
                      Size: {formatBytes(pt.packetBytes)}
                    </Text>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                      {cols.map((c, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                          <span className={styles.swatchDot} style={{ width: '8px', height: '8px', backgroundColor: c.hex }} />
                          <span>
                            {c.name} ({Math.round(c.score * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button
                      size="small"
                      appearance="outline"
                      onClick={() => onOpenInWorkbench(pt.uid)}
                    >
                      Workbench
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : inspectedTrack ? (
            <>
              <div
                style={{
                  backgroundColor: '#0d131a',
                  borderRadius: tokens.borderRadiusSmall,
                  border: `1px solid ${tokens.colorNeutralStroke1}`,
                  height: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {getSnapshotSrc(inspectedTrack.snapshot) ? (
                  <img
                    src={getSnapshotSrc(inspectedTrack.snapshot)!}
                    alt={inspectedTrack.primaryClass}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                    <CameraOffRegular fontSize={28} />
                    <Text size={200}>No Snapshot JPEG</Text>
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: '6px', right: '6px' }}>
                  <Button
                    size="small"
                    appearance={pinnedUids.includes(inspectedTrack.uid) ? 'primary' : 'secondary'}
                    icon={pinnedUids.includes(inspectedTrack.uid) ? <PinOffRegular /> : <PinRegular />}
                    onClick={() => togglePin(inspectedTrack.uid)}
                  >
                    {pinnedUids.includes(inspectedTrack.uid) ? 'Pinned' : 'Pin'}
                  </Button>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <span className={styles.sectionLabel}>Track Identity & Motion</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: '12px' }}>
                  <span style={{ color: tokens.colorNeutralForeground3 }}>Track ID</span>
                  <span className={styles.mono}>{inspectedTrack.trackId}</span>
                  <span style={{ color: tokens.colorNeutralForeground3 }}>Time Span</span>
                  <span className={styles.mono}>
                    {inspectedTrack.startTime.slice(11, 21)} → {inspectedTrack.endTime.slice(11, 21)}
                  </span>
                  <span style={{ color: tokens.colorNeutralForeground3 }}>Duration / Pts</span>
                  <span className={styles.mono}>
                    {inspectedTrack.durationSec.toFixed(2)}s ({inspectedTrack.observations.length} pts)
                  </span>
                  <span style={{ color: tokens.colorNeutralForeground3 }}>Path / Disp</span>
                  <span className={styles.mono}>
                    {inspectedTrack.pathLengthNormalized.toFixed(3)}u / {inspectedTrack.displacementNormalized.toFixed(3)}u
                  </span>
                  <span style={{ color: tokens.colorNeutralForeground3 }}>First → Last Box</span>
                  <span className={styles.mono}>
                    {inspectedTrack.observations.length > 0
                      ? `(${getBoxCenter(inspectedTrack.observations[0].bounding_box).x.toFixed(2)}, ${getBoxCenter(inspectedTrack.observations[0].bounding_box).y.toFixed(2)}) → (${getBoxCenter(inspectedTrack.observations[inspectedTrack.observations.length - 1].bounding_box).x.toFixed(2)}, ${getBoxCenter(inspectedTrack.observations[inspectedTrack.observations.length - 1].bounding_box).y.toFixed(2)})`
                      : 'N/A'}
                  </span>
                  <span style={{ color: tokens.colorNeutralForeground3 }}>Payload</span>
                  <span className={styles.mono}>
                    {formatBytes(inspectedTrack.packetBytes)} (JSON {formatBytes(inspectedTrack.metadataBytes)})
                  </span>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <span className={styles.sectionLabel}>Class Candidate Distribution</span>
                {[
                  { type: inspectedTrack.primaryClass, confidence: inspectedTrack.primaryConfidence },
                  ...inspectedTrack.secondaryClasses,
                ].map((c, i) => {
                  const pct = Math.round(c.confidence * 100);
                  return (
                    <div key={`${c.type}-${i}`} className={styles.probBarRow}>
                      <div className={styles.probBarHeader}>
                        <span>{c.type}</span>
                        <span className={styles.mono}>{pct}%</span>
                      </div>
                      <div className={styles.probBarBg}>
                        <div
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            height: '100%',
                            backgroundColor: getClassStrokeColor(c.type),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.sectionBlock}>
                <span className={styles.sectionLabel}>Color Candidates</span>
                {(trackColorMap.get(inspectedTrack.uid) || []).length === 0 ? (
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    No color probability entries present.
                  </Text>
                ) : (
                  (trackColorMap.get(inspectedTrack.uid) || []).map((c, idx) => {
                    const pct = Math.round(c.score * 100);
                    return (
                      <div key={`${c.scope}-${c.name}-${idx}`} className={styles.probBarRow}>
                        <div className={styles.probBarHeader}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              className={styles.swatchDot}
                              style={{ width: '10px', height: '10px', backgroundColor: c.hex }}
                            />
                            {c.scope === 'upper'
                              ? 'Upper Clothing'
                              : c.scope === 'lower'
                                ? 'Lower Clothing'
                                : 'Object'}{' '}
                            · <strong>{c.name}</strong>
                          </span>
                          <span className={styles.mono}>{pct}%</span>
                        </div>
                        <div className={styles.probBarBg}>
                          <div
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              height: '100%',
                              backgroundColor: c.hex,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {inspectedTrack.snapshot && (
                <div className={styles.sectionBlock}>
                  <span className={styles.sectionLabel}>Snapshot Crop Metadata</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <Badge appearance="outline" icon={<CameraRegular />}>
                      {inspectedTrack.snapshot.id.slice(0, 14)}
                    </Badge>
                    <Badge appearance="outline">
                      L:{inspectedTrack.snapshot.crop_box.left.toFixed(2)} T:
                      {inspectedTrack.snapshot.crop_box.top.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              )}

              <div
                className={styles.sectionBlock}
                style={{
                  padding: '8px 10px',
                  borderRadius: tokens.borderRadiusSmall,
                  backgroundColor: tokens.colorNeutralBackground1,
                  border: `1px solid ${tokens.colorNeutralStroke2}`,
                  borderLeft: '3px solid #22c55e',
                }}
              >
                <span className={styles.sectionLabel}>Edge Recording Retrieval Window</span>
                <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                  Use these fields to fetch on-demand full video from the camera&apos;s edge SD card only when an incident requires PII.
                </Text>
                <div style={{ fontSize: '11px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px' }} className={styles.mono}>
                  <span style={{ color: tokens.colorNeutralForeground3 }}>channel_id:</span>
                  <span>{inspectedTrack.channelId}</span>
                  <span style={{ color: tokens.colorNeutralForeground3 }}>start_time:</span>
                  <span>{inspectedTrack.startTime}</span>
                  <span style={{ color: tokens.colorNeutralForeground3 }}>end_time:</span>
                  <span>{inspectedTrack.endTime}</span>
                </div>
                <Button
                  size="small"
                  appearance="secondary"
                  icon={copiedClipQuery ? <CheckmarkRegular /> : <CopyRegular />}
                  onClick={handleCopyClipQuery}
                >
                  {copiedClipQuery ? 'Copied Clip Query!' : 'Copy Clip Query JSON'}
                </Button>
              </div>
            </>
          ) : (
            <EmptyView title="No Track Selected" description="Click any card in the gallery to inspect." />
          )}
        </div>
      </aside>
    </div>
  );
};
