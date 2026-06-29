import { create } from 'zustand';
import {
  AGENT_LABELS,
  generatePromptGuide,
  makeCapture,
  makeDeck,
  makePlan,
  makePrep,
  makeResumeRecall,
  routeRequest,
  runChief,
  runWatcher,
  screenResume,
  synthesizeBriefingAudio,
  writeBriefing,
  writeScript,
} from './services/agents';
import type { CaptureImage } from './services/agents';
import { createGoogleSlides } from './services/googleSlides';
import { generateSlideImage } from './services/visuals';
import { isDemoMode } from './services/gemini';
import { DEMO_BRAINDUMP } from './data/demo';
import { uid } from './lib/utils';
import type {
  ActivityEvent,
  AgentId,
  Autonomy,
  BackupDoc,
  Briefing,
  CaptureKind,
  CaptureResult,
  ChiefResult,
  Commitment,
  Deck,
  PrepPack,
  ResumeRecall,
  SchedulePlan,
  ScriptDoc,
  ScriptKind,
  ScreenResult,
  SlidesExport,
  TaskStatus,
  WatcherAlert,
} from './types';

type RunStatus = 'idle' | 'running' | 'done' | 'error';
type View = 'landing' | 'app';
type Tab = 'console' | 'mission' | 'deck' | 'script' | 'briefing' | 'plan' | 'rehearse' | 'capture';
type Theme = 'light' | 'dark';

export interface ConsoleMessage {
  id: string;
  role: 'user' | 'chief';
  text: string;
}

interface MakerState<T> {
  status: RunStatus;
  data: T | null;
  error?: string;
}

interface ClutchState {
  view: View;
  theme: Theme;
  now: number;

  brainDump: string;
  chiefStatus: RunStatus;
  chief: ChiefResult | null;

  commitments: Commitment[];
  autonomy: Autonomy;

  conversation: ConsoleMessage[];
  routing: boolean;

  activeTab: Tab;
  deck: MakerState<Deck>;
  deckImageGenerating: number | null;
  slidesExport: SlidesExport;
  script: MakerState<ScriptDoc>;
  briefing: MakerState<Briefing> & { audioUrl: string | null };
  plan: MakerState<SchedulePlan>;
  rehearse: MakerState<PrepPack>;
  capture: MakerState<CaptureResult>;

  screener: MakerState<ScreenResult>;
  resumeRecall: MakerState<ResumeRecall>;
  /** Proactive backups keyed by commitment id. */
  backups: Record<string, BackupDoc>;

  watcher: WatcherAlert | null;
  dismissedWatcher: string[];

  // Mission Control: live trace of the agent swarm + autonomous execution state.
  activity: ActivityEvent[];
  autopilotRunning: boolean;
  autoActedWatcher: string[];

  // actions
  setView: (v: View) => void;
  toggleTheme: () => void;
  setBrainDump: (s: string) => void;
  setAutonomy: (a: Autonomy) => void;
  setActiveTab: (t: Tab) => void;

  triage: () => Promise<void>;
  ask: (message: string) => Promise<void>;

  runDeck: (topic: string, notes?: string, focus?: boolean) => Promise<void>;
  createSlidesExport: () => Promise<void>;
  generateDeckImage: (slideIndex: number) => Promise<void>;
  runScreener: (jd: string, resume: string) => Promise<void>;
  runResumeRecall: (resume: string, jd: string, role: string) => Promise<void>;
  runScript: (kind: ScriptKind, context: string, focus?: boolean) => Promise<void>;
  runBriefing: (sourceText: string, focus?: boolean) => Promise<void>;
  runPlan: (focus?: boolean) => Promise<void>;
  runRehearse: (role: string, context?: string, focus?: boolean) => Promise<void>;
  runCapture: (kind: CaptureKind, image?: CaptureImage, focus?: boolean) => Promise<void>;

  cycleStatus: (id: string) => void;
  dropCommitment: (id: string) => void;
  dispatchFor: (id: string, focus?: boolean) => Promise<void>;

  // Autonomy: the Chief runs the whole plan end to end, no clicks.
  runAutopilot: () => Promise<void>;
  stopAutopilot: () => void;
  executeWatcherAct: () => Promise<void>;

  tick: () => void;
  dismissWatcher: (id: string) => void;
}

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const saved = window.localStorage.getItem('clutch-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('clutch-theme', theme);
  }
}

export const useStore = create<ClutchState>((set, get) => {
  const initialTheme = readInitialTheme();
  applyTheme(initialTheme);

  // Append one event to the Mission Control feed (capped so it stays light).
  function logActivity(e: { agent: AgentId; kind: ActivityEvent['kind']; message: string; detail?: string }) {
    const evt: ActivityEvent = { id: uid('a'), ts: Date.now(), ...e };
    set((s) => ({ activity: [...s.activity, evt].slice(-80) }));
  }

  // De-dupe watch-level activity so the timer does not spam the feed.
  let lastWatch = '';

  function recomputeWatcher() {
    const { commitments, now, dismissedWatcher, watcher, autonomy, autopilotRunning, autoActedWatcher } = get();
    const alert = runWatcher(commitments, now);

    // Auto mode self-heal: the Watcher autonomously resolves a "drop" overload
    // exactly once per triage, then hands control back. No runaway cascade.
    if (
      alert &&
      autonomy === 'auto' &&
      !autopilotRunning &&
      alert.act?.kind === 'drop' &&
      alert.act.commitmentId &&
      autoActedWatcher.length === 0
    ) {
      const targetId = alert.act.commitmentId;
      const target = commitments.find((c) => c.id === targetId);
      if (target) {
        set((s) => ({
          commitments: s.commitments.filter((c) => c.id !== targetId),
          autoActedWatcher: [...s.autoActedWatcher, alert.message],
          watcher: null,
        }));
        logActivity({
          agent: 'watcher',
          kind: 'act',
          message: `Over capacity, so I dropped "${target.title}" to protect the deadline.`,
          detail: 'Lowest-impact task, auto-resolved in auto mode.',
        });
        set((s) => ({
          conversation: [
            ...s.conversation,
            {
              id: uid('m'),
              role: 'chief',
              text: `Heads up: you were over capacity, so I dropped "${target.title}" to protect the deadline. Say the word if you want it back.`,
            },
          ],
        }));
        // Re-evaluate against the trimmed list and surface any softer alert.
        const next = runWatcher(get().commitments, get().now);
        if (next && !get().dismissedWatcher.includes(next.message)) set({ watcher: next });
        return;
      }
    }

    if (alert && !dismissedWatcher.includes(alert.message)) {
      // Keep the existing alert object (and its id) when nothing meaningful has
      // changed. runWatcher mints a fresh id every call, so without this guard
      // the banner re-renders and replays its enter animation on every tick.
      const unchanged =
        watcher &&
        watcher.level === alert.level &&
        watcher.message === alert.message &&
        watcher.action === alert.action;
      if (!unchanged) set({ watcher: alert });
      // Record meaningful (non-nudge) alerts on the Mission Control feed.
      if (alert.level !== 'nudge' && alert.message !== lastWatch) {
        lastWatch = alert.message;
        logActivity({ agent: 'watcher', kind: 'watch', message: alert.message });
      }
    } else if (!alert) {
      if (watcher) set({ watcher: null });
      lastWatch = '';
    }
  }

  return {
    view: 'landing',
    theme: initialTheme,
    now: Date.now(),

    brainDump: DEMO_BRAINDUMP,
    chiefStatus: 'idle',
    chief: null,

    commitments: [],
    autonomy: 'confirm',

    conversation: [],
    routing: false,

    activeTab: 'console',
    deck: { status: 'idle', data: null },
    deckImageGenerating: null,
    slidesExport: { status: 'idle', embedUrl: null, editUrl: null },
    script: { status: 'idle', data: null },
    briefing: { status: 'idle', data: null, audioUrl: null },
    plan: { status: 'idle', data: null },
    rehearse: { status: 'idle', data: null },
    capture: { status: 'idle', data: null },

    screener: { status: 'idle', data: null },
    resumeRecall: { status: 'idle', data: null },
    backups: {},

    watcher: null,
    dismissedWatcher: [],

    activity: [],
    autopilotRunning: false,
    autoActedWatcher: [],

    setView: (v) => set({ view: v }),

    toggleTheme: () => {
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      set({ theme: next });
    },

    setBrainDump: (s) => set({ brainDump: s }),
    setAutonomy: (a) => {
      set({ autonomy: a });
      // Flipping to auto after a plan exists kicks off the autonomous run.
      if (a === 'auto' && get().chiefStatus === 'done' && !get().autopilotRunning) {
        void get().runAutopilot();
      }
    },
    setActiveTab: (t) => set({ activeTab: t }),

    triage: async () => {
      const { brainDump } = get();
      if (!brainDump.trim()) return;
      set({ chiefStatus: 'running', conversation: [], activity: [], autoActedWatcher: [] });
      logActivity({ agent: 'chief', kind: 'triage', message: 'Reading your brain-dump and ranking what matters.' });
      try {
        const result = await runChief(brainDump);
        set({
          chiefStatus: 'done',
          chief: result,
          commitments: result.plan.commitments,
          conversation: [{ id: uid('m'), role: 'chief', text: result.spokenSummary }],
          activeTab: 'console',
        });
        logActivity({
          agent: 'chief',
          kind: 'triage',
          message: `Triaged into ${result.plan.commitments.length} commitments.`,
          detail: result.plan.firstMove,
        });
        recomputeWatcher();

        // Proactive backups: fire background generation for every commitment that
        // has a maker agent, so the user always has a usable draft even if the
        // deadline slips. This runs non-blocking in the background.
        void (async () => {
          const { commitments } = get();
          const actionable = commitments.filter(
            (c) => c.suggestedAgent && c.suggestedAgent !== 'planner',
          );
          for (const c of actionable) {
            // Respect rate limits and quota by delaying background tasks when in live mode
            if (!isDemoMode) {
              await new Promise((resolve) => setTimeout(resolve, 2500));
            }
            const agentId = c.suggestedAgent as AgentId;
            set((s) => ({
              backups: {
                ...s.backups,
                [c.id]: { commitmentId: c.id, commitmentTitle: c.title, status: 'generating', agentId, artifact: null, promptGuide: '' },
              },
            }));
            logActivity({ agent: agentId, kind: 'produce', message: `Generating proactive backup for "${c.title}".` });
            try {
              let artifact: unknown = null;
              if (agentId === 'deck') artifact = await makeDeck(c.title, c.rationale);
              else if (agentId === 'script') artifact = await writeScript('email', `${c.title}. ${c.rationale}`);
              else if (agentId === 'briefing') artifact = await writeBriefing(c.title);
              else if (agentId === 'rehearse') artifact = await makePrep(c.title, c.rationale);
              const guide = await generatePromptGuide(c.title, c.rationale);
              set((s) => ({
                backups: {
                  ...s.backups,
                  [c.id]: { ...s.backups[c.id], status: 'ready', artifact, promptGuide: guide, generatedAt: Date.now() },
                },
              }));
              logActivity({ agent: agentId, kind: 'produce', message: `Backup ready for "${c.title}". Use it if the deadline slips.` });
            } catch {
              set((s) => ({
                backups: { ...s.backups, [c.id]: { ...s.backups[c.id], status: 'error' } },
              }));
            }
          }
        })();

        // Autonomy: in auto mode the Chief runs the whole plan with no clicks.
        if (get().autonomy === 'auto') void get().runAutopilot();
      } catch (e) {
        set({ chiefStatus: 'error' });
        logActivity({ agent: 'chief', kind: 'error', message: 'Could not reach Gemini during triage.' });
        // Surface a readable message instead of a silent failure.
        set((s) => ({
          conversation: [
            ...s.conversation,
            { id: uid('m'), role: 'chief', text: 'I could not reach Gemini just now. Check the API key, or run in demo mode.' },
          ],
        }));
      }
    },

    ask: async (message) => {
      if (!message.trim()) return;
      const userMsg: ConsoleMessage = { id: uid('m'), role: 'user', text: message };
      set((s) => ({ conversation: [...s.conversation, userMsg], routing: true }));
      try {
        const situation = get().chief?.spokenSummary || get().brainDump;
        const decision = await routeRequest(message, situation);
        logActivity({ agent: 'chief', kind: 'route', message: `Routed your request to ${decision.tool.replace(/_/g, ' ')}.` });
        set((s) => ({
          conversation: [...s.conversation, { id: uid('m'), role: 'chief', text: decision.spokenReply }],
          routing: false,
        }));
        if (decision.tool === 'generate_deck') {
          await get().runDeck(decision.args.topic || message, decision.args.notes);
        } else if (decision.tool === 'write_script') {
          await get().runScript((decision.args.kind as ScriptKind) || 'email', decision.args.context || message);
        } else if (decision.tool === 'create_briefing') {
          await get().runBriefing(decision.args.sourceText || message);
        } else if (decision.tool === 'make_plan') {
          await get().runPlan();
        } else if (decision.tool === 'prep_rehearsal') {
          await get().runRehearse(decision.args.role || message, decision.args.context);
        } else if (decision.tool === 'extract_capture') {
          await get().runCapture(decision.args.kind === 'document' ? 'document' : 'receipts');
        }
      } catch {
        set((s) => ({
          conversation: [...s.conversation, { id: uid('m'), role: 'chief', text: 'Something went wrong dispatching that. Try again.' }],
          routing: false,
        }));
      }
    },

    runDeck: async (topic, notes, focus = true) => {
      set({
        deck: { status: 'running', data: null },
        slidesExport: { status: 'idle', embedUrl: null, editUrl: null },
        deckImageGenerating: null,
        ...(focus ? { activeTab: 'deck' as const } : {}),
      });
      logActivity({ agent: 'deck', kind: 'dispatch', message: `Deck Maker is drafting "${topic}".` });
      try {
        const data = await makeDeck(topic, notes);
        set({ deck: { status: 'done', data } });
        logActivity({ agent: 'deck', kind: 'produce', message: `Deck ready: ${data.slides.length} slides.`, detail: data.title });
      } catch (e) {
        set({ deck: { status: 'error', data: null, error: String(e) } });
        logActivity({ agent: 'deck', kind: 'error', message: 'Deck Maker stalled.' });
      }
    },

    createSlidesExport: async () => {
      const { deck } = get();
      if (!deck.data) return;
      set({ slidesExport: { status: 'running', embedUrl: null, editUrl: null } });
      logActivity({ agent: 'deck', kind: 'produce', message: 'Building deck in Google Drive via Slides API.' });
      try {
        const result = await createGoogleSlides(deck.data);
        set({ slidesExport: { status: 'done', embedUrl: result.embedUrl, editUrl: result.editUrl } });
        logActivity({ agent: 'deck', kind: 'produce', message: 'Google Slides deck created.', detail: result.editUrl });
      } catch (e) {
        set({ slidesExport: { status: 'error', embedUrl: null, editUrl: null, error: String(e) } });
        logActivity({ agent: 'deck', kind: 'error', message: 'Could not create Google Slides deck.' });
      }
    },

    generateDeckImage: async (slideIndex: number) => {
      const { deck } = get();
      if (!deck.data) return;
      const slide = deck.data.slides[slideIndex];
      if (!slide) return;
      set({ deckImageGenerating: slideIndex });
      try {
        const prompt = slide.imageQuery || slide.imageSeed || slide.title;
        const imageData = await generateSlideImage(prompt);
        set((s) => {
          if (!s.deck.data) return {};
          const slides = s.deck.data.slides.map((sl, i) =>
            i === slideIndex ? { ...sl, imageData } : sl,
          );
          return { deck: { ...s.deck, data: { ...s.deck.data, slides } }, deckImageGenerating: null };
        });
      } catch {
        set({ deckImageGenerating: null });
      }
    },

    runScript: async (kind, context, focus = true) => {
      set({ script: { status: 'running', data: null }, ...(focus ? { activeTab: 'script' as const } : {}) });
      logActivity({ agent: 'script', kind: 'dispatch', message: `Script Maker is writing a ${kind}.` });
      try {
        const data = await writeScript(kind, context);
        set({ script: { status: 'done', data } });
        logActivity({ agent: 'script', kind: 'produce', message: `Draft ready: ${data.title}.`, detail: `${Math.round(data.durationSec)}s read` });
      } catch (e) {
        set({ script: { status: 'error', data: null, error: String(e) } });
        logActivity({ agent: 'script', kind: 'error', message: 'Script Maker stalled.' });
      }
    },

    runBriefing: async (sourceText, focus = true) => {
      set({ briefing: { status: 'running', data: null, audioUrl: null }, ...(focus ? { activeTab: 'briefing' as const } : {}) });
      logActivity({ agent: 'briefing', kind: 'dispatch', message: 'Briefing agent is scripting a two-voice audio brief.' });
      try {
        const data = await writeBriefing(sourceText);
        set({ briefing: { status: 'done', data, audioUrl: null } });
        logActivity({ agent: 'briefing', kind: 'produce', message: `Briefing ready: ${data.turns.length} turns.`, detail: data.title });
        // Try real Gemini multi-speaker TTS; UI falls back to browser speech if null.
        const audioUrl = await synthesizeBriefingAudio(data);
        if (audioUrl) set((s) => ({ briefing: { ...s.briefing, audioUrl } }));
      } catch (e) {
        set({ briefing: { status: 'error', data: null, audioUrl: null, error: String(e) } });
        logActivity({ agent: 'briefing', kind: 'error', message: 'Briefing agent stalled.' });
      }
    },

    runPlan: async (focus = true) => {
      set({ plan: { status: 'running', data: null }, ...(focus ? { activeTab: 'plan' as const } : {}) });
      logActivity({ agent: 'planner', kind: 'dispatch', message: 'Planner is backward-planning a schedule that fits the clock.' });
      try {
        const data = await makePlan(get().commitments, get().now);
        set({ plan: { status: 'done', data } });
        logActivity({ agent: 'planner', kind: 'produce', message: `Schedule laid: ${data.blocks.length} blocks.`, detail: data.headline });
      } catch (e) {
        set({ plan: { status: 'error', data: null, error: String(e) } });
        logActivity({ agent: 'planner', kind: 'error', message: 'Planner stalled.' });
      }
    },

    runRehearse: async (role, context, focus = true) => {
      set({ rehearse: { status: 'running', data: null }, ...(focus ? { activeTab: 'rehearse' as const } : {}) });
      logActivity({ agent: 'rehearse', kind: 'dispatch', message: `Rehearse agent is prepping for "${role}".` });
      try {
        const data = await makePrep(role, context);
        set({ rehearse: { status: 'done', data } });
        logActivity({ agent: 'rehearse', kind: 'produce', message: `Prep pack ready: ${data.questions.length} likely questions.` });
      } catch (e) {
        set({ rehearse: { status: 'error', data: null, error: String(e) } });
        logActivity({ agent: 'rehearse', kind: 'error', message: 'Rehearse agent stalled.' });
      }
    },

    runCapture: async (kind, image, focus = true) => {
      set({ capture: { status: 'running', data: null }, ...(focus ? { activeTab: 'capture' as const } : {}) });
      logActivity({ agent: 'capture', kind: 'dispatch', message: `Capture agent is reading a ${kind} with Gemini vision.` });
      try {
        const data = await makeCapture(kind, image);
        set({ capture: { status: 'done', data } });
        logActivity({ agent: 'capture', kind: 'produce', message: `Captured ${data.items.length || data.fields.length} entries.`, detail: data.summary });
      } catch (e) {
        set({ capture: { status: 'error', data: null, error: String(e) } });
        logActivity({ agent: 'capture', kind: 'error', message: 'Capture agent stalled.' });
      }
    },

    cycleStatus: (id) => {
      const order: TaskStatus[] = ['todo', 'doing', 'done'];
      set((s) => ({
        commitments: s.commitments.map((c) =>
          c.id === id ? { ...c, status: order[(order.indexOf(c.status) + 1) % order.length] } : c,
        ),
      }));
      recomputeWatcher();
    },

    dropCommitment: (id) => {
      set((s) => ({ commitments: s.commitments.filter((c) => c.id !== id) }));
      recomputeWatcher();
    },

    dispatchFor: async (id, focus = true) => {
      const c = get().commitments.find((x) => x.id === id);
      if (!c || !c.suggestedAgent) return;
      const ctx = `${c.title}. ${c.rationale}`;
      if (c.suggestedAgent === 'deck') await get().runDeck(c.title, ctx, focus);
      else if (c.suggestedAgent === 'script') await get().runScript('email', ctx, focus);
      else if (c.suggestedAgent === 'briefing') await get().runBriefing(get().brainDump, focus);
      else if (c.suggestedAgent === 'planner') await get().runPlan(focus);
      else if (c.suggestedAgent === 'rehearse') await get().runRehearse(c.title, c.rationale, focus);
      else if (c.suggestedAgent === 'capture') await get().runCapture('receipts', undefined, focus);
    },

    // Autopilot: the Chief executes the entire plan end to end with no clicks.
    // It lays the schedule first, then works each commitment in deadline order,
    // dispatching the right maker agent and narrating every step. This is the
    // core promise of the product - it does not remind you, it does the work.
    runAutopilot: async () => {
      if (get().autopilotRunning) return;
      set({ autopilotRunning: true, activeTab: 'mission' });
      logActivity({ agent: 'chief', kind: 'autopilot', message: 'Autopilot engaged. Working the plan top to bottom.' });
      set((s) => ({
        conversation: [
          ...s.conversation,
          { id: uid('m'), role: 'chief', text: 'Autopilot on. I will book your schedule, then draft every deliverable and surface each one as it lands.' },
        ],
      }));

      // Step 1: always lay the schedule first so the order is explicit.
      if (get().autopilotRunning) await get().runPlan(false);

      // Step 2: work each commitment that maps to a maker, soonest deadline first.
      const queue = get()
        .commitments.filter((c) => c.status !== 'done' && c.suggestedAgent && c.suggestedAgent !== 'planner')
        .sort((a, b) => a.deadlineMs - b.deadlineMs);

      for (const c of queue) {
        if (!get().autopilotRunning) break;
        const agent = c.suggestedAgent as AgentId;
        set((s) => ({ commitments: s.commitments.map((x) => (x.id === c.id ? { ...x, status: 'doing' as TaskStatus } : x)) }));
        logActivity({ agent: 'chief', kind: 'dispatch', message: `Dispatching ${AGENT_LABELS[agent]} for "${c.title}".`, detail: c.rationale });
        await get().dispatchFor(c.id, false);
        if (!get().autopilotRunning) break;
        set((s) => ({ commitments: s.commitments.map((x) => (x.id === c.id ? { ...x, status: 'done' as TaskStatus } : x)) }));
        recomputeWatcher();
      }

      const finished = get().autopilotRunning;
      set({ autopilotRunning: false });
      if (finished) {
        logActivity({ agent: 'chief', kind: 'autopilot', message: `Autopilot complete. ${queue.length} deliverables ready to review.` });
        set((s) => ({
          conversation: [
            ...s.conversation,
            { id: uid('m'), role: 'chief', text: `Done. I booked your schedule and drafted ${queue.length} deliverables. Open any tab to review, tweak, and send.` },
          ],
        }));
      } else {
        logActivity({ agent: 'chief', kind: 'autopilot', message: 'Autopilot stopped. You have the wheel.' });
      }
    },

    stopAutopilot: () => set({ autopilotRunning: false }),

    runScreener: async (jd, resume) => {
      set({ screener: { status: 'running', data: null } });
      logActivity({ agent: 'rehearse', kind: 'dispatch', message: 'Screening resume against the job description.' });
      try {
        const data = await screenResume(jd, resume);
        set({ screener: { status: 'done', data } });
        logActivity({ agent: 'rehearse', kind: 'produce', message: `Screened ${data.candidate}: fit ${data.fitScore}/10 - ${data.recommendation}.` });
      } catch (e) {
        set({ screener: { status: 'error', data: null, error: String(e) } });
        logActivity({ agent: 'rehearse', kind: 'error', message: 'Resume Screener stalled.' });
      }
    },

    runResumeRecall: async (resume, jd, role) => {
      set({ resumeRecall: { status: 'running', data: null } });
      logActivity({ agent: 'rehearse', kind: 'dispatch', message: `Recalling resume for: ${role}.` });
      try {
        const data = await makeResumeRecall(resume, jd, role);
        set({ resumeRecall: { status: 'done', data } });
        logActivity({ agent: 'rehearse', kind: 'produce', message: `Resume recall ready: ${data.resumeHighlights.length} highlights to remember.` });
      } catch (e) {
        set({ resumeRecall: { status: 'error', data: null, error: String(e) } });
        logActivity({ agent: 'rehearse', kind: 'error', message: 'Resume Recall stalled.' });
      }
    },

    executeWatcherAct: async () => {
      const w = get().watcher;
      if (!w?.act) return;
      const { kind, commitmentId } = w.act;
      if (kind === 'drop' && commitmentId) {
        const target = get().commitments.find((c) => c.id === commitmentId);
        set((s) => ({ commitments: s.commitments.filter((c) => c.id !== commitmentId), watcher: null }));
        if (target) logActivity({ agent: 'watcher', kind: 'act', message: `Dropped "${target.title}" on your call.` });
        recomputeWatcher();
      } else if (kind === 'dispatch' && commitmentId) {
        set({ watcher: null });
        logActivity({ agent: 'watcher', kind: 'act', message: 'Handing the overdue item to a maker agent.' });
        await get().dispatchFor(commitmentId);
      } else if (kind === 'replan') {
        set({ watcher: null });
        await get().runPlan();
      }
    },

    tick: () => {
      set({ now: Date.now() });
      recomputeWatcher();
    },

    dismissWatcher: (id) => {
      const current = get().watcher;
      set((s) => ({
        watcher: null,
        dismissedWatcher: current ? [...s.dismissedWatcher, current.message] : s.dismissedWatcher,
      }));
    },
  };
});
