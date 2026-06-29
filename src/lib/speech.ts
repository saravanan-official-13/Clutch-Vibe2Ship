import { useCallback, useEffect, useRef, useState } from 'react';
import type { BriefingTurn } from '../types';

// Voice in via the Web Speech API. Works with no key, so it powers demo mode too.
// Types for SpeechRecognition are not in the DOM lib, so we treat the API loosely.

type AnyWin = typeof window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
  webkitAudioContext?: any;
};

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  // Final text accumulates here so it survives Chrome's mid-session restarts.
  const finalRef = useRef('');
  // Tracks whether the user still wants to listen, so we can auto-restart.
  const wantRef = useRef(false);

  useEffect(() => {
    const w = window as AnyWin;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e: any) => {
      let interim = '';
      // Only walk new results; finalized chunks are banked in finalRef.
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalRef.current += res[0].transcript;
        else interim += res[0].transcript;
      }
      setTranscript((finalRef.current + interim).trim());
    };

    rec.onerror = (e: any) => {
      const code = e?.error;
      // Surface the raw code in the console so any odd browser is diagnosable.
      if (code) console.warn('[speech] recognition error:', code, e?.message || '');
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        // Permission blocked: stop trying and tell the user how to fix it.
        wantRef.current = false;
        setError('Microphone access is blocked. Allow it in your browser address bar, then tap Speak it again.');
        setListening(false);
      } else if (code === 'audio-capture') {
        wantRef.current = false;
        setError('No microphone found. Plug one in or check your input device, then retry.');
        setListening(false);
      } else if (code === 'network') {
        // Chrome streams audio to Google's speech service; this fails on
        // insecure origins (LAN IPs) and on Chromium builds without that backend.
        wantRef.current = false;
        setError(
          'Voice needs an internet connection and Google\u2019s speech service. Use Chrome, Edge, or Safari over https or localhost (not a raw IP address). You can still type your brain-dump below.',
        );
        setListening(false);
      } else if (code === 'language-not-supported') {
        wantRef.current = false;
        setError('This browser does not support English voice input. Type your brain-dump below instead.');
        setListening(false);
      } else if (code === 'no-speech' || code === 'aborted') {
        // Benign: onend will auto-restart if the user is still listening.
      } else {
        setError(`Voice input hit a snag${code ? ` (${code})` : ''}. Tap Speak it to retry, or type below.`);
      }
    };

    rec.onend = () => {
      // Chrome ends recognition after short pauses; restart while the user wants it.
      if (wantRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through to stop */
        }
      }
      setListening(false);
    };

    recRef.current = rec;
    return () => {
      wantRef.current = false;
      try {
        rec.stop();
      } catch {
        /* no-op */
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setError(null);
    finalRef.current = '';
    setTranscript('');
    wantRef.current = true;
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      // start() throws if it is already running; treat as listening.
      setListening(true);
    }
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    try {
      recRef.current?.stop();
    } catch {
      /* no-op */
    }
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop };
}

// ---------------------------------------------------------------------------
// Gemini-ready voice capture. The browser Speech API streams audio to a cloud
// backend that is blocked on many networks and Chromium builds. This records
// raw mic audio into a WAV blob instead, so Gemini can transcribe it directly.
// Works in every modern browser (Chrome, Edge, Safari, Firefox).
// ---------------------------------------------------------------------------

export interface RecordedAudio {
  base64: string;
  mimeType: string;
}

function floatChunksToWav(chunks: Float32Array[], sampleRate: number): Blob {
  let length = 0;
  for (const c of chunks) length += c.length;
  const samples = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    samples.set(c, offset);
    offset += c.length;
  }

  // 16-bit PCM WAV: a format Gemini accepts everywhere, no transcoding needed.
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM header size
  view.setUint16(20, 1, true); // format: PCM
  view.setUint16(22, 1, true); // channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let pos = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }
  return new Blob([view], { type: 'audio/wav' });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('Could not read the recording'));
    reader.readAsDataURL(blob);
  });
}

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const rateRef = useRef(48000);

  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof (window.AudioContext || (window as AnyWin).webkitAudioContext) === 'function';

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctor = window.AudioContext || (window as AnyWin).webkitAudioContext;
      const ctx: AudioContext = new Ctor();
      ctxRef.current = ctx;
      rateRef.current = ctx.sampleRate;
      const source = ctx.createMediaStreamSource(stream);
      const proc = ctx.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];
      proc.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      // Route through a muted gain so the processor runs without echoing the mic.
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gainRef.current = gain;
      source.connect(proc);
      proc.connect(gain);
      gain.connect(ctx.destination);
      procRef.current = proc;
      setRecording(true);
    } catch (e: any) {
      const name = e?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError')
        setError('Microphone access is blocked. Allow it in your browser, then tap Speak it again.');
      else if (name === 'NotFoundError')
        setError('No microphone found. Check your input device and retry.');
      else setError('Could not start the microphone. Tap Speak it to retry, or type below.');
    }
  }, []);

  const stop = useCallback(async (): Promise<RecordedAudio | null> => {
    setRecording(false);
    const proc = procRef.current;
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    const stream = streamRef.current;
    procRef.current = null;
    gainRef.current = null;
    ctxRef.current = null;
    streamRef.current = null;
    try {
      proc?.disconnect();
      gain?.disconnect();
    } catch {
      /* no-op */
    }
    try {
      stream?.getTracks().forEach((t) => t.stop());
    } catch {
      /* no-op */
    }
    try {
      await ctx?.close();
    } catch {
      /* no-op */
    }
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (!chunks.length) return null;
    const wav = floatChunksToWav(chunks, rateRef.current);
    const base64 = await blobToBase64(wav);
    return { base64, mimeType: 'audio/wav' };
  }, []);

  return { supported, recording, error, start, stop };
}

// Browser TTS fallback for the briefing: speaks the turns with two distinct voices.
export interface SpeechController {
  stop: () => void;
}

function pickVoices(): { maya: SpeechSynthesisVoice | null; dev: SpeechSynthesisVoice | null } {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const en = voices.filter((v) => v.lang.startsWith('en'));
  const pool = en.length ? en : voices;
  // Prefer a female-sounding voice for Maya, a different one for Dev, but fall back gracefully.
  const female = pool.find((v) => /female|samantha|victoria|karen|moira|tessa|zira/i.test(v.name));
  const male = pool.find((v) => /male|daniel|alex|fred|rishi|aaron|david/i.test(v.name) && v !== female);
  return {
    maya: female || pool[0] || null,
    dev: male || pool[1] || pool[0] || null,
  };
}

export function speakBriefing(
  turns: BriefingTurn[],
  opts: { onTurn?: (index: number) => void; onEnd?: () => void } = {},
): SpeechController {
  const synth = window.speechSynthesis;
  if (!synth) {
    opts.onEnd?.();
    return { stop: () => {} };
  }
  synth.cancel();

  let cancelled = false;
  let started = false;
  const run = () => {
    if (started || cancelled) return;
    started = true;
    const { maya, dev } = pickVoices();
    let i = 0;
    const next = () => {
      if (cancelled || i >= turns.length) {
        if (!cancelled) opts.onEnd?.();
        return;
      }
      const turn = turns[i];
      opts.onTurn?.(i);
      const u = new SpeechSynthesisUtterance(turn.text);
      u.voice = turn.speaker === 'Maya' ? maya : dev;
      u.rate = 1.04;
      u.pitch = turn.speaker === 'Maya' ? 1.08 : 0.92;
      u.onend = () => {
        i += 1;
        next();
      };
      u.onerror = () => {
        i += 1;
        next();
      };
      synth.speak(u);
    };
    next();
  };

  // Voices can load asynchronously on first use.
  if (synth.getVoices().length === 0) {
    synth.onvoiceschanged = () => {
      synth.onvoiceschanged = null;
      run();
    };
    // Safety net: start anyway after a beat, even if voices never populate
    // (some browsers report an empty list but still narrate with a default voice).
    setTimeout(() => {
      if (!cancelled) run();
    }, 400);
  } else {
    run();
  }

  return {
    stop: () => {
      cancelled = true;
      synth.cancel();
    },
  };
}
