import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Spinner,
  Text,
  Textarea,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  CheckmarkRegular,
  CopyRegular,
  DismissRegular,
  ErrorCircleRegular,
  InfoRegular,
  PlayRegular,
  SparkleRegular,
  WarningRegular,
} from '@fluentui/react-icons';
import { NormalizedTrackRecord } from '../types/adf';
import { formatBytes } from '../utils/adfParser';
import { getSnapshotSrc } from './views/adfViewHelpers';
import { getClassBadgeColor } from './TrackTable';
import {
  BrowserAiAnalysisOutput,
  BrowserAiAvailabilityInfo,
  SCENE_PRESETS,
  buildBrowserAiPrompts,
  buildTrackTelemetryDigest,
  checkBrowserAiAvailability,
  runBrowserAiAnalysis,
} from '../utils/browserAi';

const useStyles = makeStyles({
  surface: {
    maxWidth: '860px',
    width: '94vw',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    maxHeight: '75vh',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  statusBanner: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  statusTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  contextGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 260px) 1fr',
    gap: tokens.spacingHorizontalM,
    alignItems: 'stretch',
    '@media (max-width: 680px)': {
      gridTemplateColumns: '1fr',
    },
  },
  contextCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalS,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  snapshotStage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d131a',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusSmall,
    padding: '6px',
    minHeight: '130px',
    maxHeight: '190px',
    overflow: 'hidden',
  },
  snapshotImg: {
    maxWidth: '100%',
    maxHeight: '175px',
    objectFit: 'contain',
    display: 'block',
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  digestPre: {
    margin: 0,
    padding: '8px 10px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: '11.5px',
    lineHeight: '1.45',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    flex: 1,
    overflowY: 'auto',
    maxHeight: '215px',
  },
  presetRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '4px',
  },
  sceneTextarea: {
    width: '100%',
    minHeight: '72px',
  },
  runningBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    border: '1px solid rgba(255, 204, 0, 0.4)',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.45)',
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-word',
  },
  assessmentCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  assessmentNormal: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.45)',
  },
  assessmentUnusual: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.5)',
  },
  assessmentAnomaly: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.5)',
  },
  observationList: {
    margin: '4px 0 0 0',
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    fontSize: tokens.fontSizeBase200,
  },
  attributesCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: tokens.spacingHorizontalM,
    rowGap: '6px',
    fontSize: tokens.fontSizeBase200,
    alignItems: 'baseline',
  },
  metaLabel: {
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalS,
    '@media (max-width: 680px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
  statCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '8px 10px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  statValue: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  detailsBox: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  preCode: {
    margin: '6px 0 0 0',
    padding: '8px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: '11.5px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  sectionLabel: {
    fontSize: '11px',
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: tokens.colorNeutralForeground3,
  },
});

export interface BrowserAiModalProps {
  open: boolean;
  onClose: () => void;
  track: NormalizedTrackRecord;
}

export const BrowserAiModal: React.FC<BrowserAiModalProps> = ({ open, onClose, track }) => {
  const styles = useStyles();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [availability, setAvailability] = useState<BrowserAiAvailabilityInfo | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState<boolean>(false);
  const [sceneDescription, setSceneDescription] = useState<string>('');
  const [naturalDims, setNaturalDims] = useState<{ w: number; h: number } | null>(null);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [analysisOutput, setAnalysisOutput] = useState<BrowserAiAnalysisOutput | null>(null);
  const [copiedKey, setCopiedKey] = useState<'flags' | 'json' | null>(null);

  const imgSrc = useMemo(() => getSnapshotSrc(track.snapshot), [track.snapshot]);

  const telemetryDigest = useMemo(() => buildTrackTelemetryDigest(track), [track]);

  const promptPreview = useMemo(
    () =>
      buildBrowserAiPrompts({
        track,
        sceneDescription,
        telemetryDigest,
      }),
    [track, sceneDescription, telemetryDigest]
  );

  // Check Chrome AI availability whenever the modal opens (without running inference)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCheckingAvailability(true);
    checkBrowserAiAvailability()
      .then((info) => {
        if (!cancelled) setAvailability(info);
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Reset track-specific inference state and abort active runs on close or track switch
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    setElapsedMs(0);
    setError(null);
    setAnalysisOutput(null);
    setNaturalDims(null);
  }, [track.uid, open]);

  // Live elapsed timer while local inference runs
  useEffect(() => {
    if (!isRunning) return;
    const start = performance.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Math.round(performance.now() - start));
    }, 100);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const handleCopy = (key: 'flags' | 'json', text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCancelRun = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
  };

  const handleRunAnalysis = async () => {
    if (isRunning) return;
    const imgEl = imgRef.current;
    if (!imgSrc || !imgEl || !imgEl.complete || imgEl.naturalWidth === 0) {
      setError('Snapshot image has not finished loading yet.');
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsRunning(true);
    setElapsedMs(0);
    setError(null);

    try {
      const output = await runBrowserAiAnalysis({
        track,
        imageElement: imgEl,
        sceneDescription,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setAnalysisOutput(output);
      }
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        setError('Inference cancelled.');
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsRunning(false);
    }
  };

  const renderAvailabilityBadge = () => {
    if (checkingAvailability || !availability) {
      return (
        <Badge appearance="tint" color="informative">
          Checking Chrome AI…
        </Badge>
      );
    }
    switch (availability.status) {
      case 'available':
        return (
          <Badge appearance="filled" color="success">
            Ready (Multimodal)
          </Badge>
        );
      case 'downloadable':
        return (
          <Badge appearance="tint" color="warning">
            Downloadable
          </Badge>
        );
      case 'downloading':
        return (
          <Badge appearance="tint" color="warning">
            Downloading…
          </Badge>
        );
      case 'text-only':
        return (
          <Badge appearance="filled" color="warning">
            Text-Only (Enable Multimodal Flag)
          </Badge>
        );
      default:
        return (
          <Badge appearance="tint" color="danger">
            Unavailable
          </Badge>
        );
    }
  };

  const displayWidth = naturalDims?.w ?? track.snapshot?.width ?? 0;
  const displayHeight = naturalDims?.h ?? track.snapshot?.height ?? 0;
  const approxJpegBytes =
    track.snapshotDecodedBytes ||
    (track.snapshot?.data ? Math.round((track.snapshot.data.length * 3) / 4) : 0);

  const rawJsonFormatted = useMemo(() => {
    if (!analysisOutput?.rawResponseText) return '';
    try {
      const cleaned = analysisOutput.rawResponseText
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.stringify(JSON.parse(cleaned), null, 2);
    } catch {
      return analysisOutput.rawResponseText;
    }
  }, [analysisOutput]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SparkleRegular style={{ color: '#FFCC00' }} />
              <span>Browser AI Snapshot &amp; Scene Analysis</span>
              <Badge appearance="outline" size="small">
                On-Device Gemini Nano
              </Badge>
            </div>
          </DialogTitle>

          <DialogContent className={styles.content}>
            {/* 1. Engine Status & Setup Guide */}
            <div className={styles.statusBanner}>
              <div className={styles.statusTopRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Text weight="semibold" size={200}>
                    Chrome Prompt API:
                  </Text>
                  {renderAvailabilityBadge()}
                  {availability && (
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      {availability.message}
                    </Text>
                  )}
                </div>
              </div>

              {availability && availability.status !== 'available' && (
                <details className={styles.detailsBox} open={availability.status !== 'downloadable'}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                    Chrome Built-In AI Multimodal Setup Flags
                  </summary>
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Text size={200}>
                      Requires Chrome 138+ desktop with Gemini Nano enabled locally (all data stays on
                      your device):
                    </Text>
                    <pre className={styles.preCode}>
                      {`chrome://flags/#optimization-guide-on-device-model  → Enabled BypassPerfRequirement
chrome://flags/#prompt-api-for-gemini-nano-multimodal-input  → Enabled`}
                    </pre>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={copiedKey === 'flags' ? <CheckmarkRegular /> : <CopyRegular />}
                        onClick={() =>
                          handleCopy(
                            'flags',
                            'chrome://flags/#optimization-guide-on-device-model\nchrome://flags/#prompt-api-for-gemini-nano-multimodal-input'
                          )
                        }
                      >
                        {copiedKey === 'flags' ? 'Copied Flag URLs' : 'Copy Flag URLs'}
                      </Button>
                    </div>
                  </div>
                </details>
              )}
            </div>

            {/* 2. Input Context Preview */}
            <div className={styles.contextGrid}>
              <div className={styles.contextCard}>
                <Text className={styles.sectionLabel}>Snapshot &amp; Edge Metadata</Text>
                <div className={styles.snapshotStage}>
                  {imgSrc ? (
                    <img
                      ref={imgRef}
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
                  ) : (
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      No snapshot image attached
                    </Text>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: tokens.colorNeutralForeground3 }}>
                  <span>
                    {displayWidth > 0 ? `${displayWidth}×${displayHeight} px` : 'Loading dims…'}
                  </span>
                  <span>{formatBytes(approxJpegBytes)} JPEG</span>
                </div>
                <div className={styles.badgeRow}>
                  <Badge
                    size="small"
                    appearance="filled"
                    color={getClassBadgeColor(track.primaryClass)}
                  >
                    {track.primaryClass} {Math.round(track.primaryConfidence * 100)}%
                  </Badge>
                  {track.attributesSummary.slice(0, 4).map((attr, idx) => (
                    <Badge key={idx} size="small" appearance="tint" color="informative">
                      {attr.key}: {attr.value}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className={styles.contextCard}>
                <Text className={styles.sectionLabel}>Track Spatial &amp; Behavioral Digest</Text>
                <pre className={styles.digestPre}>{telemetryDigest}</pre>
              </div>
            </div>

            {/* 3. Scene Description Input & Presets */}
            <Field label="Scene Description (optional — used to detect scene & trajectory anomalies)">
              <Textarea
                className={styles.sceneTextarea}
                value={sceneDescription}
                onChange={(_, d) => setSceneDescription(d.value)}
                placeholder="Describe regions of the camera scene (e.g. 'Top half is a public street, center is a concrete driveway, bottom-left is a grass lawn with a tree where cars should not drive.')"
                disabled={isRunning}
              />
              <div className={styles.presetRow}>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  Presets:
                </Text>
                {SCENE_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    size="small"
                    appearance={sceneDescription === preset.description ? 'secondary' : 'outline'}
                    disabled={isRunning}
                    onClick={() => setSceneDescription(preset.description)}
                  >
                    {preset.label}
                  </Button>
                ))}
                {sceneDescription && (
                  <Button
                    size="small"
                    appearance="subtle"
                    disabled={isRunning}
                    onClick={() => setSceneDescription('')}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </Field>

            {/* 4. Running Indicator / Errors */}
            {isRunning && (
              <div className={styles.runningBanner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Spinner size="small" />
                  <Text weight="semibold" size={200}>
                    Running local Gemini Nano inference… {(elapsedMs / 1000).toFixed(1)}s
                  </Text>
                </div>
                <Button size="small" appearance="subtle" icon={<DismissRegular />} onClick={handleCancelRun}>
                  Cancel
                </Button>
              </div>
            )}

            {error && (
              <div className={styles.errorBox}>
                <ErrorCircleRegular fontSize={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            )}

            {/* 5. Inference Results */}
            {analysisOutput && (
              <>
                <div
                  className={`${styles.assessmentCard} ${
                    analysisOutput.result.sceneAssessment === 'anomaly'
                      ? styles.assessmentAnomaly
                      : analysisOutput.result.sceneAssessment === 'unusual'
                        ? styles.assessmentUnusual
                        : styles.assessmentNormal
                  }`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {analysisOutput.result.sceneAssessment === 'anomaly' ? (
                      <ErrorCircleRegular style={{ color: '#ef4444' }} fontSize={18} />
                    ) : analysisOutput.result.sceneAssessment === 'unusual' ? (
                      <WarningRegular style={{ color: '#f59e0b' }} fontSize={18} />
                    ) : (
                      <CheckmarkCircleRegular style={{ color: '#22c55e' }} fontSize={18} />
                    )}
                    <Badge
                      appearance="filled"
                      color={
                        analysisOutput.result.sceneAssessment === 'anomaly'
                          ? 'danger'
                          : analysisOutput.result.sceneAssessment === 'unusual'
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {analysisOutput.result.sceneAssessment.toUpperCase()}
                    </Badge>
                    <Text weight="semibold">{analysisOutput.result.sceneAssessmentHeadline}</Text>
                  </div>

                  {analysisOutput.result.sceneObservations.length > 0 && (
                    <ul className={styles.observationList}>
                      {analysisOutput.result.sceneObservations.map((obs, idx) => (
                        <li key={idx}>{obs}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className={styles.attributesCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <Text className={styles.sectionLabel}>Visual Object Attributes</Text>
                    <Badge
                      appearance="tint"
                      color={
                        analysisOutput.result.edgeClassificationMatch === 'discrepancy'
                          ? 'danger'
                          : analysisOutput.result.edgeClassificationMatch === 'refined'
                            ? 'informative'
                            : 'success'
                      }
                    >
                      Edge Class: {analysisOutput.result.edgeClassificationMatch.toUpperCase()}
                    </Badge>
                  </div>

                  <Text size={300}>{analysisOutput.result.objectSummary}</Text>

                  <div className={styles.metaGrid}>
                    <span className={styles.metaLabel}>Sub-type / Make &amp; Model:</span>
                    <span>{analysisOutput.result.subtypeOrMakeModel}</span>

                    <span className={styles.metaLabel}>Surface / Background:</span>
                    <span>{analysisOutput.result.apparentSurfaceOrBackground}</span>

                    {analysisOutput.result.edgeMatchExplanation && (
                      <>
                        <span className={styles.metaLabel}>Edge vs. VLM Note:</span>
                        <span>{analysisOutput.result.edgeMatchExplanation}</span>
                      </>
                    )}
                  </div>

                  {analysisOutput.result.observedAttributes.length > 0 && (
                    <div className={styles.badgeRow}>
                      {analysisOutput.result.observedAttributes.map((attr, idx) => (
                        <Badge key={idx} appearance="tint" color="brand">
                          {attr.label}: {attr.value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. Client Inference Telemetry & Stats Grid */}
                <div className={styles.statsGrid}>
                  <div className={styles.statCell}>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                      Total Latency
                    </Text>
                    <Text className={styles.statValue}>{analysisOutput.stats.totalMs} ms</Text>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                      Init {analysisOutput.stats.sessionInitMs}ms • Prompt{' '}
                      {analysisOutput.stats.inferenceMs}ms
                    </Text>
                  </div>

                  <div className={styles.statCell}>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                      Throughput
                    </Text>
                    <Text className={styles.statValue}>
                      {analysisOutput.stats.charsPerSec.toFixed(0)} chars/s
                    </Text>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                      {analysisOutput.stats.responseChars} output chars
                    </Text>
                  </div>

                  <div className={styles.statCell}>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                      Token Usage
                    </Text>
                    <Text className={styles.statValue}>
                      {analysisOutput.stats.inputUsageTokens ?? '—'} /{' '}
                      {analysisOutput.stats.inputQuotaTokens ?? '—'}
                    </Text>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                      {analysisOutput.stats.promptChars} prompt chars
                    </Text>
                  </div>

                  <div className={styles.statCell}>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                      Snapshot Input
                    </Text>
                    <Text className={styles.statValue}>
                      {analysisOutput.stats.imageWidth}×{analysisOutput.stats.imageHeight} px
                    </Text>
                    <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                      {(analysisOutput.stats.imageBytes / 1024).toFixed(1)} KB • Multimodal
                    </Text>
                  </div>
                </div>
              </>
            )}

            {/* 7. Collapsible Raw Prompt & JSON Output Block */}
            <details className={styles.detailsBox}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Raw Prompt &amp; JSON Output Inspector
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <div>
                  <Text className={styles.sectionLabel}>System Prompt</Text>
                  <pre className={styles.preCode}>
                    {analysisOutput?.systemPrompt ?? promptPreview.systemPrompt}
                  </pre>
                </div>
                <div>
                  <Text className={styles.sectionLabel}>User Prompt</Text>
                  <pre className={styles.preCode}>
                    {analysisOutput?.userPrompt ?? promptPreview.userPrompt}
                  </pre>
                </div>
                {analysisOutput && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text className={styles.sectionLabel}>Raw JSON Response</Text>
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={copiedKey === 'json' ? <CheckmarkRegular /> : <CopyRegular />}
                        onClick={() => handleCopy('json', rawJsonFormatted)}
                      >
                        {copiedKey === 'json' ? 'Copied JSON' : 'Copy Raw JSON'}
                      </Button>
                    </div>
                    <pre className={styles.preCode}>{rawJsonFormatted}</pre>
                  </div>
                )}
              </div>
            </details>
          </DialogContent>

          <DialogActions>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto', fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
              <InfoRegular fontSize={14} />
              <span>Inference runs 100% locally in your browser</span>
            </div>
            <Button appearance="secondary" onClick={onClose}>
              Close
            </Button>
            <Tooltip
              content="Send snapshot image and track telemetry to Chrome's local Gemini Nano model"
              relationship="label"
            >
              <Button
                appearance="primary"
                icon={<PlayRegular />}
                disabled={isRunning || !imgSrc}
                onClick={handleRunAnalysis}
              >
                {isRunning
                  ? 'Analyzing…'
                  : analysisOutput
                    ? 'Re-run Analysis'
                    : 'Run Analysis'}
              </Button>
            </Tooltip>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
