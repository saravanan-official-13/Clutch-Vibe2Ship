// Shared domain types for Clutch. The "situation" object is the blackboard the agents
// read from and write to.

export type AgentId =
  | 'chief'
  | 'planner'
  | 'deck'
  | 'script'
  | 'briefing'
  | 'rehearse'
  | 'capture'
  | 'watcher';

export type Urgency = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'doing' | 'done';

// ---------------------------------------------------------------------------
// Mission Control: a live, timestamped trace of everything the agent swarm does.
// This is the visible record of the orchestration - perceive, decide, act.
// ---------------------------------------------------------------------------

export type ActivityKind =
  | 'triage'
  | 'route'
  | 'dispatch'
  | 'produce'
  | 'watch'
  | 'act'
  | 'autopilot'
  | 'error';

export interface ActivityEvent {
  id: string;
  /** Wall-clock timestamp (ms) when the event happened. */
  ts: number;
  /** Which agent emitted the event. */
  agent: AgentId;
  kind: ActivityKind;
  message: string;
  /** Optional second line: rationale or payload summary. */
  detail?: string;
}

export interface Commitment {
  id: string;
  title: string;
  /** Absolute deadline timestamp (ms). Computed from minutesLeft at intake. */
  deadlineMs: number;
  urgency: Urgency;
  /** 1 (nice to have) - 5 (career-defining). */
  impact: number;
  /** Estimated minutes of focused work to finish. */
  effortMin: number;
  status: TaskStatus;
  /** One line: why the Chief of Staff ranked it here. */
  rationale: string;
  /** Which maker agent can produce this for the user, if any. */
  suggestedAgent: AgentId | null;
}

export interface Plan {
  summary: string;
  firstMove: string;
  commitments: Commitment[];
}

export interface Dispatch {
  agent: AgentId;
  reason: string;
  commitmentId?: string;
}

export interface ChiefResult {
  plan: Plan;
  dispatches: Dispatch[];
  spokenSummary: string;
}

export type SlideLayout =
  | 'cover'
  | 'section'
  | 'bullets'
  | 'image-right'
  | 'image-full'
  | 'quote'
  | 'stat'
  | 'closing';

export interface Slide {
  title: string;
  bullets: string[];
  notes: string;
  layout?: SlideLayout;
  subtitle?: string;
  /** Stable seed for the stock photo (used when no generated image). */
  imageSeed?: string;
  /** Short phrase for a stock photo search query or Imagen prompt. */
  imageQuery?: string;
  /** Base64 data URL when the user has generated an AI image for this slide. */
  imageData?: string;
  stat?: { value: string; label: string };
  quote?: string;
  attribution?: string;
}

export interface Deck {
  title: string;
  subtitle: string;
  accent: string;
  slides: Slide[];
}

export type SlidesExportStatus = 'idle' | 'running' | 'done' | 'error';

export interface SlidesExport {
  status: SlidesExportStatus;
  embedUrl: string | null;
  editUrl: string | null;
  error?: string;
}

export type ScriptKind = 'pitch' | 'email' | 'toast' | 'apology' | 'talk' | 'update';

export interface ScriptDoc {
  kind: ScriptKind;
  title: string;
  body: string;
  /** Rough spoken duration in seconds, for the "fits the slot" badge. */
  durationSec: number;
  deliveryTips: string[];
}

export type BriefingSpeaker = 'Maya' | 'Dev';

export interface BriefingTurn {
  speaker: BriefingSpeaker;
  text: string;
}

export interface Briefing {
  title: string;
  takeaways: string[];
  turns: BriefingTurn[];
}

export type WatcherLevel = 'nudge' | 'warning' | 'critical';

/** A typed, executable corrective action the Watcher can recommend or self-run. */
export type WatcherActKind = 'drop' | 'dispatch' | 'replan';

export interface WatcherAct {
  kind: WatcherActKind;
  /** Button label, e.g. 'Drop "Expense report"'. */
  label: string;
  /** Target commitment for drop/dispatch. */
  commitmentId?: string;
  /** Maker agent for a dispatch action. */
  agent?: AgentId;
}

export interface WatcherAlert {
  id: string;
  level: WatcherLevel;
  message: string;
  /** Human-readable suggestion (kept for display). */
  action?: string;
  /** Structured, executable version of the suggestion. */
  act?: WatcherAct;
}

export type Autonomy = 'suggest' | 'confirm' | 'auto';

export type RouterToolName =
  | 'generate_deck'
  | 'write_script'
  | 'create_briefing'
  | 'make_plan'
  | 'prep_rehearsal'
  | 'extract_capture'
  | 'replan';

export interface RouterDecision {
  tool: RouterToolName;
  args: Record<string, string>;
  spokenReply: string;
}

// ---------------------------------------------------------------------------
// Planner: a backward-planned, time-boxed schedule that fits the clock. Each
// block can deep-link to Google Calendar (real integration, no OAuth).
// ---------------------------------------------------------------------------

export interface PlanBlock {
  /** Clock label for the block start, e.g. "7:54 PM". */
  start: string;
  /** Clock label for the block end. */
  end: string;
  /** Minutes of focused work this block covers. */
  minutes: number;
  /** What to do in this block. */
  label: string;
  /** One line on why this block sits here in the order. */
  detail: string;
  /** Absolute start/end timestamps (ms) for the Calendar deep link. */
  startMs: number;
  endMs: number;
  /** "focus" is real work, "buffer" is slack/commute, "leave" is a hard go-now marker. */
  type: 'focus' | 'buffer' | 'leave';
}

export interface SchedulePlan {
  title: string;
  summary: string;
  /** The single sentence the user most needs: when to start and what to drop. */
  headline: string;
  blocks: PlanBlock[];
}

// ---------------------------------------------------------------------------
// Rehearse: a last-minute prep pack for an interview, viva, pitch Q&A, or review.
// ---------------------------------------------------------------------------

export interface PrepQuestion {
  q: string;
  /** A model answer in the user's voice, tight enough to say out loud. */
  answer: string;
  /** Why they ask it / what they are really testing. */
  why: string;
}

export interface PrepPack {
  role: string;
  /** A 30 second self-introduction to open with. */
  intro: string;
  questions: PrepQuestion[];
  /** Traps to avoid saying. */
  landmines: string[];
  /** One strong question to ask them back. */
  askBack: string;
}

// ---------------------------------------------------------------------------
// Capture: Gemini Vision turns a photo of receipts or a document into structured
// data. The day-to-day panic: an expense report due tonight, or a form to fill.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Resume Screener: interview-GIVER side. Evaluate a candidate's resume against
// a job description fast, so an interviewer knows what to probe in the room.
// ---------------------------------------------------------------------------

export type ScreenRecommendation = 'strong-yes' | 'yes' | 'maybe' | 'no';

export interface ScreenResult {
  candidate: string;
  role: string;
  fitScore: number; // 1-10
  strengths: string[];
  gaps: string[];
  topQuestions: string[]; // 4-5 questions to ask this specific candidate
  recommendation: ScreenRecommendation;
  summary: string;
}

// ---------------------------------------------------------------------------
// Resume Recall: interview-TAKER side. You crafted many tailored resumes and
// need to recall exactly what is in the one you sent before the interview.
// ---------------------------------------------------------------------------

export interface ResumeRecall {
  role: string;
  resumeHighlights: string[]; // key claims on the resume they will probe
  alignedStrengths: string[]; // how the resume maps to the JD
  likelyGaps: string[]; // where the interviewer may push back
  talkingPoints: string[]; // specific lines to hit, in your own voice
  watchOut: string; // one thing NOT to say given your resume
}

// ---------------------------------------------------------------------------
// Backup: proactively generated draft the moment a task is created, so if the
// deadline is missed the user has something ready to use or submit.
// ---------------------------------------------------------------------------

export type BackupStatus = 'generating' | 'ready' | 'error';

export interface BackupDoc {
  commitmentId: string;
  commitmentTitle: string;
  status: BackupStatus;
  agentId: AgentId;
  /** Serialized artifact (Deck | ScriptDoc | Briefing | PrepPack). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  artifact: any | null;
  /** Copy-paste AI prompt so the user can finish the task themselves. */
  promptGuide: string;
  generatedAt?: number;
}

export type CaptureKind = 'receipts' | 'document';

export interface CaptureItem {
  label: string;
  date: string;
  category: string;
  amount: number;
}

export interface CaptureField {
  key: string;
  value: string;
}

export interface CaptureResult {
  kind: CaptureKind;
  title: string;
  /** One line a rushed user can act on. */
  summary: string;
  /** Line items for a receipts/expense capture. */
  items: CaptureItem[];
  total: number;
  currency: string;
  /** Key/value fields for a document/form capture. */
  fields: CaptureField[];
}
