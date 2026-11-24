import React, { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowDownloadRegular,
  ArrowResetRegular,
  CameraOffRegular,
  CameraRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  SparkleRegular,
  ZoomInRegular,
} from '@fluentui/react-icons';
import { EmptyView } from '@axiscommunications/fluent-empty-view';
import { NormalizedTrackRecord } from '../types/adf';
import { BrowserAiModal } from './BrowserAiModal';

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
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
  },
  body: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  imageFrame: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d131a',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusSmall,
    overflow: 'hidden',
    flexShrink: 0,
    userSelect: 'none',
    maxWidth: '100%',
  },
  imageFrameResizing: {
    border: '1px solid #FFCC00',
    boxShadow: '0 0 0 1px rgba(255, 204, 0, 0.35)',
  },
  snapshotImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
    pointerEvents: 'none',
    imageRendering: 'pixelated',
  },
  scaleOverlayBadge: {
    position: 'absolute',
    top: '6px',
    left: '6px',
    backgroundColor: 'rgba(13, 19, 26, 0.82)',
    color: '#FFCC00',
    border: '1px solid rgba(255, 204, 0, 0.35)',
    borderRadius: '4px',
    padding: '1px 6px',
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: '11px',
    pointerEvents: 'none',
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: '22px',
    height: '22px',
    cursor: 'nwse-resize',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: '3px',
    background:
      'linear-gradient(135deg, transparent 45%, rgba(15, 23, 42, 0.88) 48%)',
    touchAction: 'none',
    '&:hover': {
      background:
        'linear-gradient(135deg, transparent 40%, rgba(255, 204, 0, 0.25) 45%)',
    },
  },
  metaGrid: {
    flex: 1,
    minWidth: '210px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: tokens.spacingHorizontalM,
    rowGap: '6px',
    fontSize: tokens.fontSizeBase200,
  },
  metaLabel: {
    color: tokens.colorNeutralForeground3,
  },
  metaValue: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    color: tokens.colorNeutralForeground1,
    wordBreak: 'break-all',
  },
  attributesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    padding: `0 ${tokens.spacingHorizontalM} ${tokens.spacingVerticalS}`,
  },
});

const MIN_WIDTH = 64;
const MAX_WIDTH = 760;

export interface SnapshotCardProps {
  track: NormalizedTrackRecord;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SnapshotCard: React.FC<SnapshotCardProps> = ({
  track,
  collapsed,
  onToggleCollapse,
}) => {
  const styles = useStyles();
  const snap = track.snapshot;

  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const isCollapsed = collapsed ?? internalCollapsed;
  const handleToggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed((c) => !c);
  };

  const [naturalDims, setNaturalDims] = useState<{ w: number; h: number } | null>(
    null
  );
  // null means "render at 1.0x native pixel resolution"
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    aspect: number;
  } | null>(null);

  // Reset to 1.0x native resolution when switching tracks
  useEffect(() => {
    setCustomWidth(null);
    setNaturalDims(null);
  }, [track.uid]);

  const imgSrc = React.useMemo(() => {
    if (!snap?.data) return null;
    if (snap.data.startsWith('data:image/')) return snap.data;
    return `data:${snap.mime_type || 'image/jpeg'};base64,${snap.data}`;
  }, [snap]);

  const approxBytes = snap?.data ? Math.round((snap.data.length * 3) / 4) : 0;

  const nativeWidth = naturalDims?.w ?? snap?.width ?? 180;
  const nativeHeight = naturalDims?.h ?? snap?.height ?? 120;
  const aspectRatio =
    nativeWidth > 0 && nativeHeight > 0 ? nativeWidth / nativeHeight : 4 / 3;

  const frameWidth = customWidth ?? nativeWidth;
  const frameHeight = Math.max(48, Math.round(frameWidth / aspectRatio));
  const zoomFactor = nativeWidth > 0 ? frameWidth / nativeWidth : 1;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizing(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: frameWidth,
      aspect: aspectRatio,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing || !dragStartRef.current) return;
    const { startX, startY, startWidth, aspect } = dragStartRef.current;
    const dx = e.clientX - startX;
    const dy = (e.clientY - startY) * aspect;
    const delta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    const nextWidth = Math.max(
      MIN_WIDTH,
      Math.min(MAX_WIDTH, Math.round(startWidth + delta))
    );
    setCustomWidth(nextWidth);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsResizing(false);
    dragStartRef.current = null;
  };

  const handleDownloadJpg = () => {
    if (!imgSrc) return;
    const a = document.createElement('a');
    a.href = imgSrc;
    a.download = `snapshot-${track.trackId.slice(0, 8)}.jpg`;
    a.click();
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
          <CameraRegular />
          <Text weight="semibold">Best Snapshot (JPEG)</Text>
          {snap?.data ? (
            <Badge appearance="filled" color="brand">
              {(approxBytes / 1024).toFixed(1)} KB
            </Badge>
          ) : (
            <Badge appearance="outline" color="subtle">
              Not Attached
            </Badge>
          )}
          {isCollapsed && imgSrc && (
            <>
              <img
                src={imgSrc}
                alt={`Snapshot thumbnail for track ${track.trackId}`}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  if (el.naturalWidth && el.naturalHeight) {
                    setNaturalDims({ w: el.naturalWidth, h: el.naturalHeight });
                  }
                }}
                style={{
                  height: '22px',
                  width: 'auto',
                  borderRadius: '3px',
                  border: '1px solid rgba(255, 204, 0, 0.5)',
                  imageRendering: 'pixelated',
                  display: 'block',
                }}
              />
              <Badge appearance="outline" size="small">
                {nativeWidth}×{nativeHeight} px
              </Badge>
            </>
          )}
        </div>

        {!isCollapsed && imgSrc && (
          <div className={styles.headerActions}>
            <Tooltip
              content="Inspect snapshot attributes and scene anomalies using Chrome's built-in on-device LLM"
              relationship="label"
            >
              <Button
                size="small"
                appearance="primary"
                icon={<SparkleRegular />}
                onClick={() => setAiModalOpen(true)}
              >
                Analyze with Browser AI
              </Button>
            </Tooltip>

            <Tooltip
              content="Step up integer magnification (2×, 3×, 4× nearest-neighbor)"
              relationship="label"
            >
              <Button
                size="small"
                appearance="subtle"
                icon={<ZoomInRegular />}
                onClick={() => {
                  const nextMultiple = Math.min(
                    4,
                    Math.floor(zoomFactor + 0.05) + 1
                  );
                  setCustomWidth(
                    Math.min(MAX_WIDTH, Math.round(nativeWidth * nextMultiple))
                  );
                }}
              >
                {Math.min(4, Math.floor(zoomFactor + 0.05) + 1)}×
              </Button>
            </Tooltip>

            {customWidth !== null && customWidth !== nativeWidth && (
              <Tooltip content="Reset to 1.0× native 1:1 pixel resolution" relationship="label">
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<ArrowResetRegular />}
                  onClick={() => setCustomWidth(null)}
                >
                  1× Native
                </Button>
              </Tooltip>
            )}

            <Tooltip content="Download original unmodified JPEG bytes" relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowDownloadRegular />}
                onClick={handleDownloadJpg}
              >
                Save JPG
              </Button>
            </Tooltip>
          </div>
        )}
      </div>

      {!isCollapsed && (!snap || !imgSrc ? (
        <div style={{ minHeight: '160px', display: 'flex' }}>
          <EmptyView
            illustration={<CameraOffRegular fontSize={32} />}
            title="No Snapshot JPG Available"
            description={
              snap
                ? `Snapshot metadata reference (${snap.id}) is present, but no inline base64 JPEG data was included in this message.`
                : 'This object_track message was emitted without an attached best snapshot.'
            }
          />
        </div>
      ) : (
        <>
          <div className={styles.body}>
            <div
              className={`${styles.imageFrame} ${
                isResizing ? styles.imageFrameResizing : ''
              }`}
              style={{
                width: `${frameWidth}px`,
                height: `${frameHeight}px`,
              }}
            >
              <img
                src={imgSrc}
                alt={`Snapshot for track ${track.trackId}`}
                className={styles.snapshotImg}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  if (el.naturalWidth && el.naturalHeight) {
                    setNaturalDims({ w: el.naturalWidth, h: el.naturalHeight });
                  }
                }}
              />

              <span className={styles.scaleOverlayBadge}>
                {zoomFactor.toFixed(2)}× {zoomFactor === 1 ? '(1:1 Native)' : ''}
              </span>

              <Tooltip
                content="Drag to magnify raw pixels (double-click for 1:1 native resolution)"
                relationship="label"
              >
                <div
                  className={styles.resizeHandle}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onDoubleClick={() => setCustomWidth(null)}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12">
                    <path
                      d="M11 3L3 11M11 7L7 11M11 11L10 11"
                      stroke="#FFCC00"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </Tooltip>
            </div>

            <div className={styles.metaGrid}>
              <span className={styles.metaLabel}>Image ID:</span>
              <span className={styles.metaValue}>{snap.id}</span>

              <span className={styles.metaLabel}>Captured:</span>
              <span className={styles.metaValue}>{snap.timestamp}</span>

              <span className={styles.metaLabel}>Crop Box:</span>
              <span className={styles.metaValue}>
                L:{snap.crop_box.left.toFixed(4)} T:{snap.crop_box.top.toFixed(4)} R:
                {snap.crop_box.right.toFixed(4)} B:{snap.crop_box.bottom.toFixed(4)}
              </span>

              <span className={styles.metaLabel}>Native Size:</span>
              <span className={styles.metaValue}>
                {nativeWidth} × {nativeHeight} px ({snap.mime_type || 'image/jpeg'})
              </span>

              {snap.quality_score !== undefined && (
                <>
                  <span className={styles.metaLabel}>Quality Score:</span>
                  <span className={styles.metaValue}>
                    {(snap.quality_score * 100).toFixed(0)}%
                  </span>
                </>
              )}
            </div>
          </div>

          {track.attributesSummary.length > 0 && (
            <div className={styles.attributesRow}>
              {track.attributesSummary.map((attr, idx) => (
                <Badge key={idx} appearance="tint" color="informative">
                  {attr.key}: {attr.value}
                  {attr.confidence !== undefined
                    ? ` (${Math.round(attr.confidence * 100)}%)`
                    : ''}
                </Badge>
              ))}
            </div>
          )}
        </>
      ))}

      <BrowserAiModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        track={track}
      />
    </div>
  );
};
