import { GoogleGenAI } from '@google/genai';

// We check if the API key is present via a secure config endpoint during startup.
// This preserves the full-stack architecture security patterns.
export let isDemoMode = true;

export async function initDemoMode() {
  try {
    const res = await fetch('/api/gemini/config');
    const data = await res.json();
    isDemoMode = data.isDemoMode;
  } catch (err) {
    console.warn('Failed to fetch Gemini config, defaulting to demo mode', err);
    isDemoMode = true;
  }
}

export function getClient(): any {
  return {
    models: {
      generateContent: async (args: any) => {
        const response = await fetch('/api/gemini/generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const err = new Error(errData.error || `Server returned status ${response.status}`) as any;
          err.status = response.status;
          err.code = response.status;
          throw err;
        }
        const data = await response.json();
        
        // Emulate the SDK properties that the frontend relies on
        Object.defineProperties(data, {
          text: {
            get() {
              try {
                return this.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
              } catch (e) {
                return '';
              }
            }
          },
          functionCalls: {
            get() {
              try {
                const parts = this.candidates?.[0]?.content?.parts || [];
                const calls = [];
                for (const part of parts) {
                  if (part.functionCall) {
                    calls.push(part.functionCall);
                  }
                }
                return calls.length > 0 ? calls : undefined;
              } catch (e) {
                return undefined;
              }
            }
          }
        });
        
        return data;
      },
      generateImages: async (args: any) => {
        const response = await fetch('/api/gemini/generateImages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const err = new Error(errData.error || `Server returned status ${response.status}`) as any;
          err.status = response.status;
          err.code = response.status;
          throw err;
        }
        return await response.json();
      }
    }
  } as any;
}

// Models. Flash is the workhorse for fast agent turns; Pro is available for deeper plans.
// Restored to the user's original stable values that were optimized for their app.
export const MODEL = 'gemini-2.5-flash';
export const MODEL_PRO = 'gemini-2.5-pro';
export const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// ---------------------------------------------------------------------------
// Free-tier resilience. The free tier caps requests per minute and per day. A
// per-minute spike is recoverable with a short wait; a daily-cap exhaustion is
// not, so callers fall back to demo content (the same data demo mode serves)
// and the UI stays fully alive even mid-demo.
// ---------------------------------------------------------------------------

/** True when an error is a Gemini 429 / RESOURCE_EXHAUSTED quota or rate-limit error. */
export function isQuotaError(err: unknown): boolean {
  const e = err as {
    status?: string | number;
    code?: number;
    message?: string;
    error?: { code?: number; status?: string; message?: string };
  };
  const code = e?.code ?? e?.error?.code;
  const status = String(e?.status ?? e?.error?.status ?? '');
  const msg = String(e?.message ?? e?.error?.message ?? '');
  
  const isQuota = (
    code === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === '429' ||
    /RESOURCE_EXHAUSTED|exceeded your current quota|rate limit|\b429\b/i.test(msg)
  );

  if (isQuota) {
    console.warn('Gemini quota reached. Dynamically switching app to Demo Mode.');
    isDemoMode = true;
  }

  return isQuota;
}

/** Pull the server-suggested retry delay (seconds -> ms) out of a 429, if any. */
function retryDelayMs(err: unknown): number {
  const msg = String((err as { message?: string })?.message ?? '');
  const m = msg.match(/retry(?:Delay)?["\s:]*([0-9.]+)\s*s/i) || msg.match(/retry in ([0-9.]+)\s*s/i);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) : 0;
}

/**
 * Run a Gemini call, retrying short (per-minute) 429s up to `retries` times.
 * A long backoff signals a daily-cap exhaustion that waiting will not fix, so
 * it bubbles up immediately for the caller to fall back to demo content.
 */
export async function withGemini<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isQuotaError(err) || attempt >= retries) throw err;
      const delay = retryDelayMs(err);
      if (delay > 10_000) throw err; // daily cap, not a recoverable per-minute limit
      await new Promise((r) => setTimeout(r, delay || 1200 * (attempt + 1)));
    }
  }
}
