import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CaretDown, Check, Copy, Lightning, Pulse, X } from '@phosphor-icons/react';
import { useStore } from '../../store';
import { cn } from '../../lib/utils';

const levelClass: Record<string, string> = {
  nudge: 'border-line bg-surface-2 text-text',
  warning:
    'border-[color-mix(in_oklab,var(--accent)_35%,transparent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] text-text',
  critical:
    'border-[color-mix(in_oklab,var(--danger)_40%,transparent)] bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] text-text',
};
const iconColor: Record<string, string> = {
  nudge: 'text-muted',
  warning: 'text-accent',
  critical: 'text-danger',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { /* blocked */ }
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 rounded-full border border-line px-2 py-1 text-[11px] text-muted transition-colors hover:text-text">
      {copied ? <Check size={11} weight="bold" /> : <Copy size={11} weight="bold" />}
      {copied ? 'Copied' : 'Copy prompt'}
    </button>
  );
}

export function WatcherBar() {
  const watcher = useStore((s) => s.watcher);
  const dismiss = useStore((s) => s.dismissWatcher);
  const executeWatcherAct = useStore((s) => s.executeWatcherAct);
  const backups = useStore((s) => s.backups);
  const setActiveTab = useStore((s) => s.setActiveTab);

  const [promptOpen, setPromptOpen] = useState(false);

  // Find a ready backup that matches a commitment referenced in the Watcher alert.
  const overdueBackup = watcher?.act?.commitmentId
    ? backups[watcher.act.commitmentId]
    : Object.values(backups).find((b) => b.status === 'ready' && watcher?.level === 'critical');

  const hasBackup = overdueBackup?.status === 'ready';

  return (
    <AnimatePresence>
      {watcher && (
        <motion.div
          key={watcher.level}
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="overflow-hidden"
        >
          <div className={cn('mb-3 rounded-xl border p-3', levelClass[watcher.level])}>
            <div className="flex items-start gap-3">
              <span className={cn('mt-0.5 shrink-0', iconColor[watcher.level])}>
                <Pulse size={18} weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">Watcher</span>
                  <span className={cn('text-[10px] uppercase tracking-wide', iconColor[watcher.level])}>
                    {watcher.level}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-snug text-text">{watcher.message}</p>

                {/* Primary action button */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {watcher.act ? (
                    <button
                      onClick={() => void executeWatcherAct()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-3 py-1 text-xs font-semibold text-text transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_20%,transparent)]"
                    >
                      <Lightning size={13} weight="fill" className={iconColor[watcher.level]} />
                      {watcher.act.label}
                    </button>
                  ) : (
                    watcher.action && <p className="text-xs text-muted">Suggested: {watcher.action}</p>
                  )}

                  {/* Backup ready badge */}
                  {hasBackup && overdueBackup && (
                    <button
                      onClick={() => {
                        const agentId = overdueBackup.agentId;
                        if (agentId === 'deck') setActiveTab('deck');
                        else if (agentId === 'script') setActiveTab('script');
                        else if (agentId === 'briefing') setActiveTab('briefing');
                        else if (agentId === 'rehearse') setActiveTab('rehearse');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600 transition-colors hover:bg-green-500/20"
                    >
                      Backup ready - view it
                    </button>
                  )}
                </div>

                {/* Prompt guide (collapsed by default, shown for critical overdue) */}
                {watcher.level === 'critical' && overdueBackup?.promptGuide && (
                  <div className="mt-2">
                    <button
                      onClick={() => setPromptOpen((v) => !v)}
                      className="flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-text"
                    >
                      <CaretDown
                        size={11}
                        weight="bold"
                        className={cn('transition-transform', promptOpen && 'rotate-180')}
                      />
                      {promptOpen ? 'Hide' : 'Show'} AI prompt guide
                    </button>
                    <AnimatePresence>
                      {promptOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 rounded-lg border border-line bg-surface p-3">
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                                Paste into ChatGPT, Gemini, or Claude
                              </span>
                              <CopyButton text={overdueBackup.promptGuide} />
                            </div>
                            <p className="text-xs leading-relaxed text-text">{overdueBackup.promptGuide}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <button
                onClick={() => dismiss(watcher.id)}
                aria-label="Dismiss"
                className="shrink-0 text-muted transition-colors hover:text-text"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
