import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Lightning, MicrophoneStage, Warning } from '@phosphor-icons/react';
import { formatCountdown } from '../../lib/utils';

// A real, live mini mission-control. Not a fake screenshot: the countdown actually ticks
// and the Watcher nudge animates in, so the hero shows the product working.
export function LivePreview() {
  const reduce = useReducedMotion();
  const [ms, setMs] = useState(72 * 60 * 1000 + 14_000);
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setMs((v) => Math.max(0, v - 1000)), 1000);
    const n = setTimeout(() => setShowNudge(true), 1600);
    return () => {
      clearInterval(t);
      clearTimeout(n);
    };
  }, []);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.15 }}
      className="relative w-full rounded-2xl border border-line bg-surface-2 p-5 shadow-[var(--shadow)]"
      style={{ transformPerspective: 1000 }}
    >
      <div className="flex items-center justify-between">
        <span className="tabular text-[11px] uppercase tracking-[0.22em] text-muted">
          Mission control
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          live
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-xs text-muted">Northwind board call</div>
          <div className="tabular mt-1 text-5xl font-semibold leading-none text-text">
            {formatCountdown(ms)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">on the clock</div>
          <div className="tabular text-sm text-text">5 tasks</div>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <PreviewRow
          accent
          title="Northwind Q3 board deck"
          meta="critical / 45m work"
          icon={<Lightning size={16} weight="fill" />}
        />
        <PreviewRow
          title="Briefing of the financials"
          meta="high / 6m audio"
          icon={<MicrophoneStage size={16} weight="bold" />}
        />
      </div>

      <motion.div
        initial={false}
        animate={
          showNudge
            ? { opacity: 1, y: 0, height: 'auto', marginTop: 16 }
            : { opacity: 0, y: 8, height: 0, marginTop: 0 }
        }
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="overflow-hidden"
      >
        <div className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] p-3">
          <Warning size={18} weight="fill" className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm leading-snug text-text">
            <span className="font-medium">Watcher:</span> 72m to the deck but it needs ~45m.
            Start now or cut a slide.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PreviewRow({
  title,
  meta,
  icon,
  accent,
}: {
  title: string;
  meta: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
      <span
        className={
          accent
            ? 'grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-bright text-accent-ink'
            : 'grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-3 text-muted'
        }
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text">{title}</div>
        <div className="tabular text-xs text-muted">{meta}</div>
      </div>
    </div>
  );
}
