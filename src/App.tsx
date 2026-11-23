import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  FluentProvider,
  Link,
  Switch,
  Tab,
  TabList,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import {
  AddRegular,
  ArrowDownloadRegular,
  ArrowResetRegular,
  BookOpenRegular,
  ClipboardPasteRegular,
  CodeRegular,
  DeleteRegular,
  FolderOpenRegular,
  GridRegular,
  InfoRegular,
  PlugConnectedRegular,
  SendRegular,
  TableRegular,
  TargetRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from '@fluentui/react-icons';
import mqtt, { MqttClient } from 'mqtt';
import { axisDarkTheme, axisLightTheme } from '@axiscommunications/fluent-theme';
import { TopBar } from '@axiscommunications/fluent-topbar';
import { EmptyView } from '@axiscommunications/fluent-empty-view';
import { useCustomScrollbars } from '@axiscommunications/fluent-styles';

import {
  createInitialSampleTracks,
  generateSimulatedTrackMessage,
} from './data/sampleTracks';
import { NormalizedTrackRecord } from './types/adf';
import { formatBytes, normalizeTrackMessage, parseAdfTextInput } from './utils/adfParser';
import { TrackTable, getClassBadgeColor, getClassIcon } from './components/TrackTable';
import { TrackSceneCanvas } from './components/TrackSceneCanvas';
import { TrackTelemetryCard } from './components/TrackTelemetryCard';
import { BandwidthComparisonCard } from './components/BandwidthComparisonCard';
import { SnapshotCard } from './components/SnapshotCard';
import { JsonTreeView } from './components/JsonTreeView';
import { ImportModal } from './components/ImportModal';
import { ForensicGalleryView } from './components/views/ForensicGalleryView';
import { SpatialAnalyticsView } from './components/views/SpatialAnalyticsView';
import {
  BROADCAST_CHANNEL_NAME,
  DEFAULT_MQTT_CONFIG,
  INITIAL_MQTT_STATS,
  MqttConnectModal,
  MqttConnectionConfig,
  MqttConnectionStatus,
  MqttStats,
  mqttTopicMatches,
  parseTopicFilterList,
} from './components/MqttConnectModal';

const UTF8_DECODER = new TextDecoder();
const UTF8_ENCODER = new TextEncoder();

const ADF_DOCS_URL =
  'https://developer.axis.com/analytics/axis-scene-metadata/reference/data-formats/analytics-data-format/';

export type ViewMode = 'workbench' | 'spatial' | 'session';

function buildInitialDemoTracks(): NormalizedTrackRecord[] {
  return [...createInitialSampleTracks()]
    .reverse()
    .map((msg, idx) => normalizeTrackMessage(msg, idx))
    .filter((t): t is NormalizedTrackRecord => t !== null);
}

const useStyles = makeStyles({
  appShell: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    overflow: 'hidden',
  },
  viewSwitcherBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    padding: `4px ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    flexShrink: 0,
  },
  viewSwitcherRight: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  mainStage: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  workbench: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'minmax(410px, 34%) minmax(400px, 36%) minmax(340px, 30%)',
    overflow: 'hidden',
  },
  workbenchNoJson: {
    gridTemplateColumns: 'minmax(380px, 34%) 1fr',
  },
  centerPane: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalM,
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  bottomCardsStacked: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    flexShrink: 0,
  },
  bottomCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: tokens.spacingHorizontalM,
    alignItems: 'start',
    flexShrink: 0,
  },
  trackSummaryBanner: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderLeft: '4px solid #FFCC00',
    borderRadius: tokens.borderRadiusMedium,
  },
  summaryTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
  },
  summaryMetricsRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  monoId: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  disclaimerFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '28px',
    minHeight: '28px',
    padding: `0 ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground3,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    gap: tokens.spacingHorizontalM,
  },
  disclaimerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    border: '3px dashed #FFCC00',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
});

export const App: React.FC = () => {
  const styles = useStyles();
  const scrollStyles = useCustomScrollbars();

  const [isDark, setIsDark] = useState<boolean>(true);
  const [tracks, setTracks] = useState<NormalizedTrackRecord[]>(() => buildInitialDemoTracks());
  const [activeView, setActiveView] = useState<ViewMode>('workbench');
  const [metadataOnlyMode, setMetadataOnlyMode] = useState<boolean>(false);

  const [selectedUid, setSelectedUid] = useState<string | null>(() => tracks[0]?.uid ?? null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [onlyWithSnapshot, setOnlyWithSnapshot] = useState<boolean>(false);

  const [liveSimActive, setLiveSimActive] = useState<boolean>(false);
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [mqttModalOpen, setMqttModalOpen] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [showJsonPane, setShowJsonPane] = useState<boolean>(true);
  const [collapsedSections, setCollapsedSections] = useState<{
    trajectory: boolean;
    telemetry: boolean;
    bandwidth: boolean;
    snapshot: boolean;
  }>({
    trajectory: false,
    telemetry: false,
    bandwidth: true,
    snapshot: false,
  });

  const toggleSection = useCallback(
    (key: 'trajectory' | 'telemetry' | 'bandwidth' | 'snapshot') => {
      setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const setAllSectionsCollapsed = useCallback((collapsed: boolean) => {
    setCollapsedSections({
      trajectory: collapsed,
      telemetry: collapsed,
      bandwidth: collapsed,
      snapshot: collapsed,
    });
  }, []);

  const allSectionsCollapsed =
    collapsedSections.trajectory &&
    collapsedSections.telemetry &&
    collapsedSections.bandwidth &&
    collapsedSections.snapshot;

  const [mqttConfig, setMqttConfig] = useState<MqttConnectionConfig>(DEFAULT_MQTT_CONFIG);
  const [mqttStatus, setMqttStatus] = useState<MqttConnectionStatus>('disconnected');
  const [mqttError, setMqttError] = useState<string | null>(null);
  const [mqttStats, setMqttStats] = useState<MqttStats>(INITIAL_MQTT_STATS);

  const simCounterRef = useRef<number>(100);
  const mqttCounterRef = useRef<number>(1000);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mqttClientRef = useRef<MqttClient | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const activeTopicsRef = useRef<string[]>([]);

  const handleIncomingMqttPayload = useCallback((topic: string, rawPayload: Uint8Array | string) => {
    const rawText =
      typeof rawPayload === 'string' ? rawPayload : UTF8_DECODER.decode(rawPayload);
    const byteCount =
      typeof rawPayload === 'string'
        ? UTF8_ENCODER.encode(rawPayload).length
        : rawPayload.byteLength;

    mqttCounterRef.current += 1;
    const parsedTracks = parseAdfTextInput(rawText, topic, mqttCounterRef.current * 100);
    if (parsedTracks.length > 0) {
      setTracks((prev) => [...parsedTracks, ...prev]);
      setSelectedUid((curr) => curr ?? parsedTracks[0].uid);
    }

    const nowTime = new Date().toISOString().slice(11, 19);
    setMqttStats((prev) => ({
      messagesReceived: prev.messagesReceived + 1,
      tracksParsed: prev.tracksParsed + parsedTracks.length,
      bytesReceived: prev.bytesReceived + byteCount,
      lastTopic: topic,
      lastMessageTime: nowTime,
      recentEvents: [
        {
          id: `${Date.now()}-${mqttCounterRef.current}`,
          timestamp: nowTime,
          topic,
          bytes: byteCount,
          parsedTracks: parsedTracks.length,
          ...(parsedTracks.length === 0 ? { note: 'Non-ADF or invalid JSON' } : {}),
        },
        ...prev.recentEvents,
      ].slice(0, 6),
    }));
  }, []);

  const disconnectMqtt = useCallback(() => {
    if (mqttClientRef.current) {
      mqttClientRef.current.removeAllListeners();
      mqttClientRef.current.end(true);
      mqttClientRef.current = null;
    }
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
      broadcastChannelRef.current = null;
    }
    activeTopicsRef.current = [];
    setMqttStatus('disconnected');
    setMqttError(null);
  }, []);

  const connectMqtt = useCallback(() => {
    disconnectMqtt();
    const topicFilters = parseTopicFilterList(mqttConfig.topics);
    if (topicFilters.length === 0) {
      setMqttStatus('error');
      setMqttError('Enter at least one MQTT topic filter to subscribe to.');
      return;
    }
    activeTopicsRef.current = topicFilters;
    setMqttError(null);

    if (mqttConfig.transport === 'broadcast') {
      if (typeof BroadcastChannel === 'undefined') {
        setMqttStatus('error');
        setMqttError('BroadcastChannel is not supported in this browser.');
        return;
      }
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (ev: MessageEvent) => {
        const data = ev.data as { topic?: string; payload?: string } | null;
        if (!data || typeof data.topic !== 'string' || typeof data.payload !== 'string') {
          return;
        }
        const matched = activeTopicsRef.current.some((f) =>
          mqttTopicMatches(f, data.topic as string)
        );
        if (matched) {
          handleIncomingMqttPayload(data.topic, data.payload);
        }
      };
      broadcastChannelRef.current = channel;
      setMqttStatus('connected');
      return;
    }

    const url = mqttConfig.brokerUrl.trim();
    if (!url) {
      setMqttStatus('error');
      setMqttError('Broker WebSocket URL is required.');
      return;
    }

    setMqttStatus('connecting');
    try {
      const client = mqtt.connect(url, {
        clientId:
          mqttConfig.clientId.trim() ||
          `adf-viewer-${Math.random().toString(16).slice(2, 8)}`,
        protocolVersion: mqttConfig.protocolVersion,
        clean: true,
        connectTimeout: 8000,
        reconnectPeriod: 4000,
        ...(mqttConfig.username.trim() ? { username: mqttConfig.username.trim() } : {}),
        ...(mqttConfig.password ? { password: mqttConfig.password } : {}),
      });

      client.on('connect', () => {
        setMqttStatus('connected');
        setMqttError(null);
        client.subscribe(topicFilters, { qos: mqttConfig.qos }, (err) => {
          if (err) {
            setMqttError(`Subscription failed: ${err.message}`);
          }
        });
      });

      client.on('message', (topic, payload) => {
        handleIncomingMqttPayload(topic, payload);
      });

      client.on('reconnect', () => {
        setMqttStatus('connecting');
      });

      client.on('error', (err) => {
        setMqttStatus('error');
        setMqttError(err.message || 'WebSocket MQTT connection error');
      });

      client.on('close', () => {
        setMqttStatus((prev) => (prev === 'error' ? 'error' : 'disconnected'));
      });

      mqttClientRef.current = client;
    } catch (err) {
      setMqttStatus('error');
      setMqttError(err instanceof Error ? err.message : String(err));
    }
  }, [disconnectMqtt, handleIncomingMqttPayload, mqttConfig]);

  const publishTestTrackToMqtt = useCallback(() => {
    simCounterRef.current += 1;
    const rawMsg = generateSimulatedTrackMessage(simCounterRef.current);
    const jsonPayload = JSON.stringify(rawMsg);
    const targetTopic = mqttConfig.publishTopic.trim() || 'adf-viewer/demo/object_track/ch1';

    if (mqttConfig.transport === 'broadcast' && broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ topic: targetTopic, payload: jsonPayload });
      // Local loopback so single-tab demos receive their own published test packet
      const matched = activeTopicsRef.current.some((f) => mqttTopicMatches(f, targetTopic));
      if (matched) {
        handleIncomingMqttPayload(targetTopic, jsonPayload);
      }
      return;
    }

    if (mqttClientRef.current && mqttStatus === 'connected') {
      mqttClientRef.current.publish(
        targetTopic,
        jsonPayload,
        { qos: mqttConfig.qos },
        (err) => {
          if (err) {
            setMqttError(`Publish error: ${err.message}`);
          }
        }
      );
    }
  }, [handleIncomingMqttPayload, mqttConfig.publishTopic, mqttConfig.qos, mqttConfig.transport, mqttStatus]);

  useEffect(() => {
    return () => {
      if (mqttClientRef.current) {
        mqttClientRef.current.removeAllListeners();
        mqttClientRef.current.end(true);
        mqttClientRef.current = null;
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, []);

  const emitSingleSimulatedTrack = useCallback(() => {
    simCounterRef.current += 1;
    const rawMsg = generateSimulatedTrackMessage(simCounterRef.current);
    const norm = normalizeTrackMessage(rawMsg, simCounterRef.current);
    if (!norm) return;
    setTracks((prev) => [norm, ...prev]);
    setSelectedUid((curr) => curr ?? norm.uid);
  }, []);

  // Live stream interval when enabled
  useEffect(() => {
    if (!liveSimActive) return;
    const timer = window.setInterval(() => {
      emitSingleSimulatedTrack();
    }, 2400);
    return () => window.clearInterval(timer);
  }, [liveSimActive, emitSingleSimulatedTrack]);

  // Apply global Metadata-Only (Strip Snapshots) transform when enabled
  const effectiveTracks = useMemo(() => {
    if (!metadataOnlyMode) return tracks;
    return tracks.map((t) => {
      const strippedRaw = { ...t.raw };
      if (strippedRaw.image) {
        const { data: _imgData, ...restImg } = strippedRaw.image;
        strippedRaw.image = restImg;
      }
      if (strippedRaw.best_snapshot) {
        const { data: _bestData, ...restBest } = strippedRaw.best_snapshot;
        strippedRaw.best_snapshot = restBest;
      }
      const strippedSnap = t.snapshot ? { ...t.snapshot, data: undefined } : undefined;
      return {
        ...t,
        snapshot: strippedSnap,
        packetBytes: t.metadataBytes,
        snapshotBase64Bytes: 0,
        snapshotDecodedBytes: 0,
        raw: strippedRaw,
      };
    });
  }, [tracks, metadataOnlyMode]);

  // Filtered tracks for table & scene visualization
  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return effectiveTracks.filter((trk) => {
      if (onlyWithSnapshot && !trk.snapshot?.data) return false;
      if (classFilter !== 'all') {
        const pLower = trk.primaryClass.toLowerCase();
        const isVehicleGroup =
          classFilter === 'vehicle' &&
          (pLower.includes('vehicle') ||
            pLower.includes('car') ||
            pLower.includes('truck') ||
            pLower.includes('bus') ||
            pLower.includes('van'));
        const matchPrimary = pLower.includes(classFilter) || isVehicleGroup;
        const matchSub = trk.secondaryClasses.some((s) =>
          s.type.toLowerCase().includes(classFilter)
        );
        if (!matchPrimary && !matchSub) return false;
      }
      if (q) {
        const haystack = [
          trk.trackId,
          trk.primaryClass,
          `ch${trk.channelId}`,
          trk.mqttTopic || '',
          ...trk.secondaryClasses.map((s) => s.type),
          ...trk.attributesSummary.map((a) => `${a.key}:${a.value}`),
          JSON.stringify(trk.raw.analytics_metadata || {}),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [effectiveTracks, onlyWithSnapshot, classFilter, searchQuery]);

  const selectedTrack = useMemo(() => {
    return (
      filteredTracks.find((t) => t.uid === selectedUid) ||
      effectiveTracks.find((t) => t.uid === selectedUid) ||
      filteredTracks[0] ||
      null
    );
  }, [filteredTracks, effectiveTracks, selectedUid]);

  // Keyboard Up/Down navigation in track table
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLElement | null;
      const tag = targetEl?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        targetEl?.getAttribute('role') === 'slider'
      ) {
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (filteredTracks.length === 0) return;

      e.preventDefault();
      const idx = filteredTracks.findIndex((t) => t.uid === selectedTrack?.uid);
      if (e.key === 'ArrowDown') {
        const next = filteredTracks[Math.min(filteredTracks.length - 1, idx + 1)];
        if (next) setSelectedUid(next.uid);
      } else if (e.key === 'ArrowUp') {
        const prev = filteredTracks[Math.max(0, idx - 1)];
        if (prev) setSelectedUid(prev.uid);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredTracks, selectedTrack]);

  const emitSampleBatch = useCallback((count = 8) => {
    const batch: NormalizedTrackRecord[] = [];
    for (let i = 0; i < count; i++) {
      simCounterRef.current += 1;
      const rawMsg = generateSimulatedTrackMessage(simCounterRef.current);
      const norm = normalizeTrackMessage(rawMsg, simCounterRef.current);
      if (norm) batch.push(norm);
    }
    if (batch.length > 0) {
      setTracks((prev) => [...batch, ...prev]);
      setSelectedUid((curr) => curr ?? batch[0].uid);
    }
  }, []);

  const handleResetDemoData = useCallback(() => {
    setLiveSimActive(false);
    const demo = buildInitialDemoTracks();
    setTracks(demo);
    setSelectedUid(demo[0]?.uid ?? null);
    setSearchQuery('');
    setClassFilter('all');
    setOnlyWithSnapshot(false);
  }, []);

  const handleOpenInWorkbench = useCallback((uid: string) => {
    setSelectedUid(uid);
    setActiveView('workbench');
  }, []);

  const handleImportText = useCallback((rawText: string): number => {
    simCounterRef.current += 1;
    const parsed = parseAdfTextInput(rawText, undefined, simCounterRef.current * 100);
    if (parsed.length === 0) return 0;
    setTracks((prev) => [...parsed, ...prev]);
    setSelectedUid(parsed[0].uid);
    return parsed.length;
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleImportText(String(reader.result || ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJsonl = () => {
    const jsonl = effectiveTracks.map((t) => JSON.stringify(t.raw)).join('\n');
    const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adf-object-tracks-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearTracks = () => {
    setLiveSimActive(false);
    setTracks([]);
    setSelectedUid(null);
    setSearchQuery('');
    setClassFilter('all');
    setOnlyWithSnapshot(false);
  };

  return (
    <FluentProvider theme={isDark ? axisDarkTheme : axisLightTheme}>
      <div
        className={styles.appShell}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setIsDraggingFile(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => handleImportText(String(reader.result || ''));
            reader.readAsText(file);
          }
        }}
      >
        {isDraggingFile && (
          <div className={styles.dropOverlay}>
            <Text size={600} weight="bold" style={{ color: '#FFCC00' }}>
              Drop ADF .json or .jsonl file to import Object Tracks
            </Text>
          </div>
        )}

        <TopBar
          appTitle="ADF Explorer"
          subtitle={
            <>
              <Badge appearance="tint" color="brand">
                object_track.v1
              </Badge>
              <Badge appearance="outline" color="subtle">
                Unofficial Tool
              </Badge>
            </>
          }
          centerContent={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Switch
                label={liveSimActive ? 'Live Stream (Active)' : 'Simulate Stream'}
                checked={liveSimActive}
                onChange={(_, d) => setLiveSimActive(d.checked)}
              />
              <Tooltip content="Emit a single simulated Object Track message" relationship="label">
                <Button
                  size="small"
                  appearance="secondary"
                  icon={<AddRegular />}
                  onClick={emitSingleSimulatedTrack}
                >
                  +1 Track
                </Button>
              </Tooltip>
              <Tooltip
                content="Connect to a live MQTT broker (WebSocket) or Cross-Tab BroadcastChannel"
                relationship="label"
              >
                <Button
                  size="small"
                  appearance={mqttStatus === 'connected' ? 'primary' : 'outline'}
                  icon={<PlugConnectedRegular />}
                  onClick={() => setMqttModalOpen(true)}
                >
                  {mqttStatus === 'connected'
                    ? `MQTT: Connected (${mqttStats.tracksParsed})`
                    : mqttStatus === 'connecting'
                      ? 'MQTT: Connecting…'
                      : mqttStatus === 'error'
                        ? 'MQTT: Error'
                        : 'Connect MQTT'}
                </Button>
              </Tooltip>
              {mqttStatus === 'connected' && (
                <Tooltip
                  content={`Publish a simulated ADF track to ${mqttConfig.publishTopic}`}
                  relationship="label"
                >
                  <Button
                    size="small"
                    appearance="secondary"
                    icon={<SendRegular />}
                    onClick={publishTestTrackToMqtt}
                  >
                    +1 via MQTT
                  </Button>
                </Tooltip>
              )}
            </div>
          }
          rightContent={
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.jsonl,.ndjson,.txt"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              {activeView === 'workbench' && (
                <Tooltip
                  content={
                    showJsonPane
                      ? 'Hide right JSON pane to give the center column more space'
                      : 'Show right JSON pane'
                  }
                  relationship="label"
                >
                  <Button
                    size="small"
                    appearance={showJsonPane ? 'subtle' : 'secondary'}
                    icon={<CodeRegular />}
                    onClick={() => setShowJsonPane((v) => !v)}
                  >
                    {showJsonPane ? 'Hide JSON' : 'Show JSON'}
                  </Button>
                </Tooltip>
              )}
              <Button
                size="small"
                appearance="subtle"
                icon={<FolderOpenRegular />}
                onClick={() => fileInputRef.current?.click()}
              >
                Load JSON/JSONL
              </Button>
              <Button
                size="small"
                appearance="subtle"
                icon={<ClipboardPasteRegular />}
                onClick={() => setImportModalOpen(true)}
              >
                Paste JSON
              </Button>
              <Tooltip content="Export current stream as .jsonl" relationship="label">
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<ArrowDownloadRegular />}
                  onClick={handleExportJsonl}
                  disabled={tracks.length === 0}
                >
                  Export
                </Button>
              </Tooltip>
              <Tooltip content="Open Analytics Data Format (ADF) documentation" relationship="label">
                <Button
                  as="a"
                  href={ADF_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  appearance="subtle"
                  icon={<BookOpenRegular />}
                >
                  ADF Docs ↗
                </Button>
              </Tooltip>
              <Tooltip content="Clear all tracks" relationship="label">
                <Button
                  size="small"
                  appearance="subtle"
                  icon={<DeleteRegular />}
                  onClick={handleClearTracks}
                  disabled={tracks.length === 0}
                />
              </Tooltip>
              <Tooltip
                content={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                relationship="label"
              >
                <Button
                  size="small"
                  appearance="subtle"
                  icon={isDark ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
                  onClick={() => setIsDark((d) => !d)}
                />
              </Tooltip>
            </>
          }
        />

        {/* View Mode Switcher & Demo Controls Bar */}
        <div className={styles.viewSwitcherBar}>
          <TabList
            size="small"
            selectedValue={activeView}
            onTabSelect={(_, data) => setActiveView(data.value as ViewMode)}
            aria-label="ADF Developer Sandbox Views"
          >
            <Tab value="workbench" icon={<TableRegular />}>
              Inspector Workbench
            </Tab>
            <Tab value="spatial" icon={<TargetRegular />}>
              Scene & Zone Sandbox
            </Tab>
            <Tab value="session" icon={<GridRegular />}>
              Session & Attribute Explorer
            </Tab>
          </TabList>

          <div className={styles.viewSwitcherRight}>
            <Tooltip
              content="Strip inline base64 JPEG snapshots across all views to inspect GDPR-safe metadata-only payloads and bandwidth"
              relationship="label"
            >
              <Switch
                label="Strip Snapshots (Metadata-Only)"
                checked={metadataOnlyMode}
                onChange={(_, d) => setMetadataOnlyMode(d.checked)}
              />
            </Tooltip>
            <Badge appearance="tint" color={metadataOnlyMode ? 'success' : 'informative'}>
              {effectiveTracks.length} tracks ·{' '}
              {formatBytes(effectiveTracks.reduce((s, t) => s + t.packetBytes, 0))}
              {metadataOnlyMode ? ' (No JPG)' : ''}
            </Badge>
            <Tooltip content="Generate 8 varied simulated ADF Object Tracks for testing" relationship="label">
              <Button
                size="small"
                appearance="secondary"
                icon={<AddRegular />}
                onClick={() => emitSampleBatch(8)}
              >
                +8 Sample Tracks
              </Button>
            </Tooltip>
            <Tooltip content="Restore the initial 5 curated sample Object Tracks" relationship="label">
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowResetRegular />}
                onClick={handleResetDemoData}
              >
                Reset Demo Data
              </Button>
            </Tooltip>
          </div>
        </div>

        <main className={styles.mainStage}>
          {activeView === 'spatial' && (
            <SpatialAnalyticsView
              tracks={effectiveTracks}
              selectedTrack={selectedTrack}
              onSelectTrack={setSelectedUid}
              onOpenInWorkbench={handleOpenInWorkbench}
            />
          )}

          {activeView === 'session' && (
            <ForensicGalleryView
              tracks={effectiveTracks}
              selectedTrack={selectedTrack}
              onSelectTrack={setSelectedUid}
              onOpenInWorkbench={handleOpenInWorkbench}
            />
          )}

          {activeView === 'workbench' && (
            <div
              className={mergeClasses(
                styles.workbench,
                !showJsonPane && styles.workbenchNoJson
              )}
            >
              {/* Left Pane: Stream Table */}
              <TrackTable
                tracks={filteredTracks}
                totalCount={effectiveTracks.length}
                selectedUid={selectedTrack?.uid ?? null}
                onSelectTrack={setSelectedUid}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                classFilter={classFilter}
                onClassFilterChange={setClassFilter}
                onlyWithSnapshot={onlyWithSnapshot}
                onOnlyWithSnapshotChange={setOnlyWithSnapshot}
                onResetFilters={() => {
                  setSearchQuery('');
                  setClassFilter('all');
                  setOnlyWithSnapshot(false);
                }}
              />

              {/* Center Pane: Scene Path Trajectory + Telemetry + Bandwidth + Snapshot */}
              <div className={mergeClasses(styles.centerPane, scrollStyles.scrollable)}>
                {selectedTrack ? (
                  <>
                    <div className={styles.trackSummaryBanner}>
                      <div className={styles.summaryTopRow}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Badge
                            appearance="filled"
                            color={getClassBadgeColor(selectedTrack.primaryClass)}
                            icon={getClassIcon(
                              selectedTrack.secondaryClasses[0]?.type || selectedTrack.primaryClass
                            )}
                          >
                            {selectedTrack.primaryClass.toUpperCase()}{' '}
                            {Math.round(selectedTrack.primaryConfidence * 100)}%
                          </Badge>
                          {selectedTrack.secondaryClasses.map((sc, idx) => (
                            <Badge key={idx} appearance="outline" color="warning">
                              {sc.type} {sc.confidence ? `${Math.round(sc.confidence * 100)}%` : ''}
                            </Badge>
                          ))}
                          <Text className={styles.monoId}>{selectedTrack.trackId}</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <Badge appearance="tint" color="informative">
                            Packet: {formatBytes(selectedTrack.packetBytes)}
                          </Badge>
                          {selectedTrack.mqttTopic && (
                            <Badge appearance="outline" color="success">
                              MQTT: {selectedTrack.mqttTopic}
                            </Badge>
                          )}
                          <Badge appearance="outline">Channel {selectedTrack.channelId}</Badge>
                          <Button
                            size="small"
                            appearance="subtle"
                            onClick={() => setAllSectionsCollapsed(!allSectionsCollapsed)}
                          >
                            {allSectionsCollapsed ? 'Expand All' : 'Collapse All'}
                          </Button>
                          <Button
                            size="small"
                            appearance={showJsonPane ? 'subtle' : 'secondary'}
                            icon={<CodeRegular />}
                            onClick={() => setShowJsonPane((v) => !v)}
                          >
                            {showJsonPane ? 'Hide JSON' : 'Show JSON'}
                          </Button>
                        </div>
                      </div>

                      <div className={styles.summaryMetricsRow}>
                        <span>
                          <strong>Start:</strong> {selectedTrack.startTime.slice(11, 23)}Z
                        </span>
                        <span>
                          <strong>End:</strong> {selectedTrack.endTime.slice(11, 23)}Z
                        </span>
                        <span>
                          <strong>Duration:</strong> {selectedTrack.durationSec.toFixed(3)}s
                        </span>
                        <span>
                          <strong>Path Points:</strong> {selectedTrack.observations.length}
                        </span>
                        <span>
                          <strong>Displacement:</strong>{' '}
                          {selectedTrack.displacementNormalized.toFixed(3)} scene units
                        </span>
                        <span>
                          <strong>Payload:</strong> {formatBytes(selectedTrack.packetBytes)} (JSON{' '}
                          {formatBytes(selectedTrack.metadataBytes)}
                          {selectedTrack.snapshotBase64Bytes > 0
                            ? ` + JPG ${formatBytes(selectedTrack.snapshotBase64Bytes)}`
                            : ''}
                          )
                        </span>
                      </div>
                    </div>

                    <TrackSceneCanvas
                      track={selectedTrack}
                      allTracks={filteredTracks}
                      collapsed={collapsedSections.trajectory}
                      onToggleCollapse={() => toggleSection('trajectory')}
                    />

                    <TrackTelemetryCard
                      track={selectedTrack}
                      collapsed={collapsedSections.telemetry}
                      onToggleCollapse={() => toggleSection('telemetry')}
                    />

                    <div className={showJsonPane ? styles.bottomCardsStacked : styles.bottomCardsGrid}>
                      <BandwidthComparisonCard
                        selectedTrack={selectedTrack}
                        allTracks={filteredTracks}
                        collapsed={collapsedSections.bandwidth}
                        onToggleCollapse={() => toggleSection('bandwidth')}
                      />

                      <SnapshotCard
                        track={selectedTrack}
                        collapsed={collapsedSections.snapshot}
                        onToggleCollapse={() => toggleSection('snapshot')}
                      />
                    </div>
                  </>
                ) : (
                  <EmptyView
                    title="No Object Track Selected"
                    description="Select an Object Track message from the table on the left to inspect its trajectory path, best snapshot JPG, and raw JSON."
                  />
                )}
              </div>

              {/* Right Pane: Syntax-Highlighted Raw JSON Tree View */}
              {showJsonPane &&
                (selectedTrack ? (
                  <JsonTreeView data={selectedTrack.raw} trackId={selectedTrack.uid} />
                ) : (
                  <EmptyView
                    title="No JSON Payload"
                    description="Select a message to inspect its JSON tree."
                  />
                ))}
            </div>
          )}
        </main>

        <footer className={styles.disclaimerFooter}>
          <div className={styles.disclaimerLeft}>
            <InfoRegular fontSize={14} />
            <span>
              <strong>Unofficial Community Tool:</strong> This is not a guaranteed or official
              service made by Axis Communications. All data is processed locally in your browser.
            </span>
          </div>
          <Link href={ADF_DOCS_URL} target="_blank" rel="noopener noreferrer" inline>
            Analytics Data Format (ADF) Specification ↗
          </Link>
        </footer>

        <ImportModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onImportText={handleImportText}
        />

        <MqttConnectModal
          open={mqttModalOpen}
          onClose={() => setMqttModalOpen(false)}
          config={mqttConfig}
          onChangeConfig={setMqttConfig}
          status={mqttStatus}
          errorMessage={mqttError}
          stats={mqttStats}
          onConnect={connectMqtt}
          onDisconnect={disconnectMqtt}
          onPublishTestTrack={publishTestTrackToMqtt}
        />
      </div>
    </FluentProvider>
  );
};
