import {
  AdfBoundingBox,
  AdfColorCandidate,
  AdfImageSnapshot,
  AdfObjectTrackMessage,
  AdfObservation,
  NormalizedTrackRecord,
} from '../types/adf';

export function getBoxCenter(box: AdfBoundingBox): { x: number; y: number } {
  return {
    x: (box.left + box.right) / 2,
    y: (box.top + box.bottom) / 2,
  };
}

export function getBoxFootPoint(box: AdfBoundingBox): { x: number; y: number } {
  return {
    x: (box.left + box.right) / 2,
    y: box.bottom,
  };
}

const UTF8_ENCODER = new TextEncoder();

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 1 && value >= 100 ? 0 : decimals)} ${units[i]}`;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Normalizes an arbitrary ADF `object_track` JSON payload (supporting `path` as well as `observations`,
 * `duration` and `duration_seconds`, `classes[].colors`, `parts`, etc.) into a `NormalizedTrackRecord`.
 */
export function normalizeTrackMessage(
  rawInput: unknown,
  indexFallback = 0,
  mqttTopicOverride?: string
): NormalizedTrackRecord | null {
  if (!rawInput || typeof rawInput !== 'object') {
    return null;
  }

  const obj = rawInput as Record<string, unknown>;

  // Support MQTT wrapper envelope `{ topic: "...", payload: { ... } }` or `{ track: { ... } }`
  const payload = (
    obj.payload && typeof obj.payload === 'object' && !Array.isArray(obj.payload)
      ? obj.payload
      : obj.track && typeof obj.track === 'object' && !Array.isArray(obj.track)
        ? obj.track
        : obj
  ) as AdfObjectTrackMessage;

  const mqttTopic =
    (mqttTopicOverride && mqttTopicOverride.trim()) ||
    (typeof obj.topic === 'string' && obj.topic.trim() ? obj.topic.trim() : undefined) ||
    (typeof payload.topic === 'string' && payload.topic.trim() ? payload.topic.trim() : undefined);

  const trackId =
    typeof payload.id === 'string'
      ? payload.id
      : typeof (payload as Record<string, unknown>).track_id === 'string'
        ? String((payload as Record<string, unknown>).track_id)
        : `track-${indexFallback + 1}`;

  const channelId =
    typeof payload.channel_id === 'number'
      ? payload.channel_id
      : typeof (payload as Record<string, unknown>).channel === 'number'
        ? Number((payload as Record<string, unknown>).channel)
        : 1;

  // Support `path` (official ADF object_track field), `observations`, or `trajectory`
  const rawPathArray = Array.isArray(payload.path)
    ? payload.path
    : Array.isArray(payload.observations)
      ? payload.observations
      : Array.isArray((payload as Record<string, unknown>).trajectory)
        ? ((payload as Record<string, unknown>).trajectory as unknown[])
        : [];

  const observations: AdfObservation[] = rawPathArray
    .map((o: unknown): AdfObservation | null => {
      if (!o || typeof o !== 'object') return null;
      const rec = o as Record<string, unknown>;
      const bboxRaw = (rec.bounding_box ?? rec.bbox) as Record<string, unknown> | undefined;
      if (!bboxRaw || typeof bboxRaw !== 'object') return null;

      const top = Number(bboxRaw.top ?? bboxRaw.y ?? 0);
      const left = Number(bboxRaw.left ?? bboxRaw.x ?? 0);
      const bottom = Number(
        bboxRaw.bottom ?? (bboxRaw.height !== undefined ? top + Number(bboxRaw.height) : top + 0.1)
      );
      const right = Number(
        bboxRaw.right ?? (bboxRaw.width !== undefined ? left + Number(bboxRaw.width) : left + 0.1)
      );

      const bounding_box: AdfBoundingBox = {
        top: round4(top),
        right: round4(right),
        bottom: round4(bottom),
        left: round4(left),
      };

      return {
        timestamp: typeof rec.timestamp === 'string' ? rec.timestamp : new Date().toISOString(),
        bounding_box,
        center_of_gravity:
          rec.center_of_gravity && typeof rec.center_of_gravity === 'object'
            ? (rec.center_of_gravity as { x: number; y: number })
            : getBoxCenter(bounding_box),
        foot_point: getBoxFootPoint(bounding_box),
        speed: typeof rec.speed === 'number' ? rec.speed : undefined,
        image_id: typeof rec.image_id === 'string' ? rec.image_id : undefined,
      };
    })
    .filter((item): item is AdfObservation => item !== null);

  // If payload has top-level `bounding_box` or `image.crop_box` but empty `path`/`observations`, synthesize 1 point
  const fallbackBox = payload.bounding_box ?? payload.image?.crop_box;
  if (observations.length === 0 && fallbackBox) {
    observations.push({
      timestamp:
        payload.image?.timestamp || payload.end_time || payload.start_time || new Date().toISOString(),
      bounding_box: fallbackBox,
      center_of_gravity: getBoxCenter(fallbackBox),
      foot_point: getBoxFootPoint(fallbackBox),
    });
  }

  const startTime =
    typeof payload.start_time === 'string'
      ? payload.start_time
      : observations[0]?.timestamp ?? new Date().toISOString();

  const endTime =
    typeof payload.end_time === 'string'
      ? payload.end_time
      : observations[observations.length - 1]?.timestamp ?? startTime;

  const startMs = Date.parse(startTime);
  const endMs = Date.parse(endTime);
  const durationSec =
    typeof payload.duration === 'number'
      ? payload.duration
      : typeof payload.duration_seconds === 'number'
        ? payload.duration_seconds
        : !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs
          ? Math.max(0, (endMs - startMs) / 1000)
          : 0;

  // Extract classes, candidate scores, and color / attribute distributions
  let primaryClass = 'unknown';
  let primaryConfidence = 0;
  const secondaryClasses: Array<{ type: string; confidence: number }> = [];
  const attributesSummary: Array<{ key: string; value: string; confidence?: number }> = [];

  if (Array.isArray(payload.classes) && payload.classes.length > 0) {
    const sorted = [...payload.classes].sort(
      (a, b) => (b.score ?? b.probability ?? 0) - (a.score ?? a.probability ?? 0)
    );
    const first = sorted[0];
    primaryClass = first.type || 'unknown';
    primaryConfidence = first.score ?? first.probability ?? 0;

    sorted.slice(1).forEach((c) => {
      secondaryClasses.push({
        type: c.type,
        confidence: c.score ?? c.probability ?? 0,
      });
    });

    // Extract colors from the top class candidate (e.g. `colors: [{ name: "gray", score: 0.5811 }, ...]`)
    const addColorList = (label: string, list?: AdfColorCandidate[]) => {
      if (!Array.isArray(list) || list.length === 0) return;
      const topColors = [...list]
        .filter((c) => c && typeof c.name === 'string')
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 2);
      topColors.forEach((col, i) => {
        if (i === 0 || (col.score ?? 0) >= 0.25) {
          attributesSummary.push({
            key: i === 0 ? label : `${label}_2`,
            value: col.name,
            confidence: col.score,
          });
        }
      });
    };

    addColorList('color', first.colors);
    addColorList('upper_color', first.upper_clothing_colors);
    addColorList('lower_color', first.lower_clothing_colors);

    sorted.forEach((c) => {
      if (Array.isArray(c.sub_classes)) {
        c.sub_classes.forEach((sub) => {
          secondaryClasses.push({
            type: sub.type,
            confidence: sub.score ?? 0,
          });
        });
      }
      if (c.attributes) {
        if (Array.isArray(c.attributes)) {
          c.attributes.forEach((attr) => {
            const k = attr.name || attr.type || 'attribute';
            const v = String(attr.value ?? '');
            if (v) {
              attributesSummary.push({
                key: k,
                value: v,
                confidence: attr.score ?? attr.probability,
              });
            }
          });
        } else if (typeof c.attributes === 'object') {
          Object.entries(c.attributes).forEach(([k, v]) => {
            if (v && typeof v === 'object' && 'value' in (v as Record<string, unknown>)) {
              const vo = v as { value: unknown; score?: number; probability?: number };
              attributesSummary.push({
                key: k,
                value: String(vo.value),
                confidence: vo.score ?? vo.probability,
              });
            } else if (v !== undefined && v !== null) {
              attributesSummary.push({ key: k, value: String(v) });
            }
          });
        }
      }
    });
  } else if (payload.class && typeof payload.class === 'object') {
    primaryClass = payload.class.primary || 'unknown';
    primaryConfidence = payload.class.probability ?? payload.class.score ?? 0;
    if (payload.class.attributes && typeof payload.class.attributes === 'object') {
      Object.entries(payload.class.attributes).forEach(([k, v]) => {
        attributesSummary.push({ key: k, value: String(v) });
      });
    }
  }

  // Snapshot extraction
  const rawImg = (payload.image ?? payload.best_snapshot) as AdfImageSnapshot | undefined;
  let snapshot: AdfImageSnapshot | undefined;
  if (rawImg && typeof rawImg === 'object') {
    snapshot = {
      id: rawImg.id || `${trackId}-snap`,
      timestamp: rawImg.timestamp || endTime,
      crop_box:
        rawImg.crop_box ||
        payload.bounding_box ||
        observations[Math.floor(observations.length / 2)]?.bounding_box || {
          top: 0.2,
          left: 0.2,
          bottom: 0.6,
          right: 0.5,
        },
      data: typeof rawImg.data === 'string' ? rawImg.data : undefined,
      mime_type: rawImg.mime_type || 'image/jpeg',
      width: rawImg.width,
      height: rawImg.height,
      quality_score: rawImg.quality_score,
    };
  }

  // Compute path length & displacement across observations
  let pathLengthNormalized = 0;
  for (let i = 1; i < observations.length; i++) {
    const p0 = getBoxFootPoint(observations[i - 1].bounding_box);
    const p1 = getBoxFootPoint(observations[i].bounding_box);
    pathLengthNormalized += Math.hypot(p1.x - p0.x, p1.y - p0.y);
  }

  let displacementNormalized = 0;
  let headingDegrees = 0;
  if (observations.length >= 2) {
    const firstPt = getBoxFootPoint(observations[0].bounding_box);
    const lastPt = getBoxFootPoint(observations[observations.length - 1].bounding_box);
    const dx = lastPt.x - firstPt.x;
    const dy = lastPt.y - firstPt.y;
    displacementNormalized = Math.hypot(dx, dy);
    headingDegrees = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
  }

  const summaryBox =
    payload.bounding_box ??
    snapshot?.crop_box ??
    observations[observations.length - 1]?.bounding_box;

  const partsCount = Array.isArray(payload.parts) ? payload.parts.length : 0;

  // Compute exact UTF-8 byte sizes for the packet, metadata-only portion, and inline snapshot
  const packetBytes = UTF8_ENCODER.encode(JSON.stringify(payload)).length;
  const snapshotBase64Bytes = snapshot?.data ? UTF8_ENCODER.encode(snapshot.data).length : 0;
  const metadataBytes = Math.max(0, packetBytes - snapshotBase64Bytes);
  const rawBase64 = snapshot?.data
    ? snapshot.data.includes(';base64,')
      ? snapshot.data.slice(snapshot.data.indexOf(';base64,') + 8)
      : snapshot.data
    : '';
  const paddingBytes = rawBase64.endsWith('==') ? 2 : rawBase64.endsWith('=') ? 1 : 0;
  const snapshotDecodedBytes = rawBase64
    ? Math.max(0, Math.floor((rawBase64.length * 3) / 4) - paddingBytes)
    : 0;

  return {
    uid: `${trackId}-${endTime}-${indexFallback}`,
    trackId,
    channelId,
    startTime,
    endTime,
    durationSec,
    primaryClass,
    primaryConfidence,
    secondaryClasses,
    attributesSummary,
    observations,
    partsCount,
    summaryBox,
    snapshot,
    pathLengthNormalized,
    displacementNormalized,
    headingDegrees,
    packetBytes,
    metadataBytes,
    snapshotBase64Bytes,
    snapshotDecodedBytes,
    ...(mqttTopic ? { mqttTopic } : {}),
    raw: payload,
  };
}

/**
 * Parses a text input that may be a JSON array, a single JSON object, or JSON Lines (.jsonl).
 */
export function parseAdfTextInput(
  text: string,
  mqttTopicOverride?: string,
  indexOffset = 0
): NormalizedTrackRecord[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const records: NormalizedTrackRecord[] = [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      parsed.forEach((item, idx) => {
        const norm = normalizeTrackMessage(item, indexOffset + idx, mqttTopicOverride);
        if (norm) records.push(norm);
      });
      return records;
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.tracks)) {
        obj.tracks.forEach((item, idx) => {
          const norm = normalizeTrackMessage(item, indexOffset + idx, mqttTopicOverride);
          if (norm) records.push(norm);
        });
        return records;
      }
      if (Array.isArray(obj.messages)) {
        obj.messages.forEach((item, idx) => {
          const norm = normalizeTrackMessage(item, indexOffset + idx, mqttTopicOverride);
          if (norm) records.push(norm);
        });
        return records;
      }
      const single = normalizeTrackMessage(parsed, indexOffset, mqttTopicOverride);
      if (single) return [single];
    }
  } catch {
    // Fall through to JSONL line-by-line parsing
  }

  const lines = trimmed.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const clean = line.trim();
    if (!clean || clean.startsWith('//') || clean.startsWith('#')) return;
    try {
      const obj = JSON.parse(clean);
      const norm = normalizeTrackMessage(obj, indexOffset + idx, mqttTopicOverride);
      if (norm) records.push(norm);
    } catch {
      // Ignore malformed line
    }
  });

  return records;
}
