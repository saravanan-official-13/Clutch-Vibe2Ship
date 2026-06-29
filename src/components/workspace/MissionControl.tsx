import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Broadcast,
  CalendarCheck,
  ChatsCircle,
  MicrophoneStage,
  PenNib,
  PresentationChart,
  Pulse,
  Receipt,
  Stop,
  Strategy,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useStore } from '../../store';
import { Button, Eyebrow, Pill } from '../ui/primitives';
import { cn } from '../../lib/utils';
import type { ActivityKind, AgentId } from '../../types';

const AGENT_META: Record<AgentId, { label: string; icon: Icon }> = {
  chief: { label: 'Chief of Staff', icon: Strategy },
  planner: { label: 'Planner', icon: CalendarCheck },
  deck: { label: 'Deck Maker', icon: PresentationChart },
  script: { label: 'Script Maker', icon: PenNib },
  briefing: { label: 'Briefing', icon: MicrophoneStage },
  rehearse: { label: 'Rehearse', icon: ChatsCircle },
  capture: { label: 'Capture', icon: Receipt },
  watcher: { label: 'Watcher', icon: Pulse },
};

const KIND_META: Record<ActivityKind, { label: string; cls: string }> = {
  triage: { label: 'Triage', cls: 'text-accent' },
  route: { label: 'Route', cls: 'text-accent' },
  dispatch: { label: 'Dispatch', cls: 'text-accent' },
  produce: { label: 'Produced', cls: 'text-ok' },
  watch: { label: 'Watch', cls: 'text-accent' },
  act: { label: 'Acted', cls: 'text-accent' },
  autopilot: { label: 'Autopilot', cls: 'text-accent' },
  error: { label: 'Error', cls: 'text-danger' },
};

const AUTONOMY_COPY: Record<string, string> = {
  suggest: 'Suggest mode. Agents advise, you trigger every action.',
  confirm: 'Confirm mode. Agents prepare the work and wait for your go.',
  auto: 'Auto mode. Agents execute the plan the moment you triage.',
};

function relTime(ts: number, now: number) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

function RosterChip({ agent, state }: { agent: AgentId; state: 'idle' | 'working' | 'done' }) {
  const meta = AGENT_META[agent];
  const I = meta.icon;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors',
        state === 'working'
          ? 'border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]'
          : 'border-line bg-surface-2',
      )}
    >
      <span className={cn(state === 'working' ? 'text-accent' : state === 'done' ? 'text-ok' : 'text-muted')}>
        <I size={16} weight={state === 'idle' ? 'regular' : 'fill'} />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-text">{meta.label}</span>
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          state === 'working' ? 'animate-pulse bg-accent' : state === 'done' ? 'bg-ok' : 'bg-[var(--line-strong)]',
        )}
      />
    </div>
  );
}

export function MissionControl() {
  const reduce = useReducedMotion();
  const activity = useStore((s) => s.activity);
  const now = useStore((s) => s.now);
  const autopilotRunning = useStore((s) => s.autopilotRunning);
  const autonomy = useStore((s) => s.autonomy);
  const runAutopilot = useStore((s) => s.runAutopilot);
  const stopAutopilot = useStore((s) => s.stopAutopilot);
  const chiefStatus = useStore((s) => s.chiefStatus);
  const commitments = useStore((s) => s.commitments);

  const deck = useStore((s) => s.deck.status);
  const script = useStore((s) => s.script.status);
  const briefing = useStore((s) => s.briefing.status);
  const plan = useStore((s) => s.plan.status);
  const rehearse = useStore((s) => s.rehearse.status);
  const capture = useStore((s) => s.capture.status);
  const watcher = useStore((s) => s.watcher);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [activity.length, reduce]);

  const makerState = (st: string): 'idle' | 'working' | 'done' =>
    st === 'running' ? 'working' : st === 'done' ? 'done' : 'idle';

  const roster: Array<{ agent: AgentId; state: 'idle' | 'working' | 'done' }> = [
    { agent: 'chief', state: autopilotRunning || chiefStatus === 'running' ? 'working' : chiefStatus === 'done' ? 'done' : 'idle' },
    { agent: 'planner', state: makerState(plan) },
    { agent: 'deck', state: makerState(deck) },
    { agent: 'script', state: makerState(script) },
    { agent: 'briefing', state: makerState(briefing) },
    { agent: 'rehearse', state: makerState(rehearse) },
    { agent: 'capture', state: makerState(capture) },
    { agent: 'watcher', state: watcher ? 'working' : 'idle' },
  ];

  const total = commitments.length;
  const done = commitments.filter((c) => c.status === 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const canRun = chiefStatus === 'done' && !autopilotRunning;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Mission Control</Eyebrow>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">Agent activity, live</h2>
        </div>
        <Pill tone={autopilotRunning ? 'accent' : 'muted'}>
          <span className={cn('mr-1.5 inline-block h-1.5 w-1.5 rounded-full', autopilotRunning ? 'animate-pulse bg-accent' : 'bg-[var(--line-strong)]')} />
          {autopilotRunning ? 'Live' : 'Idle'}
        </Pill>
      </div>

      {/* Autonomy + the one button that runs the whole rescue. */}
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Broadcast size={18} weight="duotone" className="text-accent" />
            <span>{AUTONOMY_COPY[autonomy]}</span>
          </div>
          {autopilotRunning ? (
            <Button variant="danger" size="sm" onClick={() => stopAutopilot()}>
              <Stop size={15} weight="fill" /> Stop autopilot
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={() => void runAutopilot()} disabled={!canRun}>
              <Broadcast size={15} weight="fill" /> Run autopilot
            </Button>
          )}
        </div>

        {total > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>Plan progress</span>
              <span className="tabular">{done}/{total} handled</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full bg-accent-bright"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* The agent swarm, lighting up as work flows through it. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {roster.map((r) => (
          <RosterChip key={r.agent} agent={r.agent} state={r.state} />
        ))}
      </div>

      {/* Live trace of every decision and dispatch. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Activity feed</span>
          <span className="tabular text-xs text-muted">{activity.length} events</span>
        </div>
        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
          {activity.length === 0 ? (
            <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
              <Broadcast size={28} weight="duotone" className="text-muted" />
              <p className="text-sm text-muted">No agent activity yet.</p>
              <p className="max-w-xs text-xs text-muted">
                Triage a brain-dump or run autopilot to watch the Chief of Staff dispatch its agents in real time.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {activity.map((ev) => {
                const meta = AGENT_META[ev.agent];
                const I = meta.icon;
                const kind = KIND_META[ev.kind];
                return (
                  <motion.div
                    key={ev.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2"
                  >
                    <span className={cn('mt-0.5 shrink-0', kind.cls)}>
                      <I size={16} weight="fill" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text">{meta.label}</span>
                        <span className={cn('text-[10px] font-medium uppercase tracking-wide', kind.cls)}>{kind.label}</span>
                        <span className="tabular ml-auto shrink-0 text-[10px] text-muted">{relTime(ev.ts, now)}</span>
                      </div>
                      <p className="mt-0.5 text-sm leading-snug text-text">{ev.message}</p>
                      {ev.detail && <p className="mt-0.5 truncate text-xs text-muted">{ev.detail}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
