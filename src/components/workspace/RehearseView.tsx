import { useState } from 'react';
import {
  ArrowSquareOut,
  Briefcase,
  ChatsCircle,
  Check,
  Copy,
  GraduationCap,
  Quotes,
  SpinnerGap,
  UserCheck,
  Warning,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useStore } from '../../store';
import { Button } from '../ui/primitives';
import { RunError, RunLoading } from './MakerStates';
import { cn } from '../../lib/utils';
import type { PrepPack, ResumeRecall, ScreenRecommendation, ScreenResult } from '../../types';

// ---------------------------------------------------------------------------
// Mode switcher
// ---------------------------------------------------------------------------

type RehearseMode = 'prep' | 'recall' | 'screen';

const MODES: { id: RehearseMode; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'prep', label: 'Prep Q&A', icon: <ChatsCircle size={16} weight="duotone" />, desc: 'Hard questions + model answers' },
  { id: 'recall', label: 'Resume Recall', icon: <GraduationCap size={16} weight="duotone" />, desc: 'Remember what you put in your resume' },
  { id: 'screen', label: 'Screen Candidate', icon: <UserCheck size={16} weight="duotone" />, desc: 'Evaluate a resume against the JD' },
];

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked */ }
  };
  return (
    <Button variant="ghost" size="sm" onClick={copy} className="h-7 px-2 text-xs">
      {copied ? <Check size={13} weight="bold" /> : <Copy size={13} weight="bold" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Prep Q&A mode (original)
// ---------------------------------------------------------------------------

function PrepEmpty({ onPrep }: { onPrep: (role: string, context?: string) => void }) {
  const [role, setRole] = useState('Series A investor Q&A for my logistics startup');
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-3 text-accent">
          <ChatsCircle size={26} weight="duotone" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-text">Walk in ready.</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Say what you are about to face. Returns the toughest questions, model answers, traps to dodge, and one question to ask back.
        </p>
        <textarea
          value={role}
          onChange={(e) => setRole(e.target.value)}
          rows={2}
          className="mt-4 w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
          aria-label="What are you preparing for"
        />
        <div className="mt-4 flex justify-center">
          <Button onClick={() => onPrep(role)} disabled={!role.trim()}>Prep me</Button>
        </div>
      </div>
    </div>
  );
}

function PrepResult({ data }: { data: PrepPack }) {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="min-w-0">
        <h2 className="truncate text-base font-semibold text-text">{data.role}</h2>
        <p className="mt-1 text-xs text-muted">{data.questions.length} likely questions, drilled and ready</p>
      </div>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        <section className="rounded-2xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">Open with this</span>
            <CopyButton text={data.intro} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-text">{data.intro}</p>
        </section>
        <div className="space-y-2.5">
          {data.questions.map((q, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 26, delay: i * 0.04 }}
              className="rounded-xl border border-line bg-surface-2 p-3.5"
            >
              <div className="flex items-start gap-2.5">
                <span className="tabular mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line-strong text-xs font-semibold text-accent">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-text">{q.q}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-text">{q.answer}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                    <Quotes size={13} weight="fill" className="shrink-0 text-accent" />
                    <span>{q.why}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {data.landmines.length > 0 && (
          <section className="rounded-xl border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-danger">
              <Warning size={14} weight="fill" /> Do not say
            </div>
            <ul className="mt-2 space-y-1.5">
              {data.landmines.map((l, i) => (
                <li key={i} className="flex gap-2 text-sm leading-snug text-text">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-danger" />{l}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="rounded-xl border border-line bg-surface px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Ask them back</span>
            <CopyButton text={data.askBack} />
          </div>
          <p className="mt-1.5 text-sm leading-snug text-text">{data.askBack}</p>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resume Recall mode (candidate - "give" the interview)
// ---------------------------------------------------------------------------

function RecallEmpty({ onRecall }: { onRecall: (resume: string, jd: string, role: string) => void }) {
  const [role, setRole] = useState('Senior Product Manager, Last-Mile Logistics');
  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center gap-2 text-base font-semibold text-text">
        <GraduationCap size={20} weight="duotone" className="text-accent" />
        Resume Recall
      </div>
      <p className="text-sm text-muted">
        You crafted a tailored resume for this role and may not remember exactly what you claimed.
        Paste it here - Clutch will surface what the interviewer will probe and what to say.
      </p>
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Role you are interviewing for</label>
        <input value={role} onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Your resume (paste the text)</label>
        <textarea value={resume} onChange={(e) => setResume(e.target.value)} rows={5}
          placeholder="Paste your resume text here..."
          className="w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Job description (optional)</label>
        <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={3}
          placeholder="Paste the JD so Clutch can align your resume to it..."
          className="w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <Button onClick={() => onRecall(resume || 'demo', jd, role)} disabled={!role.trim()}>
        Recall my resume
      </Button>
    </div>
  );
}

function RecallResult({ data }: { data: ResumeRecall }) {
  return (
    <div className="flex h-full flex-col p-4">
      <div>
        <h2 className="text-base font-semibold text-text">{data.role}</h2>
        <p className="mt-0.5 text-xs text-muted">What is on your resume - and what they will probe</p>
      </div>
      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        <section className="space-y-2 rounded-2xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent">Resume highlights they will probe</span>
          <ul className="mt-2 space-y-2">
            {data.resumeHighlights.map((h, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-text">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{h}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 rounded-xl border border-line bg-surface-2 p-3.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">How your resume aligns to this JD</span>
          <ul className="mt-1 space-y-2">
            {data.alignedStrengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-text">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />{s}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-3.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-danger">Where they will push back</span>
          <ul className="mt-2 space-y-2">
            {data.likelyGaps.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm text-text">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-danger" />{g}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2 rounded-xl border border-line bg-surface-2 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Talking points to land</span>
            <CopyButton text={data.talkingPoints.join('\n\n')} />
          </div>
          <ul className="mt-1 space-y-2.5">
            {data.talkingPoints.map((t, i) => (
              <li key={i} className="rounded-lg bg-surface px-3 py-2 text-sm italic leading-relaxed text-text">
                "{t}"
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-danger">
            <Warning size={14} weight="fill" /> Watch out
          </div>
          <p className="mt-1.5 text-sm text-text">{data.watchOut}</p>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen Candidate mode (interviewer - "take" the interview)
// ---------------------------------------------------------------------------

const RECOMMENDATION_LABELS: Record<ScreenRecommendation, { label: string; color: string }> = {
  'strong-yes': { label: 'Strong Yes', color: 'text-green-600' },
  'yes': { label: 'Yes', color: 'text-green-500' },
  'maybe': { label: 'Maybe', color: 'text-accent' },
  'no': { label: 'No', color: 'text-danger' },
};

function ScreenEmpty({ onScreen }: { onScreen: (jd: string, resume: string) => void }) {
  const [jd, setJd] = useState('');
  const [resume, setResume] = useState('');
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-4">
      <div className="flex items-center gap-2 text-base font-semibold text-text">
        <UserCheck size={20} weight="duotone" className="text-accent" />
        Screen Candidate
      </div>
      <p className="text-sm text-muted">
        Paste the job description and the candidate's resume. Clutch scores fit, surfaces gaps, and gives you the sharpest questions to ask in the room.
      </p>
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Job description</label>
        <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={4}
          placeholder="Paste the full job description..."
          className="w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">Candidate resume</label>
        <textarea value={resume} onChange={(e) => setResume(e.target.value)} rows={5}
          placeholder="Paste the candidate's resume..."
          className="w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>
      <Button onClick={() => onScreen(jd || 'demo', resume || 'demo')} disabled={!jd.trim() && !resume.trim()}>
        Screen this candidate
      </Button>
    </div>
  );
}

function ScreenResult({ data }: { data: ScreenResult }) {
  const rec = RECOMMENDATION_LABELS[data.recommendation] || { label: data.recommendation, color: 'text-text' };
  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">{data.candidate}</h2>
          <p className="mt-0.5 text-xs text-muted">{data.role}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-2xl font-bold text-accent">{data.fitScore}<span className="text-sm text-muted">/10</span></span>
          <span className={cn('text-xs font-semibold uppercase tracking-wide', rec.color)}>{rec.label}</span>
        </div>
      </div>
      <p className="mt-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-text">{data.summary}</p>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        <section className="rounded-xl border border-line bg-surface-2 p-3.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Strengths</span>
          <ul className="mt-2 space-y-2">
            {data.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-text">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />{s}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-3.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-danger">Gaps to probe</span>
          <ul className="mt-2 space-y-2">
            {data.gaps.map((g, i) => (
              <li key={i} className="flex gap-2 text-sm text-text">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-danger" />{g}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[color-mix(in_oklab,var(--accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">Questions to ask in the room</span>
            <CopyButton text={data.topQuestions.join('\n\n')} />
          </div>
          <ol className="mt-2 space-y-2">
            {data.topQuestions.map((q, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-text">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line-strong text-[10px] font-bold text-accent">
                  {i + 1}
                </span>
                {q}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function RehearseView() {
  const [mode, setMode] = useState<RehearseMode>('prep');

  const rehearse = useStore((s) => s.rehearse);
  const runRehearse = useStore((s) => s.runRehearse);
  const screener = useStore((s) => s.screener);
  const runScreener = useStore((s) => s.runScreener);
  const resumeRecall = useStore((s) => s.resumeRecall);
  const runResumeRecall = useStore((s) => s.runResumeRecall);

  const modeState = mode === 'prep' ? rehearse : mode === 'screen' ? screener : resumeRecall;
  const isRunning = modeState.status === 'running';

  return (
    <div className="flex h-full flex-col">
      {/* Mode switcher */}
      <div className="shrink-0 flex gap-1 border-b border-line px-3 pt-3 pb-0">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2 text-xs font-medium transition-colors',
              mode === m.id
                ? 'border-line bg-surface-2 text-text'
                : 'border-transparent text-muted hover:text-text',
            )}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Mode content */}
      <div className="flex-1 overflow-hidden">
        {mode === 'prep' && (
          <>
            {isRunning && <RunLoading label="Rehearse is drilling the hard questions..." lines={5} />}
            {!isRunning && rehearse.status === 'error' && (
              <RunError message={rehearse.error} onRetry={() => runRehearse('Northwind Q3 board review, the Q&A')} />
            )}
            {!isRunning && rehearse.status !== 'error' && !rehearse.data && (
              <PrepEmpty onPrep={runRehearse} />
            )}
            {!isRunning && rehearse.data && <PrepResult data={rehearse.data} />}
          </>
        )}

        {mode === 'recall' && (
          <>
            {isRunning && <RunLoading label="Recalling your resume highlights..." lines={4} />}
            {!isRunning && resumeRecall.status === 'error' && (
              <RunError message={resumeRecall.error} onRetry={() => runResumeRecall('demo', '', 'PM role')} />
            )}
            {!isRunning && resumeRecall.status !== 'error' && !resumeRecall.data && (
              <RecallEmpty onRecall={runResumeRecall} />
            )}
            {!isRunning && resumeRecall.data && <RecallResult data={resumeRecall.data} />}
          </>
        )}

        {mode === 'screen' && (
          <>
            {isRunning && <RunLoading label="Screening resume against job description..." lines={4} />}
            {!isRunning && screener.status === 'error' && (
              <RunError message={screener.error} onRetry={() => runScreener('demo', 'demo')} />
            )}
            {!isRunning && screener.status !== 'error' && !screener.data && (
              <ScreenEmpty onScreen={runScreener} />
            )}
            {!isRunning && screener.data && <ScreenResult data={screener.data} />}
          </>
        )}
      </div>
    </div>
  );
}
