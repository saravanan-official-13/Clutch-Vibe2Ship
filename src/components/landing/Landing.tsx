import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  MicrophoneStage,
  PenNib,
  PresentationChart,
  Pulse,
  Strategy,
  Waveform,
} from '@phosphor-icons/react';
import { Button, Eyebrow, Logo } from '../ui/primitives';
import { ThemeToggle } from '../ThemeToggle';
import { LivePreview } from './LivePreview';
import { useStore } from '../../store';

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Landing() {
  const setView = useStore((s) => s.setView);
  const open = () => setView('app');

  return (
    <div className="grain min-h-[100dvh] bg-surface text-text">
      <Nav open={open} />
      <main className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <Hero open={open} />
        <TechWall />
        <HowItWorks />
        <AgentRoster />
        <BriefingFeature open={open} />
        <StatBand />
        <FinalCta open={open} />
      </main>
      <Footer />
    </div>
  );
}

function Nav({ open }: { open: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a href="#how" className="transition-colors hover:text-text">How it works</a>
          <a href="#agents" className="transition-colors hover:text-text">Agents</a>
          <a href="#briefing" className="transition-colors hover:text-text">Briefing</a>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button size="sm" onClick={open}>
            Open Clutch
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero({ open }: { open: () => void }) {
  const reduce = useReducedMotion();
  return (
    <section className="grid items-center gap-12 pt-16 pb-20 md:grid-cols-[1.05fr_0.95fr] md:pt-24 md:pb-28">
      <div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Eyebrow>The last-minute life saver</Eyebrow>
        </motion.div>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl"
        >
          Beat the clock.
          <br />
          <span className="text-accent">Ship the work.</span>
        </motion.h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-[48ch] text-lg leading-relaxed text-muted"
        >
          Your AI chief of staff for the last 24 hours. It does not remind you, it produces
          the work: the deck, the briefing, the message, and a plan that fits the clock.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex flex-wrap items-center gap-4"
        >
          <Button size="lg" onClick={open}>
            Open Clutch
            <ArrowRight size={18} weight="bold" />
          </Button>
          <a
            href="#how"
            className="text-sm font-medium text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
          >
            See the six agents
          </a>
        </motion.div>
      </div>

      <div className="md:pl-6">
        <LivePreview />
      </div>
    </section>
  );
}

const TECH = [
  { slug: 'googlegemini', name: 'Gemini' },
  { slug: 'google', name: 'Google AI Studio' },
  { slug: 'firebase', name: 'Firebase' },
  { slug: 'googlecloud', name: 'Google Cloud' },
  { slug: 'googlecalendar', name: 'Google Calendar' },
];

function TechWall() {
  return (
    <section className="border-t border-line py-10">
      <p className="mb-7 text-center text-xs uppercase tracking-[0.22em] text-muted">
        Built on the Google AI stack
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-80">
        {TECH.map((t) => (
          <img
            key={t.slug}
            src={`https://cdn.simpleicons.org/${t.slug}/a1a1aa`}
            alt={t.name}
            height={26}
            className="h-6 w-auto"
            loading="lazy"
          />
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { n: '01', title: 'Dump the panic', body: 'Type or speak everything on your mind. No structure needed.', icon: <Brain size={22} weight="duotone" /> },
  { n: '02', title: 'Triage', body: 'The Chief of Staff ranks it by urgency, impact, and what survives the clock.', icon: <Strategy size={22} weight="duotone" /> },
  { n: '03', title: 'Dispatch', body: 'It calls the right specialist agent for each thing it can produce.', icon: <Pulse size={22} weight="duotone" /> },
  { n: '04', title: 'Produce', body: 'You get the deck, the briefing, the message. Real artifacts, not advice.', icon: <PresentationChart size={22} weight="duotone" /> },
];

function HowItWorks() {
  return (
    <section id="how" className="border-t border-line py-20 md:py-28">
      <Reveal>
        <h2 className="max-w-[18ch] text-4xl font-semibold tracking-tight md:text-5xl">
          From panic to shipped in four moves.
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.08}>
            <div className="flex h-full flex-col gap-4 bg-surface-2 p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-3 text-accent">
                  {s.icon}
                </span>
                <span className="tabular text-sm text-muted">{s.n}</span>
              </div>
              <h3 className="text-lg font-semibold text-text">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const AGENTS = [
  { name: 'Chief of Staff', role: 'Triages your brain-dump and dispatches the right agents through Gemini function calling.', icon: <Strategy size={24} weight="duotone" />, wide: true },
  { name: 'Watcher', role: 'Runs against the clock and interrupts you before you miss something.', icon: <Pulse size={24} weight="duotone" />, wide: true },
  { name: 'Deck Maker', role: 'A board-ready deck in under a minute.', icon: <PresentationChart size={24} weight="duotone" /> },
  { name: 'Script Maker', role: 'The email, pitch, or apology, in your voice.', icon: <PenNib size={24} weight="duotone" /> },
  { name: 'Briefing', role: 'Your document as a two-host audio briefing.', icon: <MicrophoneStage size={24} weight="duotone" /> },
  { name: 'Planner', role: 'Backward-plans the deadline and books focus blocks on Calendar.', icon: <CalendarCheck size={24} weight="duotone" /> },
];

function AgentRoster() {
  return (
    <section id="agents" className="border-t border-line py-20 md:py-28">
      <Reveal>
        <Eyebrow>The team that shows up at 11pm</Eyebrow>
        <h2 className="mt-4 max-w-[20ch] text-4xl font-semibold tracking-tight md:text-5xl">
          Six agents. One does the thinking, five do the work.
        </h2>
      </Reveal>
      <div className="mt-14 grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a, i) => (
          <Reveal key={a.name} delay={i * 0.06}>
            <div
              className={
                'flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface-2 p-6 transition-colors hover:border-line-strong ' +
                (a.wide ? 'lg:col-span-1' : '')
              }
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-surface-3 text-accent">
                {a.icon}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-text">{a.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{a.role}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function BriefingFeature({ open }: { open: () => void }) {
  const reduce = useReducedMotion();
  return (
    <section id="briefing" className="border-t border-line py-20 md:py-28">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <Reveal>
          <Eyebrow>The move that wins the room</Eyebrow>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            A podcast briefing of the deck you have to present.
          </h2>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted">
            Hand Clutch the file you never read. Two hosts, Maya and Dev, turn it into a six
            minute briefing you absorb on the way to the meeting. Powered by Gemini multi
            speaker text to speech.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={open}>
              Hear it in the app
              <ArrowRight size={18} weight="bold" />
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-2xl border border-line bg-surface-2 p-6">
            <div className="flex items-center gap-3">
              <HostAvatar initials="M" label="Maya" />
              <HostAvatar initials="D" label="Dev" muted />
              <span className="ml-auto tabular text-sm text-muted">6:02</span>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-text">
              <span className="font-medium text-accent">Maya:</span> The thing they will push
              on is margin. It dropped 1.9 points to 61.2.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text">
              <span className="font-medium text-muted">Dev:</span> Two causes, both temporary.
              Your answer is fuel and a carrier reset, with Q4 recovery already modeled.
            </p>
            <div className="mt-6 flex items-end gap-1" aria-hidden>
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="w-1 flex-1 rounded-full bg-accent/60"
                  style={{ originY: 1 }}
                  initial={{ scaleY: 0.2 }}
                  animate={reduce ? { scaleY: 0.4 } : { scaleY: [0.2, Math.random() * 0.9 + 0.2, 0.3] }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 1.4, repeat: Infinity, delay: i * 0.03, ease: 'easeInOut' }
                  }
                />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function HostAvatar({ initials, label, muted }: { initials: string; label: string; muted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={
          muted
            ? 'grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-sm font-semibold text-muted'
            : 'grid h-8 w-8 place-items-center rounded-full bg-accent-bright text-sm font-semibold text-accent-ink'
        }
      >
        {initials}
      </span>
      <span className="text-sm font-medium text-text">{label}</span>
    </span>
  );
}

const STATS = [
  { value: '72m', label: 'A typical "I have no deck" window, handled.' },
  { value: '6:02', label: 'A full financials briefing, generated and voiced.' },
  { value: '5 -> 3', label: 'Tasks reduced to the ones that beat the clock.' },
];

function StatBand() {
  return (
    <section className="border-t border-line py-16">
      <div className="grid gap-10 md:grid-cols-3">
        {STATS.map((s, i) => (
          <Reveal key={s.value} delay={i * 0.08}>
            <div>
              <div className="tabular text-5xl font-semibold tracking-tight text-text md:text-6xl">
                {s.value}
              </div>
              <p className="mt-3 max-w-[28ch] text-sm leading-relaxed text-muted">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ open }: { open: () => void }) {
  return (
    <section className="py-20 md:py-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-line bg-surface-2 p-10 md:p-16">
          <div className="relative z-10 max-w-[36ch]">
            <Waveform size={32} weight="duotone" className="text-accent" />
            <h2 className="mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
              The deadline is not the problem. Doing it alone is.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              Open Clutch, dump what is on your mind, and watch six agents go to work.
            </p>
            <div className="mt-8">
              <Button size="lg" onClick={open}>
                Open Clutch
                <ArrowRight size={18} weight="bold" />
              </Button>
            </div>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
          />
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-muted sm:flex-row sm:px-8">
        <Logo />
        <p>Built for Vibe2Ship on Google AI Studio and Gemini.</p>
      </div>
    </footer>
  );
}
