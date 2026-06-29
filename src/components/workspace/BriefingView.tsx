import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MicrophoneStage, Pause, Play, Sparkle } from '@phosphor-icons/react';
import { useStore } from '../../store';
import { Button } from '../ui/primitives';
import { RunError, RunLoading } from './MakerStates';
import { speakBriefing, type SpeechController } from '../../lib/speech';
import { cn } from '../../lib/utils';
import type { Briefing } from '../../types';

export function BriefingView() {
  const briefing = useStore((s) => s.briefing);
  const runBriefing = useStore((s) => s.runBriefing);
  const brainDump = useStore((s) => s.brainDump);
  const isDemoMode = useStore((s) => s.isDemoMode);

  if (briefing.status === 'running') {
    return <RunLoading label="Briefing agent is writing the two-host script and voicing it..." lines={6} />;
  }
  if (briefing.status === 'error') {
    return <RunError message={briefing.error} onRetry={() => runBriefing(brainDump)} />;
  }
  if (briefing.status === 'idle' || !briefing.data) {
    return <BriefingEmpty onCreate={runBriefing} defaultText={brainDump} />;
  }
  return <BriefingPlayer data={briefing.data} audioUrl={briefing.audioUrl} />;
}

function BriefingEmpty({
  onCreate,
  defaultText,
}: {
  onCreate: (source: string) => void;
  defaultText: string;
}) {
  const [text, setText] = useState(
    'Q3 financials: revenue 7.2M up 18.4%, gross margin 61.2% down 1.9 points on fuel and a carrier reset. LaaS now 41% of revenue. EU launch slipped a quarter. Asks: EU budget, two data hires, forecasting beta.',
  );
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-3 text-accent">
          <MicrophoneStage size={26} weight="duotone" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-text">Turn a document into a briefing.</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Paste the notes, report, or deck you never read. Maya and Dev turn it into a six
          minute audio briefing you can absorb on the way.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="mt-5 w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-left text-sm leading-relaxed text-text outline-none focus:border-accent"
          aria-label="Source material"
        />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => onCreate(text)} disabled={!text.trim()}>
            <Sparkle size={16} weight="fill" /> Create the briefing
          </Button>
          <button
            onClick={() => onCreate(defaultText)}
            className="text-sm text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Use my brain-dump instead
          </button>
        </div>
      </div>
    </div>
  );
}

function BriefingPlayer({ data, audioUrl }: { data: Briefing; audioUrl: string | null }) {
  const [playing, setPlaying] = useState(false);
  const [activeTurn, setActiveTurn] = useState(-1);
  const controllerRef = useRef<SpeechController | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isDemoMode = useStore((s) => s.isDemoMode);

  // Clean up any in-flight browser speech when leaving the view.
  useEffect(() => {
    return () => controllerRef.current?.stop();
  }, []);

  const playBrowser = () => {
    setPlaying(true);
    controllerRef.current = speakBriefing(data.turns, {
      onTurn: (idx) => setActiveTurn(idx),
      onEnd: () => {
        setPlaying(false);
        setActiveTurn(-1);
      },
    });
  };
  const stopBrowser = () => {
    controllerRef.current?.stop();
    setPlaying(false);
    setActiveTurn(-1);
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">{data.title}</h2>
          <p className="mt-0.5 text-xs text-muted">
            Two-host briefing {audioUrl ? 'voiced by Gemini TTS' : 'with browser narration'}
          </p>
        </div>
      </div>

      {/* Takeaways first, because that is what a rushed user actually needs. */}
      <div className="mt-4 rounded-2xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">Takeaways</span>
        <ul className="mt-2 space-y-1.5">
          {data.takeaways.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-text">
              <span className="tabular shrink-0 text-accent">{i + 1}</span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Player */}
      <div className="mt-4">
        {audioUrl ? (
          <audio ref={audioRef} controls src={audioUrl} className="w-full">
            Your browser does not support audio playback.
          </audio>
        ) : (
          <button
            onClick={playing ? stopBrowser : playBrowser}
            className="inline-flex items-center gap-2.5 rounded-full bg-accent-bright px-5 py-3 text-sm font-semibold text-accent-ink transition-[filter] hover:brightness-110 active:scale-[0.98]"
          >
            {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
            {playing ? 'Stop briefing' : 'Play briefing'}
          </button>
        )}
        {isDemoMode && (
          <p className="mt-2 text-xs text-muted">
            Demo mode narrates with your browser voices. With a Gemini key, the two hosts are
            voiced by Gemini multi speaker TTS.
          </p>
        )}
      </div>

      {/* Transcript */}
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {data.turns.map((turn, i) => (
          <motion.div
            key={i}
            animate={{
              opacity: activeTurn === -1 || activeTurn === i ? 1 : 0.55,
            }}
            className={cn(
              'flex gap-3 rounded-xl border p-3 transition-colors',
              activeTurn === i ? 'border-accent bg-surface-2' : 'border-line bg-surface',
            )}
          >
            <span
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
                turn.speaker === 'Maya' ? 'bg-accent-bright text-accent-ink' : 'bg-surface-3 text-muted',
              )}
            >
              {turn.speaker[0]}
            </span>
            <div>
              <span
                className={cn(
                  'text-xs font-semibold',
                  turn.speaker === 'Maya' ? 'text-accent' : 'text-muted',
                )}
              >
                {turn.speaker}
              </span>
              <p className="mt-0.5 text-sm leading-relaxed text-text">{turn.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
