import { getClient, isDemoMode } from './gemini';

/** Derive a stable integer seed from an arbitrary string. */
function hashSeed(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/**
 * Return a stable, publicly accessible image URL for the given seed string.
 * Works in-app and as a direct URL in the Google Slides API `createImage` call.
 */
export function stockImageUrl(seed: string): string {
  const id = (hashSeed(seed) % 900) + 100; // range 100-999
  return `https://picsum.photos/seed/${id}/1280/720`;
}

/**
 * Generate an original slide image with Google Imagen.
 * Falls back to a stock photo when in demo mode or when Imagen is unavailable
 * (e.g. the key does not have Imagen access yet).
 */
export async function generateSlideImage(prompt: string): Promise<string> {
  if (isDemoMode) return stockImageUrl(prompt);
  try {
    const ai = getClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (ai.models as any).generateImages({
      model: 'imagen-3.0-generate-001',
      prompt: `Professional business presentation slide image: ${prompt}. Clean, high quality, suitable for a board-level deck.`,
      config: { numberOfImages: 1, aspectRatio: '16:9' },
    });
    const bytes = res?.generatedImages?.[0]?.image?.imageBytes as string | undefined;
    if (bytes) return `data:image/png;base64,${bytes}`;
  } catch {
    // Imagen not yet enabled for this key, or SDK version does not expose it.
  }
  return stockImageUrl(prompt);
}
