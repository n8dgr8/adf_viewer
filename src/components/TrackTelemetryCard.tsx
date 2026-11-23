import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Slider,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  CheckmarkRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  CopyRegular,
  PulseRegular,
} from '@fluentui/react-icons';
import { NormalizedTrackRecord } from '../types/adf';
import {
  computeObservationMetrics,
  extractTrackColorEntries,
  getClassStrokeColor,
} from './views/adfViewHelpers';

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
  headerToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    cursor: 'pointer',
    userSelect: 'none',
  },
  gridBody: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
  },
  subPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusSmall,
    minWidth: 0,
  },
  subHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    fontSize: '12px',
  },
  probBarBg: {
    height: '6px',
    borderRadius: '3px',
    backgroundColor: tokens.colorNeutralBackground3,
    overflow: 'hidden',
  },
  clipFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: '12px',
  },
  mono: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
  },
});

export interface TrackTelemetryCardProps {
  track: NormalizedTrackRecord;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const TrackTelemetryCard: React.FC<TrackTelemetryCardProps> = ({
  track,
  collapsed,
  onToggleCollapse,
}) => {
  const styles = useStyles();
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const isCollapsed = collapsed ?? internalCollapsed;
  const handleToggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed((c) => !c);
  };

  const [obsIndex, setObsIndex] = useState<number>(0);
  const [copiedClip, setCopiedClip] = useState<boolean>(false);

  useEffect(() => {
    setObsIndex(0);
    setCopiedClip(false);
  }, [track.uid]);

  const metrics = useMemo(() => computeObservationMetrics(track), [track]);
  const colorEntries = useMemo(() => extractTrackColorEntries(track), [track]);

  const clampedIdx = Math.min(obsIndex, Math.max(0, metrics.length - 1));
  const activePoint = metrics[clampedIdx] ?? null;

  const maxSpeed = Math.max(0.05, ...metrics.map((m) => m.speedUnitsPerSec));
  const avgSpeed =
    metrics.length > 1
      ? metrics.slice(1).reduce((s, m) => s + m.speedUnitsPerSec, 0) / (metrics.length - 1)
      : 0;
  const maxAreaPct = Math.max(0.5, ...metrics.map((m) => m.boxAreaPct));
  const maxAspect = Math.max(1, ...metrics.map((m) => m.aspectRatio));

  const handleCopyClipQuery = () => {
    const query = {
      channel_id: track.channelId,
      start_time: track.startTime,
      end_time: track.endTime,
      track_id: track.trackId,
    };
    navigator.clipboard?.writeText(JSON.stringify(query, null, 2));
    setCopiedClip(true);
    window.setTimeout(() => setCopiedClip(false), 1800);
  };

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
          <PulseRegular />
          <Text weight="semibold">Kinematics & Candidate Telemetry</Text>
          <Badge appearance="tint" color="informative">
            Avg {avgSpeed.toFixed(2)} u/s
          </Badge>
          {isCollapsed && (
            <Badge appearance="outline" size="small">
              {metrics.length} pts • Max Area {maxAreaPct.toFixed(1)}% •{' '}
              {1 + track.secondaryClasses.length} classes
            </Badge>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className={styles.gridBody}>
            {/* Left Chart: Instantaneous Speed Profile */}
            <div className={styles.subPanel}>
              <div className={styles.subHeader}>
                <Text weight="semibold" size={200}>
                  Instantaneous Speed
                </Text>
                <Badge appearance="outline" size="small">
                  {avgSpeed.toFixed(3)} u/s avg
                </Badge>
              </div>

              <svg width="100%" height="115" viewBox="0 0 300 115" style={{ display: 'block' }}>
                <line x1="28" y1="10" x2="28" y2="95" stroke="rgba(148,163,184,0.25)" />
                <line x1="28" y1="95" x2="292" y2="95" stroke="rgba(148,163,184,0.25)" />
                <text x="4" y="16" fontSize="9" fill="#94a3b8" fontFamily="Consolas, monospace">
                  {maxSpeed.toFixed(2)}
                </text>
                <text x="4" y="95" fontSize="9" fill="#94a3b8" fontFamily="Consolas, monospace">
                  0.00
                </text>
                {metrics.length > 1 &&
                  (() => {
                    const pts = metrics.map((m, i) => {
                      const x = 28 + (i / (metrics.length - 1)) * 260;
                      const y = 95 - (m.speedUnitsPerSec / maxSpeed) * 78;
                      return { x, y, m };
                    });
                    const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                    const area = `28,95 ${poly} ${pts[pts.length - 1].x.toFixed(1)},95`;
                    return (
                      <>
                        <polygon points={area} fill="rgba(255, 204, 0, 0.16)" />
                        <polyline fill="none" stroke="#FFCC00" strokeWidth="2" points={poly} />
                        {pts.map((p) => (
                          <circle
                            key={p.m.index}
                            cx={p.x}
                            cy={p.y}
                            r={p.m.index === clampedIdx ? 4.2 : 2.3}
                            fill={p.m.index === clampedIdx ? '#ffffff' : '#FFCC00'}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setObsIndex(p.m.index)}
                          />
                        ))}
                      </>
                    );
                  })()}
              </svg>

              {metrics.length > 1 && (
                <Slider
                  size="small"
                  min={0}
                  max={metrics.length - 1}
                  step={1}
                  value={clampedIdx}
                  onChange={(_, d) => setObsIndex(d.value)}
                />
              )}

              {activePoint && (
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}
                  className={styles.mono}
                >
                  <span>
                    Pt #{activePoint.index + 1} (+{activePoint.relSec.toFixed(2)}s)
                  </span>
                  <span style={{ color: '#FFCC00' }}>
                    {activePoint.speedUnitsPerSec.toFixed(3)} u/s
                  </span>
                </div>
              )}
            </div>

            {/* Middle Chart: BBox Scale & Aspect Ratio */}
            <div className={styles.subPanel}>
              <div className={styles.subHeader}>
                <Text weight="semibold" size={200}>
                  BBox Area % & Aspect (H/W)
                </Text>
                <Badge appearance="outline" size="small">
                  Perspective
                </Badge>
              </div>

              <svg width="100%" height="115" viewBox="0 0 300 115" style={{ display: 'block' }}>
                <line x1="28" y1="10" x2="28" y2="95" stroke="rgba(148,163,184,0.25)" />
                <line x1="28" y1="95" x2="292" y2="95" stroke="rgba(148,163,184,0.25)" />
                <text x="4" y="16" fontSize="9" fill="#38bdf8" fontFamily="Consolas, monospace">
                  {maxAreaPct.toFixed(1)}%
                </text>
                <text x="266" y="16" fontSize="9" fill="#22c55e" fontFamily="Consolas, monospace">
                  {maxAspect.toFixed(1)}×
                </text>
                {metrics.length > 1 &&
                  (() => {
                    const areaPts = metrics.map((m, i) => {
                      const x = 28 + (i / (metrics.length - 1)) * 260;
                      const y = 95 - (m.boxAreaPct / maxAreaPct) * 76;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    });
                    const aspectPts = metrics.map((m, i) => {
                      const x = 28 + (i / (metrics.length - 1)) * 260;
                      const y = 95 - (m.aspectRatio / maxAspect) * 76;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    });
                    const cursorX = 28 + (clampedIdx / Math.max(1, metrics.length - 1)) * 260;
                    return (
                      <>
                        <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={areaPts.join(' ')} />
                        <polyline
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="1.6"
                          strokeDasharray="4 3"
                          points={aspectPts.join(' ')}
                        />
                        <line x1={cursorX} y1="10" x2={cursorX} y2="95" stroke="rgba(255,204,0,0.65)" />
                      </>
                    );
                  })()}
              </svg>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#38bdf8' }}>
                  ● Area: {activePoint ? `${activePoint.boxAreaPct.toFixed(2)}%` : '—'}
                </span>
                <span style={{ color: '#22c55e' }}>
                  ┄ H/W: {activePoint ? `${activePoint.aspectRatio.toFixed(2)}×` : '—'}
                </span>
              </div>
              <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                Validates FOV sizing and perspective growth along the track path.
              </Text>
            </div>

            {/* Right Panel: Class & Color Candidate Probability Bars */}
            <div className={styles.subPanel} style={{ maxHeight: '215px', overflowY: 'auto' }}>
              <div className={styles.subHeader}>
                <Text weight="semibold" size={200}>
                  Class & Color Candidates
                </Text>
                <Badge appearance="outline" size="small">
                  {1 + track.secondaryClasses.length} cls
                </Badge>
              </div>

              {[
                { type: track.primaryClass, confidence: track.primaryConfidence },
                ...track.secondaryClasses,
              ].map((c, idx) => {
                const pct = Math.round(c.confidence * 100);
                return (
                  <div key={`${c.type}-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
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

              {colorEntries.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {colorEntries.slice(0, 6).map((col, i) => (
                    <span
                      key={`${col.scope}-${col.name}-${i}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '1px 6px',
                        borderRadius: '999px',
                        backgroundColor: tokens.colorNeutralBackground3,
                        border: `1px solid ${tokens.colorNeutralStroke2}`,
                        fontSize: '10px',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: col.hex,
                          border: '1px solid rgba(148,163,184,0.5)',
                        }}
                      />
                      {col.scope !== 'object' ? `${col.scope}:` : ''}
                      {col.name} {Math.round(col.score * 100)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.clipFooter}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Text weight="semibold" size={200}>
                Edge Recording Clip Window:
              </Text>
              <span className={styles.mono} style={{ color: tokens.colorNeutralForeground2 }}>
                ch={track.channelId} · {track.startTime} → {track.endTime}
              </span>
            </div>
            <Tooltip
              content="Copy { channel_id, start_time, end_time } for on-demand edge video retrieval"
              relationship="label"
            >
              <Button
                size="small"
                appearance="subtle"
                icon={copiedClip ? <CheckmarkRegular /> : <CopyRegular />}
                onClick={handleCopyClipQuery}
              >
                {copiedClip ? 'Copied Clip Query' : 'Copy Clip Query JSON'}
              </Button>
            </Tooltip>
          </div>
        </>
      )}
    </div>
  );
};
