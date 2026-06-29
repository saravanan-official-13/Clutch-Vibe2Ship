import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Microphone, Spinner, Stop } from '@phosphor-icons/react';
import { Button, Eyebrow } from '../ui/primitives';
import { useStore } from '../../store';
import { useAudioRecorder, useSpeechRecognition } from '../../lib/speech';
import { transcribeAudio } from '../../services/agents';

export function Intake() {
  const reduce = useReducedMotion();
  const brainDump = useStore((s) => s.brainDump);
  const setBrainDump = useStore((s) => s.setBrainDump);
  const triage = useStore((s) => s.triage);
  const chiefStatus = useStore((s) => s.chiefStatus);
  const isDemoMode = useStore((s) => s.isDemoMode);

  // Two voice engines. Gemini transcription works in every browser and is used
  // whenever a key is present; the browser Speech API is the no-key demo path.
  const stt = useSpeechRecognition();
  const recorder = useAudioRecorder();
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const useGemini = !isDemoMode && recorder.supported;

  // Pipe the browser Speech API transcript into the field (web-speech mode only).
  useEffect(() => {
    if (stt.transcript) setBrainDump(stt.transcript);
  }, [stt.transcript, setBrainDump]);

  const startGemini = async () => {
    setVoiceError(null);
    await recorder.start();
  };

  const stopGemini = async () => {
    const audio = await recorder.stop();
    if (!audio) {
      setVoiceError('I did not catch any audio. Tap Speak it and try again.');
      return;
    }
    setTranscribing(true);
    try {
      const text = await transcribeAudio(audio.base64, audio.mimeType);
      if (text) {
        const current = useStore.getState().brainDump.trim();
        setBrainDump(current ? `${current} ${text}` : text);
      } else {
        setVoiceError('I could not make out any words. Try again somewhere quieter.');
      }
    } catch {
      setVoiceError('Transcription failed. Check your connection, or type your brain-dump below.');
    } finally {
      setTranscribing(false);
    }
  };

  const active = useGemini ? recorder.recording : stt.listening;
  const voiceAvailable = useGemini || stt.supported;
  const shownError = useGemini ? recorder.error || voiceError : stt.error;
  const onVoiceClick = useGemini
    ? () => void (recorder.recording ? stopGemini() : startGemini())
    : () => (stt.listening ? stt.stop() : stt.start());

  const running = chiefStatus === 'running';

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-2xl flex-col justify-center px-5 py-12">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Eyebrow>Step one</Eyebrow>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl">
          What is on your mind right now?
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Dump everything, messy is fine. The Chief of Staff will sort the panic into a plan
          and tell you the one thing to start.
        </p>

        <div className="mt-7 rounded-2xl border border-line bg-surface-2 p-2 focus-within:border-accent">
          <textarea
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            rows={7}
            spellCheck
            aria-label="Brain dump"
            className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-base leading-relaxed text-text outline-none placeholder:text-muted"
            placeholder="board review tomorrow 9am, deck not done, need to reply to priya about standup, send the partnership email..."
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2">
            {voiceAvailable ? (
              <button
                onClick={onVoiceClick}
                disabled={transcribing}
                className={
                  'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ' +
                  (active || transcribing
                    ? 'border-accent text-accent'
                    : 'border-line text-muted hover:text-text hover:border-line-strong')
                }
              >
                {transcribing ? (
                  <Spinner size={16} weight="bold" className="animate-spin" />
                ) : active ? (
                  <Stop size={16} weight="fill" />
                ) : (
                  <Microphone size={16} weight="bold" />
                )}
                {transcribing
                  ? 'Transcribing...'
                  : active
                    ? useGemini
                      ? 'Recording, tap to finish'
                      : 'Listening, tap to stop'
                    : 'Speak it'}
              </button>
            ) : (
              <span className="text-xs text-muted">Voice input is not available in this browser.</span>
            )}
            <span className="tabular text-xs text-muted">{brainDump.length} chars</span>
          </div>
        </div>

        {shownError && (
          <p className="mt-2 px-1 text-xs text-danger" role="alert">
            {shownError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button size="lg" onClick={triage} disabled={running || !brainDump.trim()}>
            {running ? 'Triaging...' : 'Triage my chaos'}
            {!running && <ArrowRight size={18} weight="bold" />}
          </Button>
          {isDemoMode ? (
            <span className="text-xs text-muted">
              Running in demo mode. Add a Gemini key to go live.
            </span>
          ) : (
            useGemini && (
              <span className="text-xs text-muted">Voice powered by Gemini. Works in any browser.</span>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}
