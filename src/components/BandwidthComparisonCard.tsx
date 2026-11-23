import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ChevronDownRegular,
  ChevronRightRegular,
  DataBarVerticalRegular,
  InfoRegular,
} from '@fluentui/react-icons';
import { NormalizedTrackRecord } from '../types/adf';
import { formatBytes } from '../utils/adfParser';

type ScopeMode = 'selected' | 'stream';
type ResolutionKey = '720p' | '1080p' | '4k';

interface CodecPreset {
  id: 'av1' | 'h265' | 'h264';
  label: string;
  sublabel: string;
  mbps: number;
  barColor: string;
}

interface ResolutionProfile {
  key: ResolutionKey;
  label: string;
  dimensions: string;
  codecs: CodecPreset[];
}

const RESOLUTION_PROFILES: Record<ResolutionKey, ResolutionProfile> = {
  '720p': {
    key: '720p',
    label: '720p HD',
    dimensions: '1280×720 @ 30fps',
    codecs: [
      { id: 'av1', label: 'AV1 Video Clip', sublabel: '0.9 Mbps', mbps: 0.9, barColor: '#38bdf8' },
      { id: 'h265', label: 'H.265 (HEVC) Video Clip', sublabel: '1.25 Mbps', mbps: 1.25, barColor: '#a855f7' },
      { id: 'h264', label: 'H.264 (AVC) Video Clip', sublabel: '2.0 Mbps', mbps: 2.0, barColor: '#f97316' },
    ],
  },
  '1080p': {
    key: '1080p',
    label: '1080p Full HD',
    dimensions: '1920×1080 @ 30fps',
    codecs: [
      { id: 'av1', label: 'AV1 Video Clip', sublabel: '1.8 Mbps', mbps: 1.8, barColor: '#38bdf8' },
      { id: 'h265', label: 'H.265 (HEVC) Video Clip', sublabel: '2.5 Mbps', mbps: 2.5, barColor: '#a855f7' },
      { id: 'h264', label: 'H.264 (AVC) Video Clip', sublabel: '4.0 Mbps', mbps: 4.0, barColor: '#f97316' },
    ],
  },
  '4k': {
    key: '4k',
    label: '4K UHD',
    dimensions: '3840×2160 @ 30fps',
    codecs: [
      { id: 'av1', label: 'AV1 Video Clip', sublabel: '5.5 Mbps', mbps: 5.5, barColor: '#38bdf8' },
      { id: 'h265', label: 'H.265 (HEVC) Video Clip', sublabel: '7.5 Mbps', mbps: 7.5, barColor: '#a855f7' },
      { id: 'h264', label: 'H.264 (AVC) Video Clip', sublabel: '12.0 Mbps', mbps: 12.0, barColor: '#f97316' },
    ],
  },
};

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
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    cursor: 'pointer',
    userSelect: 'none',
  },
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
  },
  barRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  barLabelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    fontSize: tokens.fontSizeBase200,
  },
  barNameGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  barValueGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: tokens.fontSizeBase200,
  },
  barTrack: {
    position: 'relative',
    width: '100%',
    height: '10px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
  },
  adfMetaSegment: {
    height: '100%',
    backgroundColor: '#22c55e',
    transition: 'width 0.25s ease',
  },
  adfSnapSegment: {
    height: '100%',
    backgroundColor: '#FFCC00',
    transition: 'width 0.25s ease',
  },
  codecBarFill: {
    height: '100%',
    transition: 'width 0.25s ease',
  },
  calloutRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    marginTop: '2px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    borderLeft: '3px solid #22c55e',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  monoStrong: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
});

function formatRatio(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return '1×';
  if (ratio >= 100) return `${Math.round(ratio).toLocaleString()}×`;
  if (ratio >= 10) return `${ratio.toFixed(0)}×`;
  return `${ratio.toFixed(1)}×`;
}

function formatSavingsPercent(adfBytes: number, videoBytes: number): string {
  if (videoBytes <= 0) return '0%';
  if (adfBytes >= videoBytes) return '0%';
  const pct = (1 - adfBytes / videoBytes) * 100;
  if (pct >= 99.95) return `${pct.toFixed(2)}%`;
  if (pct >= 99) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(1)}%`;
}

export interface BandwidthComparisonCardProps {
  selectedTrack: NormalizedTrackRecord;
  allTracks: NormalizedTrackRecord[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const BandwidthComparisonCard: React.FC<BandwidthComparisonCardProps> = ({
  selectedTrack,
  allTracks,
  collapsed,
  onToggleCollapse,
}) => {
  const styles = useStyles();
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(true);
  const isCollapsed = collapsed ?? internalCollapsed;
  const handleToggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed((c) => !c);
  };

  const [scope, setScope] = useState<ScopeMode>('selected');
  const [resolution, setResolution] = useState<ResolutionKey>('1080p');

  const activeScope: ScopeMode = scope === 'stream' && allTracks.length > 0 ? 'stream' : 'selected';
  const profile = RESOLUTION_PROFILES[resolution];

  const stats = useMemo(() => {
    const records = activeScope === 'stream' ? allTracks : [selectedTrack];
    const rawDurationSec = records.reduce((acc, r) => acc + Math.max(0, r.durationSec), 0);
    const adfTotalBytes = records.reduce((acc, r) => acc + r.packetBytes, 0);
    const adfMetaBytes = records.reduce((acc, r) => acc + r.metadataBytes, 0);
    const adfSnapBytes = records.reduce((acc, r) => acc + r.snapshotBase64Bytes, 0);
    const tracksWithSnapshot = records.filter((r) => r.snapshotBase64Bytes > 0).length;

    // Clamp to a minimum 0.5s video window when duration is 0s so instantaneous tracks compare cleanly
    const isClampedMin = rawDurationSec < 0.5;
    const effectiveDurationSec = Math.max(rawDurationSec, 0.5);

    const codecs = profile.codecs.map((codec) => {
      const videoBytes = Math.round(effectiveDurationSec * ((codec.mbps * 1_000_000) / 8));
      const ratioVsTotal = videoBytes / Math.max(1, adfTotalBytes);
      const ratioVsMeta = videoBytes / Math.max(1, adfMetaBytes);
      const savingsPct = formatSavingsPercent(adfTotalBytes, videoBytes);
      return {
        ...codec,
        videoBytes,
        ratioVsTotal,
        ratioVsMeta,
        savingsPct,
      };
    });

    const maxBytes = Math.max(adfTotalBytes, ...codecs.map((c) => c.videoBytes), 1);
    const h264Codec = codecs[codecs.length - 1];
    const metaSavingsVsH264 = formatSavingsPercent(adfMetaBytes, h264Codec.videoBytes);

    return {
      recordCount: records.length,
      rawDurationSec,
      effectiveDurationSec,
      isClampedMin,
      adfTotalBytes,
      adfMetaBytes,
      adfSnapBytes,
      tracksWithSnapshot,
      codecs,
      maxBytes,
      h264Codec,
      metaSavingsVsH264,
    };
  }, [activeScope, allTracks, selectedTrack, profile]);

  const adfTotalPct = Math.min(100, (stats.adfTotalBytes / stats.maxBytes) * 100);
  const adfMetaShare =
    stats.adfTotalBytes > 0 ? (stats.adfMetaBytes / stats.adfTotalBytes) * adfTotalPct : 0;
  const adfSnapShare = Math.max(0, adfTotalPct - adfMetaShare);

  return (
    <div className={styles.card}>
      <div
        className={styles.header}
        style={isCollapsed ? { borderBottom: 'none' } : undefined}
      >
        <div
          className={styles.headerLeft}
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
          <DataBarVerticalRegular />
          <Text weight="semibold">ADF Packet Size vs. Video Clip Comparison</Text>
          <Badge appearance="tint" color="brand">
            {stats.isClampedMin
              ? `${stats.rawDurationSec.toFixed(2)}s (0.5s min clip)`
              : `${stats.rawDurationSec.toFixed(2)}s clip`}
          </Badge>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {isCollapsed && (
            <Badge appearance="outline" size="small">
              ADF: {formatBytes(stats.adfTotalBytes)} vs H.264:{' '}
              {formatBytes(stats.h264Codec.videoBytes)}
            </Badge>
          )}
          <Badge appearance="filled" color="success">
            {stats.adfTotalBytes <= stats.h264Codec.videoBytes
              ? `${stats.h264Codec.savingsPct} Bandwidth & Storage Reduction vs. H.264`
              : 'Larger than H.264 clip'}
          </Badge>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className={styles.controlsBar}>
        <div className={styles.controlGroup}>
          <Button
            size="small"
            appearance={activeScope === 'selected' ? 'primary' : 'outline'}
            onClick={() => setScope('selected')}
          >
            Selected Track
          </Button>
          <Button
            size="small"
            appearance={activeScope === 'stream' ? 'primary' : 'outline'}
            onClick={() => setScope('stream')}
            disabled={allTracks.length <= 1}
          >
            Entire Stream ({allTracks.length} tracks)
          </Button>
        </div>

        <div className={styles.controlGroup}>
          <Tooltip
            content="Typical 30 fps IP surveillance stream bitrates used to calculate equivalent video clip size for the same duration."
            relationship="description"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '4px' }}>
              <InfoRegular fontSize={14} />
            </span>
          </Tooltip>
          {(Object.keys(RESOLUTION_PROFILES) as ResolutionKey[]).map((key) => {
            const p = RESOLUTION_PROFILES[key];
            return (
              <Button
                key={key}
                size="small"
                appearance={resolution === key ? 'primary' : 'outline'}
                onClick={() => setResolution(key)}
              >
                {p.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className={styles.body}>
        {/* ADF Object Track Bar */}
        <div className={styles.barRow}>
          <div className={styles.barLabelRow}>
            <div className={styles.barNameGroup}>
              <Text weight="semibold">ADF object_track.v1 Packet</Text>
              <Badge appearance="tint" color="success" size="small">
                Metadata JSON: {formatBytes(stats.adfMetaBytes)}
              </Badge>
              {stats.adfSnapBytes > 0 ? (
                <Badge appearance="tint" color="warning" size="small">
                  Snapshot JPG (base64): {formatBytes(stats.adfSnapBytes)}
                </Badge>
              ) : (
                <Badge appearance="outline" color="subtle" size="small">
                  Metadata-only (no snapshot)
                </Badge>
              )}
            </div>
            <div className={styles.barValueGroup}>
              <Text weight="bold" style={{ color: '#22c55e' }}>
                {formatBytes(stats.adfTotalBytes)}
              </Text>
              <Text size={100} style={{ opacity: 0.75 }}>
                ({stats.adfTotalBytes.toLocaleString()} B)
              </Text>
            </div>
          </div>

          <Tooltip
            content={`ADF Total: ${formatBytes(stats.adfTotalBytes)} • Pure JSON Metadata: ${formatBytes(
              stats.adfMetaBytes
            )} • Inline Snapshot Base64: ${formatBytes(stats.adfSnapBytes)}`}
            relationship="description"
          >
            <div className={styles.barTrack}>
              <div
                className={styles.adfMetaSegment}
                style={{
                  width: `${Math.max(stats.adfMetaBytes > 0 ? 0.6 : 0, adfMetaShare)}%`,
                  minWidth: stats.adfMetaBytes > 0 ? '4px' : '0px',
                }}
              />
              {stats.adfSnapBytes > 0 && (
                <div
                  className={styles.adfSnapSegment}
                  style={{
                    width: `${Math.max(0.8, adfSnapShare)}%`,
                    minWidth: '4px',
                  }}
                />
              )}
            </div>
          </Tooltip>
        </div>

        {/* Codec Bars (AV1, H.265, H.264) */}
        {stats.codecs.map((codec) => {
          const pct = Math.min(100, (codec.videoBytes / stats.maxBytes) * 100);
          return (
            <div key={codec.id} className={styles.barRow}>
              <div className={styles.barLabelRow}>
                <div className={styles.barNameGroup}>
                  <Text weight="medium">{codec.label}</Text>
                  <Badge appearance="outline" size="small">
                    {profile.dimensions} • {codec.sublabel}
                  </Badge>
                </div>
                <div className={styles.barValueGroup}>
                  <Text weight="semibold">{formatBytes(codec.videoBytes)}</Text>
                  <Badge appearance="tint" color="informative" size="small">
                    {formatRatio(codec.ratioVsTotal)} larger
                  </Badge>
                  <Text size={100} style={{ color: '#22c55e' }}>
                    (-{codec.savingsPct})
                  </Text>
                </div>
              </div>

              <div className={styles.barTrack}>
                <div
                  className={styles.codecBarFill}
                  style={{
                    width: `${Math.max(2, pct)}%`,
                    backgroundColor: codec.barColor,
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Summary Callout */}
        <div className={styles.calloutRow}>
          <span>
            Pure JSON trajectory & classification metadata ({' '}
            <span className={styles.monoStrong}>{formatBytes(stats.adfMetaBytes)}</span> ) is{' '}
            <span className={styles.monoStrong}>
              {formatRatio(stats.h264Codec.ratioVsMeta)} smaller
            </span>{' '}
            than {profile.label} H.264 video (
            <span className={styles.monoStrong}>{stats.metaSavingsVsH264} savings</span>).
          </span>
          <span>
            {stats.adfSnapBytes > 0
              ? `Includes ${stats.tracksWithSnapshot} inline JPEG snapshot${
                  stats.tracksWithSnapshot === 1 ? '' : 's'
                }`
              : 'Zero pixel payload sent'}
          </span>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
