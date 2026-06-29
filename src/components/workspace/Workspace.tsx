import { useEffect } from 'react';
import {
  ArrowLeft,
  Broadcast,
  CalendarCheck,
  ChatCircleText,
  ChatsCircle,
  MicrophoneStage,
  PenNib,
  PresentationChart,
  Receipt,
} from '@phosphor-icons/react';
import { useStore } from '../../store';
import { Logo } from '../ui/primitives';
import { ThemeToggle } from '../ThemeToggle';
import { cn, formatCountdown } from '../../lib/utils';
import { Intake } from './Intake';
import { PlanBoard } from './PlanBoard';
import { WatcherBar } from './WatcherBar';
import { Console } from './Console';
import { MissionControl } from './MissionControl';
import { DeckView } from './DeckView';
import { ScriptView } from './ScriptView';
import { BriefingView } from './BriefingView';
import { PlanView } from './PlanView';
import { RehearseView } from './RehearseView';
import { CaptureView } from './CaptureView';
import type { Autonomy } from '../../types';

const TABS = [
  { id: 'console', label: 'Console', icon: <ChatCircleText size={16} weight="bold" /> },
  { id: 'mission', label: 'Mission', icon: <Broadcast size={16} weight="bold" /> },
  { id: 'deck', label: 'Deck', icon: <PresentationChart size={16} weight="bold" /> },
  { id: 'script', label: 'Script', icon: <PenNib size={16} weight="bold" /> },
  { id: 'briefing', label: 'Briefing', icon: <MicrophoneStage size={16} weight="bold" /> },
  { id: 'plan', label: 'Plan', icon: <CalendarCheck size={16} weight="bold" /> },
  { id: 'rehearse', label: 'Rehearse', icon: <ChatsCircle size={16} weight="bold" /> },
  { id: 'capture', label: 'Capture', icon: <Receipt size={16} weight="bold" /> },
] as const;

export function Workspace() {
  const chiefStatus = useStore((s) => s.chiefStatus);
  const tick = useStore((s) => s.tick);

  // Live clock: drives every countdown and the autonomous Watcher.
  useEffect(() => {
    const t = setInterval(() => tick(), 1000);
    return () => clearInterval(t);
  }, [tick]);

  const hasPlan = chiefStatus === 'done';

  return (
    <div className="grain flex min-h-[100dvh] flex-col bg-surface text-text">
      <TopBar />
      {!hasPlan ? (
        <Intake />
      ) : (
        <div className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 gap-4 px-4 py-4 md:h-[calc(100dvh-4rem)] md:grid-cols-[360px_1fr]">
          <aside className="min-h-0 rounded-2xl border border-line bg-surface p-3 md:overflow-hidden">
            <PlanBoard />
          </aside>
          <main className="flex min-h-0 flex-col">
            <WatcherBar />
            <Tabs />
            <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-surface">
              <ActiveView />
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const setView = useStore((s) => s.setView);
  const commitments = useStore((s) => s.commitments);
  const now = useStore((s) => s.now);
  const autonomy = useStore((s) => s.autonomy);
  const setAutonomy = useStore((s) => s.setAutonomy);

  const next = [...commitments]
    .filter((c) => c.status !== 'done')
    .sort((a, b) => a.deadlineMs - b.deadlineMs)[0];

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('landing')}
            aria-label="Back to home"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition-colors hover:text-text"
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
          <Logo />
        </div>

        {next && (
          <div className="hidden items-center gap-3 sm:flex">
            <span className="text-xs text-muted">Next deadline</span>
            <span className="tabular rounded-full border border-line bg-surface-2 px-3 py-1 text-sm font-semibold text-text">
              {formatCountdown(next.deadlineMs - now)}
            </span>
            <span className="hidden max-w-[18ch] truncate text-xs text-muted lg:block">
              {next.title}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <AutonomyDial value={autonomy} onChange={setAutonomy} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function AutonomyDial({ value, onChange }: { value: Autonomy; onChange: (a: Autonomy) => void }) {
  const opts: Autonomy[] = ['suggest', 'confirm', 'auto'];
  return (
    <div
      className="hidden items-center rounded-full border border-line bg-surface-2 p-0.5 md:flex"
      role="group"
      aria-label="Agent autonomy"
    >
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors',
            value === o ? 'bg-accent-bright text-accent-ink' : 'text-muted hover:text-text',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Tabs() {
  const activeTab = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const deck = useStore((s) => s.deck.status);
  const script = useStore((s) => s.script.status);
  const briefing = useStore((s) => s.briefing.status);
  const plan = useStore((s) => s.plan.status);
  const rehearse = useStore((s) => s.rehearse.status);
  const capture = useStore((s) => s.capture.status);
  const autopilotRunning = useStore((s) => s.autopilotRunning);
  const statusByTab: Record<string, string> = { deck, script, briefing, plan, rehearse, capture };

  return (
    <div className="flex gap-1 rounded-full border border-line bg-surface-2 p-1">
      {TABS.map((t) => {
        const st = statusByTab[t.id];
        const active = activeTab === t.id;
        const live = t.id === 'mission' && autopilotRunning;
        return (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'relative inline-flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-accent-bright text-accent-ink' : 'text-muted hover:text-text',
            )}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {(st === 'running' || live) && (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            )}
            {st === 'done' && !active && (
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-ok" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function ActiveView() {
  const activeTab = useStore((s) => s.activeTab);
  if (activeTab === 'mission') return <MissionControl />;
  if (activeTab === 'deck') return <DeckView />;
  if (activeTab === 'script') return <ScriptView />;
  if (activeTab === 'briefing') return <BriefingView />;
  if (activeTab === 'plan') return <PlanView />;
  if (activeTab === 'rehearse') return <RehearseView />;
  if (activeTab === 'capture') return <CaptureView />;
  return (
    <div className="h-full p-4">
      <Console />
    </div>
  );
}
