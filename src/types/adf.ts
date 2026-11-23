/**
 * Axis Analytics Data Format (ADF) v1.0 — Object Track (`com.axis.scene.object_track.v1`)
 * Reference: https://developer.axis.com/analytics/axis-scene-metadata/reference/data-formats/analytics-data-format/
 */

export interface AdfBoundingBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AdfColorCandidate {
  name: string;
  score: number;
}

export interface AdfClassAttribute {
  name?: string;
  type?: string;
  value?: string;
  score?: number;
  probability?: number;
  [key: string]: unknown;
}

export interface AdfClassCandidate {
  type: string;
  score?: number;
  probability?: number;
  colors?: AdfColorCandidate[];
  upper_clothing_colors?: AdfColorCandidate[];
  lower_clothing_colors?: AdfColorCandidate[];
  attributes?: Record<string, unknown> | AdfClassAttribute[];
  sub_classes?: Array<{ type: string; score?: number }>;
  [key: string]: unknown;
}

export interface AdfObservation {
  timestamp: string;
  bounding_box: AdfBoundingBox;
  center_of_gravity?: { x: number; y: number };
  foot_point?: { x: number; y: number };
  speed?: number;
  direction?: { x: number; y: number };
  image_id?: string;
}

export interface AdfImageSnapshot {
  id: string;
  timestamp: string;
  crop_box: AdfBoundingBox;
  /** Base64 encoded JPEG image bytes */
  data?: string;
  mime_type?: string;
  width?: number;
  height?: number;
  quality_score?: number;
}

export interface AdfObjectTrackPart {
  object_track_id: string;
  [key: string]: unknown;
}

export interface AdfObjectTrackMessage {
  $schema?: string;
  topic?: string;
  id: string;
  channel_id: number;
  start_time: string;
  end_time: string;
  duration?: number;
  duration_seconds?: number;
  classes?: AdfClassCandidate[];
  class?: {
    primary: string;
    probability?: number;
    score?: number;
    attributes?: Record<string, unknown>;
  };
  bounding_box?: AdfBoundingBox;
  /** Official ADF v1.0 field for chronological track positions */
  path?: AdfObservation[];
  /** Legacy / alternate field alias */
  observations?: AdfObservation[];
  parts?: AdfObjectTrackPart[];
  image?: AdfImageSnapshot;
  best_snapshot?: AdfImageSnapshot;
  analytics_metadata?: {
    device_serial?: string;
    scene_name?: string;
    min_speed_mps?: number;
    max_speed_mps?: number;
    avg_speed_mps?: number;
    zone_entered?: string[];
    line_crossed?: string;
  };
  [key: string]: unknown;
}

/**
 * Normalized helper representation derived from any raw ADF Object Track JSON object
 * so the table, trajectory canvas, and snapshot viewer handle all schema variations cleanly.
 */
export interface NormalizedTrackRecord {
  uid: string;
  trackId: string;
  channelId: number;
  startTime: string;
  endTime: string;
  durationSec: number;
  primaryClass: string;
  primaryConfidence: number;
  secondaryClasses: Array<{ type: string; confidence: number }>;
  attributesSummary: Array<{ key: string; value: string; confidence?: number }>;
  observations: AdfObservation[];
  partsCount: number;
  summaryBox?: AdfBoundingBox;
  snapshot?: AdfImageSnapshot;
  pathLengthNormalized: number;
  displacementNormalized: number;
  headingDegrees: number;
  /** Total UTF-8 JSON byte size of the ADF object_track message */
  packetBytes: number;
  /** UTF-8 JSON byte size excluding inline base64 snapshot data */
  metadataBytes: number;
  /** UTF-8 byte size of the inline base64 snapshot string (0 if none) */
  snapshotBase64Bytes: number;
  /** Decoded binary JPEG byte count (0 if none) */
  snapshotDecodedBytes: number;
  /** Optional MQTT topic on which this message arrived */
  mqttTopic?: string;
  raw: AdfObjectTrackMessage;
}
