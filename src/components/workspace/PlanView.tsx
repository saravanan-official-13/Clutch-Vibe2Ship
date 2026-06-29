import { CalendarCheck, CalendarPlus, Coffee, Flag, Lightning } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useStore } from '../../store';
import { Button, Pill } from '../ui/primitives';
import { RunError, RunLoading } from './MakerStates';
import { cn, googleCalendarUrl } from '../../lib/utils';
import type { PlanBlock, SchedulePlan } from '../../types';

export function PlanView() {
  const plan = useStore((s) => s.plan);
  const runPlan = useStore((s) => s.runPlan);

  if (plan.status === 'running') return <RunLoading label="Planner is sequencing your night..." lines={5} />;
  if (plan.status === 'error') return <RunError message={plan.error} onRetry={() => runPlan()} />;
  if (plan.status === 'idle' || !plan.data) return <PlanEmpty onBuild={() => runPlan()} />;

  return <PlanResult data={plan.data} />;
}

function PlanEmpty({ onBuild }: { onBuild: () => void }) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-3 text-accent">
          <CalendarCheck size={26} weight="duotone" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-text">No schedule yet.</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The Planner reads your commitments and the clock, then lays them out backward from your next
          deadline so you know exactly when to start. Every block deep-links into Google Calendar.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={onBuild}>
            <Lightning size={16} weight="fill" />
            Build my plan
          </Button>
        </div>
      </div>
    </div>
  );
}

function blockMeta(type: PlanBlock['type']) {
  if (type === 'leave') {
    return {
      icon: <Flag size={15} weight="fill" />,
      dot: 'border-accent bg-accent-bright text-accent-ink',
      card: 'border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]',
    };
  }
  if (type === 'buffer') {
    return {
      icon: <Coffee size={15} weight="bold" />,
      dot: 'border-line-strong bg-surface-2 text-muted',
      card: 'border-dashed border-line-strong bg-surface-2',
    };
  }
  return {
    icon: <CalendarCheck size={15} weight="bold" />,
    dot: 'border-accent bg-surface text-accent',
    card: 'border-line bg-surface-2',
  };
}

function PlanResult({ data }: { data: SchedulePlan }) {
  const allUrl = buildAllDayUrl(data);
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-text">{data.title}</h2>
          <p className="mt-1 text-xs leading-snug text-muted">{data.summary}</p>
        </div>
        {allUrl && (
          <a href={allUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <Button variant="subtle" size="sm">
              <CalendarPlus size={15} weight="bold" />
              Add block 1
            </Button>
          </a>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
          <Lightning size={13} weight="fill" /> Start here
        </div>
        <p className="mt-1 text-sm font-medium leading-snug text-text">{data.headline}</p>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        <ol className="relative space-y-2.5 pl-1">
          {data.blocks.map((b, i) => (
            <PlanRow key={i} block={b} index={i} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function PlanRow({ block, index }: { block: PlanBlock; index: number }) {
  const meta = blockMeta(block.type);
  const calUrl = googleCalendarUrl({
    title: block.label,
    startMs: block.startMs,
    endMs: block.endMs,
    details: block.detail,
  });
  const isLeave = block.type === 'leave';

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26, delay: index * 0.04 }}
      className={cn('flex gap-3 rounded-xl border p-3', meta.card)}
    >
      <div className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border', meta.dot)}>
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="tabular text-xs font-semibold text-text">
            {block.start}
            {!isLeave && <span className="text-muted"> to {block.end}</span>}
          </span>
          {!isLeave && block.minutes > 0 && (
            <Pill tone={block.type === 'buffer' ? 'muted' : 'accent'}>{block.minutes}m</Pill>
          )}
        </div>
        <p className="mt-1 text-sm font-medium leading-snug text-text">{block.label}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted">{block.detail}</p>
        {!isLeave && (
          <a
            href={calUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-line-strong hover:text-text"
          >
            <CalendarPlus size={13} weight="bold" />
            Add to Calendar
          </a>
        )}
      </div>
    </motion.li>
  );
}

function buildAllDayUrl(data: SchedulePlan): string | null {
  const first = data.blocks.find((b) => b.type !== 'leave');
  if (!first) return null;
  return googleCalendarUrl({
    title: first.label,
    startMs: first.startMs,
    endMs: first.endMs,
    details: first.detail,
  });
}
