import { AdfBoundingBox } from '../types/adf';

export interface SnapshotVisualSpec {
  objectType: 'human' | 'vehicle' | 'car' | 'truck' | 'bus' | 'bike' | 'forklift';
  primaryColor: string;
  secondaryColor?: string;
  label: string;
  subLabel?: string;
  channelId: number;
  timestamp: string;
  confidence: number;
  cropBox: AdfBoundingBox;
  direction?: 'left' | 'right' | 'toward' | 'away';
}

/**
 * Generates a realistic camera crop JPEG encoded as a base64 string (without the `data:image/jpeg;base64,` prefix)
 * so demo and simulated ADF messages include genuine JPEG binary payloads in `image.data`.
 */
export function generateSyntheticSnapshotBase64(spec: SnapshotVisualSpec): {
  base64: string;
  width: number;
  height: number;
} {
  const isTall = spec.objectType === 'human' || spec.objectType === 'bike';
  const width = isTall ? 220 : 320;
  const height = isTall ? 300 : 220;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { base64: '', width, height };
  }

  // 1. Background asphalt / scene environment gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#2b323b');
  bgGrad.addColorStop(0.38, '#38414d');
  bgGrad.addColorStop(0.4, '#444c56');
  bgGrad.addColorStop(1, '#252930');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle pavement texture & lane markings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  ctx.moveTo(0, height * 0.78);
  ctx.lineTo(width, height * 0.68);
  ctx.stroke();
  ctx.setLineDash([]);

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(width * 0.52, height * 0.84, width * 0.3, height * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Render the tracked object silhouette + detail
  const cx = width / 2;
  const cy = height / 2;

  if (spec.objectType === 'human') {
    // Legs / Lower clothing
    ctx.fillStyle = spec.secondaryColor || '#1e293b';
    ctx.beginPath();
    ctx.roundRect(cx - 24, cy + 18, 20, 78, 8);
    ctx.roundRect(cx + 4, cy + 18, 20, 78, 8);
    ctx.fill();

    // Shoes
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(cx - 28, cy + 88, 26, 12, 5);
    ctx.roundRect(cx + 4, cy + 88, 26, 12, 5);
    ctx.fill();

    // Torso / Upper clothing
    ctx.fillStyle = spec.primaryColor;
    ctx.beginPath();
    ctx.roundRect(cx - 34, cy - 52, 68, 76, 14);
    ctx.fill();

    // Arms
    ctx.fillStyle = spec.primaryColor;
    ctx.beginPath();
    ctx.roundRect(cx - 48, cy - 46, 16, 62, 8);
    ctx.roundRect(cx + 32, cy - 46, 16, 62, 8);
    ctx.fill();

    // Collar / Backpack strap accent
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 50);
    ctx.lineTo(cx - 16, cy + 20);
    ctx.moveTo(cx + 16, cy - 50);
    ctx.lineTo(cx + 16, cy + 20);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#e5b899';
    ctx.beginPath();
    ctx.arc(cx, cy - 76, 20, 0, Math.PI * 2);
    ctx.fill();

    // Hair / Cap
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(cx, cy - 80, 20, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (spec.objectType === 'bike') {
    // Wheels
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx - 46, cy + 48, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 46, cy + 48, 28, 0, Math.PI * 2);
    ctx.stroke();

    // Frame
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 46, cy + 48);
    ctx.lineTo(cx - 8, cy + 8);
    ctx.lineTo(cx + 34, cy + 12);
    ctx.lineTo(cx - 8, cy + 48);
    ctx.closePath();
    ctx.stroke();

    // Rider torso
    ctx.fillStyle = spec.primaryColor;
    ctx.beginPath();
    ctx.roundRect(cx - 20, cy - 50, 42, 58, 12);
    ctx.fill();

    // Helmet
    ctx.fillStyle = spec.secondaryColor || '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx + 4, cy - 68, 16, 0, Math.PI * 2);
    ctx.fill();
  } else if (spec.objectType === 'truck' || spec.objectType === 'bus') {
    // Cargo box
    ctx.fillStyle = spec.primaryColor;
    ctx.beginPath();
    ctx.roundRect(34, 48, 175, 102, 8);
    ctx.fill();

    // Cab
    ctx.fillStyle = spec.secondaryColor || spec.primaryColor;
    ctx.beginPath();
    ctx.roundRect(212, 68, 72, 82, [4, 14, 6, 4]);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(244, 76, 34, 34, 4);
    ctx.fill();

    // Headlight
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(276, 124, 8, 12);

    // Wheels
    [76, 174, 248].forEach((wx) => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(wx, 154, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(wx, 154, 9, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    // Car / Vehicle sedan / SUV
    ctx.fillStyle = spec.primaryColor;
    // Lower body
    ctx.beginPath();
    ctx.roundRect(38, 96, 244, 58, 14);
    ctx.fill();

    // Cabin roof
    ctx.beginPath();
    ctx.moveTo(78, 98);
    ctx.lineTo(110, 56);
    ctx.lineTo(214, 56);
    ctx.lineTo(248, 98);
    ctx.closePath();
    ctx.fill();

    // Windows
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(88, 94);
    ctx.lineTo(114, 62);
    ctx.lineTo(158, 62);
    ctx.lineTo(158, 94);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(166, 94);
    ctx.lineTo(166, 62);
    ctx.lineTo(208, 62);
    ctx.lineTo(236, 94);
    ctx.closePath();
    ctx.fill();

    // Headlights & Taillights
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.roundRect(268, 108, 14, 12, 3);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(38, 106, 10, 14, 3);
    ctx.fill();

    // License plate area
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(142, 126, 44, 12);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 8px monospace';
    ctx.fillText('AXS-901', 145, 135);

    // Wheels
    [94, 226].forEach((wx) => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(wx, 154, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(wx, 154, 10, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 3. Axis-style bounding box crop reticle corners
  ctx.strokeStyle = '#FFCC00';
  ctx.lineWidth = 2.5;
  const pad = 10;
  const corner = 18;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(pad, pad + corner);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + corner, pad);
  // Top-right
  ctx.moveTo(width - pad - corner, pad);
  ctx.lineTo(width - pad, pad);
  ctx.lineTo(width - pad, pad + corner);
  // Bottom-left
  ctx.moveTo(pad, height - pad - corner);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(pad + corner, height - pad);
  // Bottom-right
  ctx.moveTo(width - pad - corner, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.lineTo(width - pad, height - pad - corner);
  ctx.stroke();

  // 4. Camera OSD timestamp + class confidence overlay banner
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fillRect(0, 0, width, 24);
  ctx.fillStyle = '#FFCC00';
  ctx.font = 'bold 11px Consolas, monospace';
  ctx.fillText(
    `CH${spec.channelId}  ${spec.label.toUpperCase()} ${(spec.confidence * 100).toFixed(0)}%`,
    8,
    16
  );

  // Bottom OSD timestamp
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.fillRect(0, height - 22, width, 22);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '10px Consolas, monospace';
  const timeStr = spec.timestamp.replace('T', ' ').slice(0, 23) + 'Z';
  ctx.fillText(timeStr, 8, height - 7);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  return { base64, width, height };
}
