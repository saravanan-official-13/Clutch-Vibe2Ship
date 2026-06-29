import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { PaperPlaneRight, Sparkle, Strategy } from '@phosphor-icons/react';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';

const QUICK = [
  'Build the Northwind board deck',
  'Brief me on the Q3 financials',
  'Reply to Priya about the 7am standup',
];

export function Console() {
  const conversation = useStore((s) => s.conversation);
  const routing = useStore((s) => s.routing);
  const ask = useStore((s) => s.ask);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation.length, routing]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value || routing) return;
    setInput('');
    void ask(value);
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-1 py-2" aria-live="polite">
        {conversation.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}
          >
            <span
              className={cn(
                'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full',
                m.role === 'chief' ? 'bg-surface-3 text-accent' : 'bg-accent-bright text-accent-ink',
              )}
            >
              {m.role === 'chief' ? <Strategy size={16} weight="duotone" /> : <span className="text-xs font-semibold">You</span>}
            </span>
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                m.role === 'chief'
                  ? 'rounded-tl-md bg-surface-2 text-text'
                  : 'rounded-tr-md bg-accent-bright text-accent-ink',
              )}
            >
              {m.text}
            </div>
          </motion.div>
        ))}

        {routing && (
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-accent">
              <Strategy size={16} weight="duotone" />
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md bg-surface-2 px-4 py-2.5 text-sm text-muted">
              <Sparkle size={14} weight="fill" className="animate-pulse text-accent" />
              Deciding which agent to dispatch...
            </span>
          </div>
        )}
      </div>

      <div className="pt-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={routing}
              className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-text disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-2 focus-within:border-accent"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell the Chief of Staff what you need..."
            className="flex-1 bg-transparent px-3 text-sm text-text outline-none placeholder:text-muted"
            aria-label="Ask Clutch"
          />
          <button
            type="submit"
            disabled={routing || !input.trim()}
            aria-label="Send"
            className="grid h-9 w-9 place-items-center rounded-xl bg-accent-bright text-accent-ink transition-[filter] hover:brightness-110 active:scale-[0.96] disabled:opacity-50"
          >
            <PaperPlaneRight size={16} weight="fill" />
          </button>
        </form>
      </div>
    </div>
  );
}
