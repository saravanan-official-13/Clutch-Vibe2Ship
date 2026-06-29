// Small dependency-free helpers shared across Clutch.

/** Tailwind-friendly className joiner (no clsx dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Stable-ish short id. */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** "1:09:42" or "47:12" or "0:38" from a millisecond span. Clamps at zero. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Human relative deadline: "in 1h 9m", "in 38m", "overdue". */
export function relativeDeadline(deadlineMs: number, now = Date.now()): string {
  const diff = deadlineMs - now;
  if (diff <= 0) return 'overdue';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`;
}

/** Robust JSON parse for model output that may be wrapped in code fences. */
export function parseJsonLoose<T>(raw: string): T {
  let text = (raw || '').trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  const start = text.indexOf('{');
  const startArr = text.indexOf('[');
  const realStart =
    startArr !== -1 && (startArr < start || start === -1) ? startArr : start;
  if (realStart > 0) text = text.slice(realStart);
  return JSON.parse(text) as T;
}

/**
 * Wrap raw 16-bit PCM (mono, little-endian) from Gemini TTS into a playable WAV
 * blob URL. Gemini speech output is signed 16-bit PCM at 24kHz.
 */
export function pcmBase64ToWavUrl(base64Pcm: string, sampleRate = 24000): string {
  const binary = atob(base64Pcm);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

  const buffer = new ArrayBuffer(44 + len);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, len, true);
  new Uint8Array(buffer, 44).set(bytes);

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

/**
 * Build a Google Calendar "create event" deep link. This is a real Calendar
 * integration that needs no OAuth: it opens the prefilled event composer.
 */
export function googleCalendarUrl(opts: {
  title: string;
  startMs: number;
  endMs: number;
  details?: string;
}): string {
  const fmt = (ms: number) =>
    new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${fmt(opts.startMs)}/${fmt(opts.endMs)}`,
    details: opts.details ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const urgencyRank: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};
