import React from 'react';
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
  Input,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  PlugConnectedRegular,
  PlugDisconnectedRegular,
  WarningRegular,
} from '@fluentui/react-icons';
import { formatBytes } from '../utils/adfParser';

export type MqttConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MqttConnectionConfig {
  brokerUrl: string;
  topics: string;
  protocolVersion: 5 | 4;
  qos: 0 | 1 | 2;
  clientId: string;
  username: string;
  password: string;
}

export interface MqttRecentEvent {
  id: string;
  timestamp: string;
  topic: string;
  bytes: number;
  parsedTracks: number;
  note?: string;
}

export interface MqttStats {
  messagesReceived: number;
  tracksParsed: number;
  bytesReceived: number;
  lastTopic: string | null;
  lastMessageTime: string | null;
  recentEvents: MqttRecentEvent[];
}

export const DEFAULT_MQTT_CONFIG: MqttConnectionConfig = {
  brokerUrl: '',
  topics: 'axis/+/scene/object_track/#',
  protocolVersion: 5,
  qos: 0,
  clientId: `adf-viewer-${Math.random().toString(16).slice(2, 8)}`,
  username: '',
  password: '',
};

export const INITIAL_MQTT_STATS: MqttStats = {
  messagesReceived: 0,
  tracksParsed: 0,
  bytesReceived: 0,
  lastTopic: null,
  lastMessageTime: null,
  recentEvents: [],
};

export function parseTopicFilterList(topicsInput: string): string[] {
  return topicsInput
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  gridTwo: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalM,
  },
  gridThree: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: tokens.spacingHorizontalS,
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalS,
    marginTop: '4px',
  },
  statCell: {
    display: 'flex',
    flexDirection: 'column',
    padding: '6px 8px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  statValue: {
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  warningBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    fontSize: tokens.fontSizeBase200,
  },
  errorBox: {
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.45)',
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    wordBreak: 'break-word',
  },
  logBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxHeight: '110px',
    overflowY: 'auto',
    padding: '6px 8px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: '11px',
  },
  logLine: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
  },
  detailsBox: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
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
    fontFamily: 'Consolas, "SFMono-Regular", Menlo, monospace',
    fontSize: '11.5px',
    overflowX: 'auto',
  },
});

export interface MqttConnectModalProps {
  open: boolean;
  onClose: () => void;
  config: MqttConnectionConfig;
  onChangeConfig: (next: MqttConnectionConfig) => void;
  status: MqttConnectionStatus;
  errorMessage: string | null;
  stats: MqttStats;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const MqttConnectModal: React.FC<MqttConnectModalProps> = ({
  open,
  onClose,
  config,
  onChangeConfig,
  status,
  errorMessage,
  stats,
  onConnect,
  onDisconnect,
}) => {
  const styles = useStyles();

  const updateField = <K extends keyof MqttConnectionConfig>(
    key: K,
    value: MqttConnectionConfig[K]
  ) => {
    onChangeConfig({ ...config, [key]: value });
  };

  const isHttpsPage =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  const trimmedUrl = config.brokerUrl.trim().toLowerCase();
  const isLocalhostWs =
    trimmedUrl.startsWith('ws://localhost') ||
    trimmedUrl.startsWith('ws://127.0.0.1') ||
    trimmedUrl.startsWith('ws://[::1]');
  const showMixedContentWarning =
    isHttpsPage && trimmedUrl.startsWith('ws://') && !isLocalhostWs;

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const statusBadge =
    status === 'connected' ? (
      <Badge appearance="filled" color="success">
        Connected
      </Badge>
    ) : status === 'connecting' ? (
      <Badge appearance="tint" color="warning">
        Connecting…
      </Badge>
    ) : status === 'error' ? (
      <Badge appearance="filled" color="danger">
        Error
      </Badge>
    ) : (
      <Badge appearance="outline" color="subtle">
        Disconnected
      </Badge>
    );

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface style={{ maxWidth: '720px', width: '94vw' }}>
        <DialogBody>
          <DialogTitle>Live MQTT Broker Connection</DialogTitle>
          <DialogContent className={styles.content}>
            <Field label="Broker WebSocket URL">
              <Input
                value={config.brokerUrl}
                onChange={(_, d) => updateField('brokerUrl', d.value)}
                placeholder="wss://broker.example.com:8084/mqtt or ws://localhost:9001"
                disabled={isConnected || isConnecting}
              />
            </Field>

            {showMixedContentWarning && (
              <div className={styles.warningBox}>
                <WarningRegular fontSize={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span>
                  <strong>Mixed Content Notice:</strong> This page is loaded over{' '}
                  <code>https://</code>, so browsers block unencrypted <code>ws://</code>{' '}
                  connections to non-localhost hosts. Use a <code>wss://</code> broker URL or{' '}
                  <code>ws://localhost:9001</code>.
                </span>
              </div>
            )}

            <Field
              label="Subscribed Topic Filter"
              hint="Supports + and # wildcards (comma-separated for multiple)"
            >
              <Input
                value={config.topics}
                onChange={(_, d) => updateField('topics', d.value)}
                placeholder="axis/+/scene/object_track/#"
                disabled={isConnected || isConnecting}
              />
            </Field>

            <div className={styles.gridThree}>
              <Field label="Protocol Version">
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button
                    size="small"
                    appearance={config.protocolVersion === 5 ? 'primary' : 'outline'}
                    disabled={isConnected || isConnecting}
                    onClick={() => updateField('protocolVersion', 5)}
                  >
                    MQTT v5.0
                  </Button>
                  <Button
                    size="small"
                    appearance={config.protocolVersion === 4 ? 'primary' : 'outline'}
                    disabled={isConnected || isConnecting}
                    onClick={() => updateField('protocolVersion', 4)}
                  >
                    v3.1.1
                  </Button>
                </div>
              </Field>

              <Field label="QoS Level">
                <div style={{ display: 'flex', gap: '4px' }}>
                  {([0, 1, 2] as const).map((q) => (
                    <Button
                      key={q}
                      size="small"
                      appearance={config.qos === q ? 'primary' : 'outline'}
                      disabled={isConnected || isConnecting}
                      onClick={() => updateField('qos', q)}
                    >
                      QoS {q}
                    </Button>
                  ))}
                </div>
              </Field>

              <Field label="Client ID">
                <Input
                  value={config.clientId}
                  onChange={(_, d) => updateField('clientId', d.value)}
                  disabled={isConnected || isConnecting}
                />
              </Field>
            </div>

            <div className={styles.gridTwo}>
              <Field label="Username (optional)">
                <Input
                  value={config.username}
                  onChange={(_, d) => updateField('username', d.value)}
                  placeholder="Optional broker username"
                  disabled={isConnected || isConnecting}
                />
              </Field>

              <Field label="Password (optional)">
                <Input
                  type="password"
                  value={config.password}
                  onChange={(_, d) => updateField('password', d.value)}
                  placeholder="Optional broker password"
                  disabled={isConnected || isConnecting}
                />
              </Field>
            </div>

            {/* Live Status & Metrics Banner */}
            <div className={styles.statusBanner}>
              <div className={styles.statusTopRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text weight="semibold">Session Status:</Text>
                  {statusBadge}
                  {config.brokerUrl.trim() && (
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      {config.brokerUrl.trim()}
                    </Text>
                  )}
                </div>
              </div>

              {errorMessage && <div className={styles.errorBox}>{errorMessage}</div>}

              <div className={styles.statsGrid}>
                <div className={styles.statCell}>
                  <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                    Messages Received
                  </Text>
                  <Text className={styles.statValue}>{stats.messagesReceived}</Text>
                </div>
                <div className={styles.statCell}>
                  <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                    ADF Tracks Parsed
                  </Text>
                  <Text className={styles.statValue}>{stats.tracksParsed}</Text>
                </div>
                <div className={styles.statCell}>
                  <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                    Total MQTT Traffic
                  </Text>
                  <Text className={styles.statValue}>{formatBytes(stats.bytesReceived)}</Text>
                </div>
                <div className={styles.statCell}>
                  <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                    Last Topic
                  </Text>
                  <Text className={styles.statValue} title={stats.lastTopic ?? undefined}>
                    {stats.lastTopic || '—'}
                  </Text>
                </div>
              </div>

              {stats.recentEvents.length > 0 && (
                <div className={styles.logBox}>
                  {stats.recentEvents.map((ev) => (
                    <div key={ev.id} className={styles.logLine}>
                      <span>
                        [{ev.timestamp}] <strong>{ev.topic}</strong>
                        {ev.note ? ` (${ev.note})` : ''}
                      </span>
                      <span>
                        {formatBytes(ev.bytes)} • {ev.parsedTracks} track
                        {ev.parsedTracks === 1 ? '' : 's'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <details className={styles.detailsBox}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Local Mosquitto WebSocket Quick-Reference (mosquitto.conf)
              </summary>
              <Text size={200} block style={{ marginTop: '4px' }}>
                Browsers connect to MQTT brokers over WebSockets (not raw TCP port 1883). Add a
                WebSocket listener to your local <code>mosquitto.conf</code>:
              </Text>
              <pre className={styles.preCode}>{`listener 1883
protocol mqtt

listener 9001
protocol websockets
allow_anonymous true`}</pre>
            </details>
          </DialogContent>

          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Close
            </Button>
            {isConnected || isConnecting ? (
              <Button
                appearance="primary"
                icon={<PlugDisconnectedRegular />}
                onClick={onDisconnect}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                appearance="primary"
                icon={<PlugConnectedRegular />}
                onClick={onConnect}
                disabled={
                  !config.brokerUrl.trim() ||
                  parseTopicFilterList(config.topics).length === 0
                }
              >
                Connect to Broker
              </Button>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
