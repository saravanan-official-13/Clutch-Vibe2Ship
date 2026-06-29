import { useState } from 'react';
import { Copy, PenNib, Check } from '@phosphor-icons/react';
import { useStore } from '../../store';
import { Button, Pill } from '../ui/primitives';
import { RunError, RunLoading } from './MakerStates';
import type { ScriptKind } from '../../types';

const KINDS: ScriptKind[] = ['email', 'pitch', 'update', 'apology', 'toast', 'talk'];

export function ScriptView() {
  const script = useStore((s) => s.script);
  const runScript = useStore((s) => s.runScript);

  if (script.status === 'running') return <RunLoading label="Script Maker is writing in your voice..." lines={5} />;
  if (script.status === 'error') return <RunError message={script.error} onRetry={() => runScript('email', 'partnership intro email')} />;
  if (script.status === 'idle' || !script.data) return <ScriptEmpty onWrite={runScript} />;

  return <ScriptResult data={script.data} />;
}

function ScriptEmpty({ onWrite }: { onWrite: (kind: ScriptKind, context: string) => void }) {
  const [kind, setKind] = useState<ScriptKind>('email');
  const [context, setContext] = useState('A partnership intro email to Dana at Meridian about last-mile logistics.');
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-3 text-accent">
          <PenNib size={26} weight="duotone" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-text">Nothing written yet.</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Pick a kind and say who it is for. The Script Maker returns the exact words plus delivery tips.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={
                'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ' +
                (k === kind ? 'border-accent text-accent' : 'border-line text-muted hover:text-text')
              }
            >
              {k}
            </button>
          ))}
        </div>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          className="mt-4 w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
          aria-label="Script context"
        />
        <div className="mt-4 flex justify-center">
          <Button onClick={() => onWrite(kind, context)} disabled={!context.trim()}>
            Write it
          </Button>
        </div>
      </div>
    </div>
  );
}

function ScriptResult({ data }: { data: import('../../types').ScriptDoc }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  const mins = Math.max(1, Math.round(data.durationSec / 60));
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-text">{data.title}</h2>
          <div className="mt-1.5 flex items-center gap-2">
            <Pill tone="accent" className="capitalize">{data.kind}</Pill>
            <span className="tabular text-xs text-muted">~{data.durationSec}s to deliver, about {mins} min read</span>
          </div>
        </div>
        <Button variant="subtle" size="sm" onClick={copy}>
          {copied ? <Check size={15} weight="bold" /> : <Copy size={15} weight="bold" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-line bg-surface-2 p-6">
        <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-text">
          {data.body}
        </pre>
      </div>

      {data.deliveryTips?.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Delivery</span>
          <ul className="mt-2 space-y-1.5">
            {data.deliveryTips.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug text-text">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
