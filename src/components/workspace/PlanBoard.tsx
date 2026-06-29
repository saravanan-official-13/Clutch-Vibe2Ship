import { AnimatePresence, motion } from 'motion/react';
import {
  CalendarCheck,
  CalendarPlus,
  ChatsCircle,
  Check,
  Circle,
  CircleNotch,
  Lightning,
  MicrophoneStage,
  PenNib,
  PresentationChart,
  Receipt,
  Trash,
  X,
} from '@phosphor-icons/react';
import { useStore } from '../../store';
import { cn, googleCalendarUrl, relativeDeadline } from '../../lib/utils';
import { Pill } from '../ui/primitives';
import type { AgentId, Commitment } from '../../types';

const agentIcon: Record<string, React.ReactNode> = {
  deck: <PresentationChart size={14} weight="bold" />,
  script: <PenNib size={14} weight="bold" />,
  briefing: <MicrophoneStage size={14} weight="bold" />,
  planner: <CalendarCheck size={14} weight="bold" />,
  rehearse: <ChatsCircle size={14} weight="bold" />,
  capture: <Receipt size={14} weight="bold" />,
};
const agentLabel: Record<string, string> = {
  deck: 'Build deck',
  script: 'Write it',
  briefing: 'Brief it',
  planner: 'Plan it',
  rehearse: 'Prep me',
  capture: 'Scan it',
};

const urgencyTone: Record<string, 'danger' | 'accent' | 'muted'> = {
  critical: 'danger',
  high: 'accent',
  medium: 'muted',
  low: 'muted',
};

export function PlanBoard() {
  const commitments = useStore((s) => s.commitments);
  const chief = useStore((s) => s.chief);
  const now = useStore((s) => s.now);

  const done = commitments.filter((c) => c.status === 'done').length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">The plan</h2>
        <span className="tabular text-xs text-muted">
          {done}/{commitments.length} done
        </span>
      </div>

      {chief?.plan.firstMove && (
        <div className="mb-3 rounded-xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Lightning size={13} weight="fill" /> First move
          </div>
          <p className="mt-1 text-sm leading-snug text-text">{chief.plan.firstMove}</p>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {commitments.map((c) => (
            <CommitmentRow key={c.id} c={c} now={now} />
          ))}
        </AnimatePresence>
        {commitments.length === 0 && (
          <p className="px-1 py-6 text-sm text-muted">No commitments yet.</p>
        )}
      </div>
    </div>
  );
}

function CommitmentRow({ c, now }: { c: Commitment; now: number }) {
  const cycleStatus = useStore((s) => s.cycleStatus);
  const dropCommitment = useStore((s) => s.dropCommitment);
  const dispatchFor = useStore((s) => s.dispatchFor);

  const minsLeft = Math.round((c.deadlineMs - now) / 60000);
  const tight = minsLeft > 0 && minsLeft < c.effortMin && c.status !== 'done';
  const done = c.status === 'done';

  const calUrl = googleCalendarUrl({
    title: c.title,
    startMs: now + 60_000,
    endMs: now + (c.effortMin + 1) * 60_000,
    details: c.rationale,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 26 }}
      className={cn(
        'group rounded-xl border bg-surface-2 p-3 transition-colors',
        done ? 'border-line opacity-60' : 'border-line hover:border-line-strong',
      )}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => cycleStatus(c.id)}
          aria-label={`Mark ${c.title} status`}
          className={cn(
            'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors',
            done
              ? 'border-ok bg-ok text-surface'
              : c.status === 'doing'
                ? 'border-accent text-accent'
                : 'border-line-strong text-transparent hover:border-accent',
          )}
        >
          {done ? (
            <Check size={12} weight="bold" />
          ) : c.status === 'doing' ? (
            <CircleNotch size={12} weight="bold" className="animate-spin" />
          ) : (
            <Circle size={8} weight="fill" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-sm font-medium leading-snug text-text', done && 'line-through')}>
              {c.title}
            </p>
            <button
              onClick={() => dropCommitment(c.id)}
              aria-label="Drop"
              className="shrink-0 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            >
              <Trash size={14} weight="bold" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill tone={urgencyTone[c.urgency]}>{c.urgency}</Pill>
            <span
              className={cn(
                'tabular rounded-full border border-line px-2 py-0.5 text-[11px]',
                tight ? 'text-danger' : 'text-muted',
              )}
            >
              {relativeDeadline(c.deadlineMs, now)}
            </span>
            <span className="tabular rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
              {c.effortMin}m work
            </span>
          </div>

          <p className="mt-2 text-xs leading-snug text-muted">{c.rationale}</p>

          {!done && (c.suggestedAgent || true) && (
            <div className="mt-2.5 flex items-center gap-2">
              {c.suggestedAgent && agentLabel[c.suggestedAgent] && (
                <button
                  onClick={() => dispatchFor(c.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-bright px-2.5 py-1 text-[11px] font-semibold text-accent-ink transition-[filter] hover:brightness-110 active:scale-[0.97]"
                >
                  {agentIcon[c.suggestedAgent]}
                  {agentLabel[c.suggestedAgent]}
                </button>
              )}
              <a
                href={calUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted transition-colors hover:text-text hover:border-line-strong"
              >
                <CalendarPlus size={13} weight="bold" />
                Block time
              </a>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
