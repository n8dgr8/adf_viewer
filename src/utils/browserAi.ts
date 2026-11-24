import { NormalizedTrackRecord } from '../types/adf';
import { getBoxFootPoint } from './adfParser';
import { headingToCompassLabel } from '../components/views/adfViewHelpers';

export type BrowserAiAvailabilityStatus =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'text-only'
  | 'unavailable';

export interface BrowserAiAvailabilityInfo {
  status: BrowserAiAvailabilityStatus;
  multimodalSupported: boolean;
  message: string;
}

export interface BrowserAiInferenceResult {
  objectSummary: string;
  subtypeOrMakeModel: string;
  apparentSurfaceOrBackground: string;
  observedAttributes: Array<{ label: string; value: string }>;
  edgeClassificationMatch: 'confirmed' | 'refined' | 'discrepancy';
  edgeMatchExplanation: string;
  sceneAssessment: 'normal' | 'unusual' | 'anomaly';
  sceneAssessmentHeadline: string;
  sceneObservations: string[];
}

export interface BrowserAiInferenceStats {
  sessionInitMs: number;
  inferenceMs: number;
  totalMs: number;
  promptChars: number;
  responseChars: number;
  charsPerSec: number;
  inputUsageTokens: number | null;
  inputQuotaTokens: number | null;
  imageWidth: number;
  imageHeight: number;
  imageBytes: number;
  usedMultimodalImage: boolean;
}

export interface BrowserAiAnalysisOutput {
  result: BrowserAiInferenceResult;
  stats: BrowserAiInferenceStats;
  rawResponseText: string;
  systemPrompt: string;
  userPrompt: string;
  telemetryDigest: string;
}

export interface ScenePreset {
  id: string;
  label: string;
  description: string;
}

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'residential-driveway',
    label: 'Residential Driveway & Lawn',
    description:
      'Residential front yard camera. Top region (y: 0.0–0.40) is a public street running east-west. Center-right (x: 0.50–1.0, y: 0.40–0.90) is a paved concrete driveway. Bottom-left (x: 0.0–0.50, y: 0.45–1.0) is a grass lawn with a tree where vehicles should never drive or park.',
  },
  {
    id: 'loading-bay',
    label: 'Commercial Loading Bay',
    description:
      'Warehouse loading dock. Left/center (x: 0.0–0.70) is an asphalt truck bay. Right side (x: 0.70–1.0) is a marked pedestrian walkway where motor vehicles and trucks are prohibited.',
  },
  {
    id: 'pedestrian-plaza',
    label: 'Pedestrian & Bike Walkway',
    description:
      'Car-free pedestrian plaza and bicycle path. Humans and bicycles are expected; any car, truck, or motor vehicle in this scene or off paved paths is an anomaly.',
  },
];

interface ChromeLanguageModelSession {
  prompt(input: unknown, options?: { responseConstraint?: unknown; signal?: AbortSignal }): Promise<string>;
  destroy?: () => void;
  inputUsage?: number;
  inputQuota?: number;
  tokensSoFar?: number;
  maxTokens?: number;
}

interface ChromeLanguageModelApi {
  availability(options?: {
    expectedInputs?: Array<{ type: string; languages?: string[] }>;
    expectedOutputs?: Array<{ type: string; languages?: string[] }>;
  }): Promise<string>;
  create(options?: {
    initialPrompts?: Array<{ role: string; content: string }>;
    expectedInputs?: Array<{ type: string; languages?: string[] }>;
    expectedOutputs?: Array<{ type: string; languages?: string[] }>;
    signal?: AbortSignal;
  }): Promise<ChromeLanguageModelSession>;
}

function getLanguageModelApi(): ChromeLanguageModelApi | null {
  const g = globalThis as unknown as {
    LanguageModel?: ChromeLanguageModelApi;
    ai?: { languageModel?: ChromeLanguageModelApi };
  };
  return g.LanguageModel ?? g.ai?.languageModel ?? null;
}

function normalizeAvailabilityString(raw: unknown): BrowserAiAvailabilityStatus {
  const val = String(raw || '').toLowerCase();
  if (val === 'available' || val === 'readily') return 'available';
  if (val === 'downloadable' || val === 'after-download') return 'downloadable';
  if (val === 'downloading') return 'downloading';
  return 'unavailable';
}

/**
 * Checks whether Chrome's built-in Prompt API (`LanguageModel`) is available with multimodal image input.
 */
export async function checkBrowserAiAvailability(): Promise<BrowserAiAvailabilityInfo> {
  const api = getLanguageModelApi();
  if (!api || typeof api.availability !== 'function') {
    return {
      status: 'unavailable',
      multimodalSupported: false,
      message: 'Chrome Prompt API (LanguageModel) is not exposed in this browser.',
    };
  }

  try {
    const mmRaw = await api.availability({
      expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });
    const mmStatus = normalizeAvailabilityString(mmRaw);

    if (mmStatus === 'available') {
      return {
        status: 'available',
        multimodalSupported: true,
        message: 'Gemini Nano multimodal Prompt API is ready on this device.',
      };
    }
    if (mmStatus === 'downloadable') {
      return {
        status: 'downloadable',
        multimodalSupported: true,
        message: 'Gemini Nano multimodal model is supported and will download on first run.',
      };
    }
    if (mmStatus === 'downloading') {
      return {
        status: 'downloading',
        multimodalSupported: true,
        message: 'Gemini Nano model is currently downloading in Chrome.',
      };
    }
  } catch {
    // Fall through to text-only probe
  }

  try {
    const textRaw = await api.availability();
    const textStatus = normalizeAvailabilityString(textRaw);
    if (textStatus !== 'unavailable') {
      return {
        status: 'text-only',
        multimodalSupported: false,
        message:
          'Prompt API is enabled for text only. Enable chrome://flags/#prompt-api-for-gemini-nano-multimodal-input for snapshot analysis.',
      };
    }
  } catch {
    // Ignore and return unavailable
  }

  return {
    status: 'unavailable',
    multimodalSupported: false,
    message:
      'Built-in Gemini Nano model is unavailable. Check Chrome flags or hardware requirements.',
  };
}

function describeSceneRegion(pt: { x: number; y: number }): string {
  const xBucket = pt.x < 0.34 ? 'left' : pt.x > 0.66 ? 'right' : 'center';
  const yBucket = pt.y < 0.34 ? 'top' : pt.y > 0.66 ? 'bottom' : 'middle';
  const region = yBucket === 'middle' && xBucket === 'center' ? 'center' : `${yBucket}-${xBucket}`;
  return `${region} (${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`;
}

/**
 * Produces a concise spatial, temporal, and edge-classification summary for LLM prompting.
 */
export function buildTrackTelemetryDigest(track: NormalizedTrackRecord): string {
  const lines: string[] = [];

  const secondaryDesc =
    track.secondaryClasses.length > 0
      ? ` | Alt candidates: ${track.secondaryClasses
          .slice(0, 3)
          .map((s) => `${s.type} ${Math.round(s.confidence * 100)}%`)
          .join(', ')}`
      : '';
  lines.push(
    `Edge Classification: ${track.primaryClass} (${Math.round(track.primaryConfidence * 100)}% confidence)${secondaryDesc}`
  );

  if (track.attributesSummary.length > 0) {
    lines.push(
      `Edge Attributes: ${track.attributesSummary
        .map(
          (a) =>
            `${a.key}=${a.value}${a.confidence !== undefined ? `(${Math.round(a.confidence * 100)}%)` : ''}`
        )
        .join(', ')}`
    );
  }

  const obs = track.observations;
  if (obs.length > 0) {
    const startPt = getBoxFootPoint(obs[0].bounding_box);
    const endPt = getBoxFootPoint(obs[obs.length - 1].bounding_box);
    const compass = headingToCompassLabel(track.headingDegrees);
    const tortuosity =
      track.pathLengthNormalized / Math.max(0.001, track.displacementNormalized);
    const motionPattern =
      tortuosity > 3.0
        ? 'high tortuosity (pacing / loitering / circling)'
        : tortuosity > 1.8
          ? 'curved or meandering path'
          : 'direct trajectory';

    lines.push(
      `Trajectory: Entered at ${describeSceneRegion(startPt)}, exited at ${describeSceneRegion(endPt)}, heading ${compass} (${Math.round(track.headingDegrees)}°).`
    );
    lines.push(
      `Timing & Motion: Duration ${track.durationSec.toFixed(2)}s across ${obs.length} observations; path length ${track.pathLengthNormalized.toFixed(3)}u, net displacement ${track.displacementNormalized.toFixed(3)}u (${tortuosity.toFixed(2)}x ratio — ${motionPattern}).`
    );
  } else {
    lines.push(`Timing: Duration ${track.durationSec.toFixed(2)}s (no path observations).`);
  }

  if (track.snapshot?.crop_box) {
    const cb = track.snapshot.crop_box;
    const snapCenter = {
      x: (cb.left + cb.right) / 2,
      y: (cb.top + cb.bottom) / 2,
    };
    lines.push(
      `Snapshot Crop Box: ${describeSceneRegion(snapCenter)} [L:${cb.left.toFixed(3)}, T:${cb.top.toFixed(3)}, R:${cb.right.toFixed(3)}, B:${cb.bottom.toFixed(3)}].`
    );
  }

  if (track.raw.analytics_metadata?.scene_name) {
    lines.push(`Camera Scene Tag: ${track.raw.analytics_metadata.scene_name}`);
  }

  return lines.join('\n');
}

export const BROWSER_AI_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    objectSummary: { type: 'string' },
    subtypeOrMakeModel: { type: 'string' },
    apparentSurfaceOrBackground: { type: 'string' },
    observedAttributes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['label', 'value'],
      },
    },
    edgeClassificationMatch: {
      type: 'string',
      enum: ['confirmed', 'refined', 'discrepancy'],
    },
    edgeMatchExplanation: { type: 'string' },
    sceneAssessment: {
      type: 'string',
      enum: ['normal', 'unusual', 'anomaly'],
    },
    sceneAssessmentHeadline: { type: 'string' },
    sceneObservations: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [
    'objectSummary',
    'subtypeOrMakeModel',
    'apparentSurfaceOrBackground',
    'observedAttributes',
    'edgeClassificationMatch',
    'edgeMatchExplanation',
    'sceneAssessment',
    'sceneAssessmentHeadline',
    'sceneObservations',
  ],
} as const;

export function buildBrowserAiPrompts(params: {
  track: NormalizedTrackRecord;
  sceneDescription: string;
  telemetryDigest?: string;
}): { systemPrompt: string; userPrompt: string; telemetryDigest: string } {
  const telemetryDigest = params.telemetryDigest ?? buildTrackTelemetryDigest(params.track);
  const trimmedScene = params.sceneDescription.trim();

  const systemPrompt = [
    'You are an edge computer-vision and physical-security analyst inspecting Axis Analytics Data Format (ADF) Object Track metadata paired with its cropped best_snapshot image.',
    'Coordinates in ADF telemetry are normalized [0.0..1.0], where (0,0) is top-left and (1,1) is bottom-right of the camera field of view.',
    'Your job is to:',
    '1. Describe fine-grained visual attributes visible in the snapshot (for vehicles: body style, approximate make/model/era if identifiable, markings, lights; for humans: clothing, posture, carried items, safety gear/headwear; note if the snapshot is low-res or synthetic).',
    '2. Compare your visual reading against the camera edge classification and note whether it confirms, refines, or disagrees with it.',
    '3. Identify the apparent ground surface or immediate background visible in the snapshot (asphalt road, concrete driveway, grass lawn, sidewalk, indoor floor, etc.).',
    '4. Cross-check both the visual snapshot surface/object AND the spatial trajectory coordinates against the user-provided scene description (if given) to detect out-of-place objects (e.g., a car on a lawn or off-road, a truck in a pedestrian zone) or unusual motion patterns (e.g., loitering/pacing).',
    'Respond strictly with JSON matching the requested schema. Be concise, honest about uncertainty or low resolution, and do not invent details you cannot see.',
  ].join(' ');

  const userPromptParts = [
    'Analyze the attached best_snapshot image and the following ADF Object Track telemetry:',
    '',
    '--- ADF TRACK TELEMETRY ---',
    telemetryDigest,
  ];

  if (trimmedScene) {
    userPromptParts.push(
      '',
      '--- USER SCENE DESCRIPTION ---',
      trimmedScene,
      'Compare the track regions (entry, exit, snapshot crop_box) and the visible ground surface in the snapshot against this scene description. Flag any mismatch as "unusual" or "anomaly" in sceneAssessment.'
    );
  } else {
    userPromptParts.push(
      '',
      '--- USER SCENE DESCRIPTION ---',
      '(No custom scene description provided. Evaluate whether the object appearance, visible surface, and trajectory motion appear typical or noteworthy on their own.)'
    );
  }

  return {
    systemPrompt,
    userPrompt: userPromptParts.join('\n'),
    telemetryDigest,
  };
}

function extractJsonObject(rawText: string): Record<string, unknown> {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = cleaned.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(slice);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    }
  }

  throw new Error('Model response did not contain a valid JSON object.');
}

function normalizeInferenceResult(raw: Record<string, unknown>): BrowserAiInferenceResult {
  const edgeMatch =
    raw.edgeClassificationMatch === 'confirmed' ||
    raw.edgeClassificationMatch === 'refined' ||
    raw.edgeClassificationMatch === 'discrepancy'
      ? raw.edgeClassificationMatch
      : 'refined';

  const sceneAssessment =
    raw.sceneAssessment === 'normal' ||
    raw.sceneAssessment === 'unusual' ||
    raw.sceneAssessment === 'anomaly'
      ? raw.sceneAssessment
      : 'normal';

  const observedAttributes = Array.isArray(raw.observedAttributes)
    ? raw.observedAttributes
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          label: String(item.label ?? 'Attribute').trim(),
          value: String(item.value ?? '').trim(),
        }))
        .filter((item) => item.label && item.value)
    : [];

  const sceneObservations = Array.isArray(raw.sceneObservations)
    ? raw.sceneObservations.map((s) => String(s ?? '').trim()).filter(Boolean)
    : [];

  return {
    objectSummary: String(raw.objectSummary ?? 'No summary provided.').trim(),
    subtypeOrMakeModel: String(raw.subtypeOrMakeModel ?? 'Uncertain').trim(),
    apparentSurfaceOrBackground: String(raw.apparentSurfaceOrBackground ?? 'Uncertain').trim(),
    observedAttributes,
    edgeClassificationMatch: edgeMatch,
    edgeMatchExplanation: String(raw.edgeMatchExplanation ?? '').trim(),
    sceneAssessment,
    sceneAssessmentHeadline: String(
      raw.sceneAssessmentHeadline ??
        (sceneAssessment === 'normal'
          ? 'Track aligns with expected scene activity'
          : 'Potential scene or trajectory anomaly detected')
    ).trim(),
    sceneObservations,
  };
}

/**
 * Executes on-device Chrome `LanguageModel` multimodal inference for an ADF track snapshot and trajectory.
 */
export async function runBrowserAiAnalysis(params: {
  track: NormalizedTrackRecord;
  imageElement: HTMLImageElement;
  sceneDescription: string;
  signal?: AbortSignal;
}): Promise<BrowserAiAnalysisOutput> {
  const api = getLanguageModelApi();
  if (!api || typeof api.create !== 'function') {
    throw new Error(
      'Chrome Prompt API (LanguageModel) is unavailable in this browser. Open this app in Chrome 138+ with Gemini Nano flags enabled.'
    );
  }

  const { systemPrompt, userPrompt, telemetryDigest } = buildBrowserAiPrompts({
    track: params.track,
    sceneDescription: params.sceneDescription,
  });

  const t0 = performance.now();
  let session: ChromeLanguageModelSession | null = null;
  let bitmap: ImageBitmap | null = null;

  try {
    try {
      session = await api.create({
        initialPrompts: [{ role: 'system', content: systemPrompt }],
        expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        signal: params.signal,
      });
    } catch (err) {
      if (params.signal?.aborted) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Could not start multimodal Chrome AI session (${msg}). Ensure chrome://flags/#prompt-api-for-gemini-nano-multimodal-input and #optimization-guide-on-device-model are enabled.`
      );
    }

    const tSession = performance.now();

    let imageInput: ImageBitmap | HTMLImageElement = params.imageElement;
    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(params.imageElement);
        imageInput = bitmap;
      } catch {
        imageInput = params.imageElement;
      }
    }

    const promptPayload = [
      {
        role: 'user',
        content: [
          { type: 'text', value: userPrompt },
          { type: 'image', value: imageInput },
        ],
      },
    ];

    let rawResponseText = '';
    try {
      rawResponseText = await session.prompt(promptPayload, {
        responseConstraint: BROWSER_AI_RESPONSE_SCHEMA,
        signal: params.signal,
      });
    } catch (err) {
      if (params.signal?.aborted) throw err;
      // Fallback for Chrome builds that do not yet support `responseConstraint` with multimodal prompts
      const isConstraintError =
        err instanceof TypeError ||
        (err instanceof DOMException && err.name === 'NotSupportedError');
      if (!isConstraintError) {
        throw err;
      }
      rawResponseText = await session.prompt(promptPayload, {
        signal: params.signal,
      });
    }

    const tEnd = performance.now();
    const sessionInitMs = Math.max(1, Math.round(tSession - t0));
    const inferenceMs = Math.max(1, Math.round(tEnd - tSession));
    const totalMs = Math.max(1, Math.round(tEnd - t0));

    const parsedRaw = extractJsonObject(rawResponseText);
    const result = normalizeInferenceResult(parsedRaw);

    const promptChars = systemPrompt.length + userPrompt.length;
    const responseChars = rawResponseText.length;
    const charsPerSec = inferenceMs > 0 ? (responseChars / inferenceMs) * 1000 : 0;

    const inputUsageTokens =
      typeof session.inputUsage === 'number'
        ? session.inputUsage
        : typeof session.tokensSoFar === 'number'
          ? session.tokensSoFar
          : null;
    const inputQuotaTokens =
      typeof session.inputQuota === 'number'
        ? session.inputQuota
        : typeof session.maxTokens === 'number'
          ? session.maxTokens
          : null;

    const imageWidth =
      params.imageElement.naturalWidth || params.track.snapshot?.width || 0;
    const imageHeight =
      params.imageElement.naturalHeight || params.track.snapshot?.height || 0;
    const imageBytes =
      params.track.snapshotDecodedBytes ||
      (params.track.snapshot?.data
        ? Math.round((params.track.snapshot.data.length * 3) / 4)
        : 0);

    return {
      result,
      stats: {
        sessionInitMs,
        inferenceMs,
        totalMs,
        promptChars,
        responseChars,
        charsPerSec,
        inputUsageTokens,
        inputQuotaTokens,
        imageWidth,
        imageHeight,
        imageBytes,
        usedMultimodalImage: true,
      },
      rawResponseText,
      systemPrompt,
      userPrompt,
      telemetryDigest,
    };
  } finally {
    if (bitmap) {
      bitmap.close();
    }
    if (session && typeof session.destroy === 'function') {
      session.destroy();
    }
  }
}
