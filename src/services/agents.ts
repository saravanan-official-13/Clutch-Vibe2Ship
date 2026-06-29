import { Type } from '@google/genai';
import { getClient, isDemoMode, isQuotaError, withGemini, MODEL, TTS_MODEL } from './gemini';
import { parseJsonLoose, pcmBase64ToWavUrl, sleep, uid } from '../lib/utils';
import {
  buildDemoChiefResult,
  buildDemoPlanRaw,
  DEMO_BRAINDUMP,
  DEMO_BRIEFING,
  DEMO_CAPTURE,
  DEMO_CAPTURE_DOC,
  DEMO_DECK,
  DEMO_PREP,
  DEMO_RESUME_RECALL,
  DEMO_SCREEN,
  DEMO_SCRIPT,
} from '../data/demo';
import type { RawPlan } from '../data/demo';
import type {
  AgentId,
  Briefing,
  CaptureItem,
  CaptureKind,
  CaptureResult,
  ChiefResult,
  Commitment,
  Deck,
  PlanBlock,
  PrepPack,
  ResumeRecall,
  RouterToolName,
  SchedulePlan,
  ScriptDoc,
  ScriptKind,
  ScreenRecommendation,
  ScreenResult,
  Urgency,
  WatcherAlert,
} from '../types';

// ---------------------------------------------------------------------------
// System instructions. Each agent has a sharp, single-purpose persona.
// ---------------------------------------------------------------------------

const CHIEF_SYSTEM = `You are the Chief of Staff agent in Clutch, a last-minute productivity companion. The user is under time pressure and just dumped everything on their mind. Your job is triage, not therapy.

Extract every distinct commitment. For each, estimate minutes until its deadline (minutesLeft), impact 1 to 5, and effortMin (focused minutes to finish). Rank by a blend of urgency, impact, and whether it survives the clock. Write a one line rationale per item.

Decide which specialist agents to dispatch: "deck" (build a slide deck), "script" (write a message, email, speech, or talk track), "briefing" (turn a document into a short audio briefing). Set suggestedAgent to one of deck, script, briefing, planner, or none.

Be decisive and concrete. The firstMove is the single thing they should start right now. Never use the em-dash character. Use plain hyphens.`;

const DECK_SYSTEM = `You are the Deck Maker agent in Clutch. Produce a complete, presentable slide deck fast. 6 to 8 slides.

Each slide has a "layout" field. Use these layouts:
- "cover": opening title slide. Required for slide 1.
- "stat": a single headline metric, large and centered. Use for one key number slide.
- "image-right": title and bullets on the left, image on the right. Good for evidence or data slides.
- "bullets": standard title and bullets slide.
- "quote": a powerful direct quote with attribution.
- "section": a bold divider between major sections.
- "image-full": full-bleed image with a title overlay.
- "closing": the final ask or call to action. Required for the last slide.

Rules:
- Slide 1 must be "cover" with a "subtitle" field.
- The last slide must be "closing".
- Include at least one "stat" slide with a "stat" object: { "value": "18.4%", "label": "what it measures" }.
- For "image-right" and "image-full" slides, add an "imageQuery" field: 2-5 words for a stock photo search.
- For "quote" slides, add "quote" and "attribution" fields.
- Bullets may contain **bold** markup for key numbers and terms: "Revenue grew **18.4%** to **7.2M**".
- Use concrete, organic numbers. Never round filler like 50% or 99%.
- Open with the headline, not an agenda. End on the ask.
- Never use the em-dash character.`;

const SCRIPT_SYSTEM = `You are the Script Maker agent in Clutch. Write the exact words the user needs to deliver, in a confident, plain, human voice. No filler verbs (elevate, seamless, unleash, leverage). Match the requested kind (pitch, email, toast, apology, talk, update). Give an honest spoken duration in seconds and 2 to 3 delivery tips. Never use the em-dash character.`;

const BRIEFING_SYSTEM = `You are the Briefing agent in Clutch. Turn the source material into a two-host audio briefing that a busy person can absorb in about 6 minutes on the way to a meeting. Hosts are Maya (warm, frames the stakes) and Dev (precise, gives the numbers). 8 to 12 short conversational turns, alternating, that actually teach the key points and predict the questions the user will face. Also give 3 crisp takeaways. Never use the em-dash character.`;

const PLAN_SYSTEM = `You are the Planner agent in Clutch. The user has a set of commitments and a hard amount of clock left. Build a backward-planned, time-boxed schedule that actually fits the time, putting the highest-impact, least-recoverable work first. Each block has a label, a one line detail explaining why it sits there, an integer "minutes", and a "type": "focus" for real work, "buffer" for protected slack or commute, or "leave" for a hard go-now marker (minutes 0). Include exactly one short buffer before any hard deadline. The headline is the single most important sentence: when to start and what not to touch. Do not invent commitments that were not given. Keep the total focus time at or under the time available. Never use the em-dash character.`;

const PREP_SYSTEM = `You are the Rehearse agent in Clutch. The user faces a high-stakes conversation soon: an interview, a viva, an investor or board Q&A, or a performance review. Build a tight prep pack. Give a 30 second self-introduction in their voice. Give the 5 to 6 hardest questions they will actually be asked, each with a model answer they can say out loud in under 30 seconds and a one line "why" on what the asker is really testing. Give 3 landmines (things not to say) and 1 strong question to ask back. Be concrete and use realistic specifics, not generic advice. Never use the em-dash character.`;

const CAPTURE_SYSTEM = `You are the Capture agent in Clutch. You read an image of either a pile of receipts or a document or form, and turn it into clean structured data the user can act on immediately. If it is receipts or expenses, return line items with label, ISO date, a sensible category (Meals, Travel, Lodging, Office, Software, Other), and amount, plus the currency. If it is a document or form, return the key fields as key/value pairs. Set "kind" to "receipts" or "document" based on what you see. Write a one line summary a rushed person can act on. Use real values you can read; do not invent totals, the app recomputes them. Never use the em-dash character.`;

const ROUTER_SYSTEM = `You are the Chief of Staff agent in Clutch acting as a router. The user is asking for help with a specific last-minute task. Decide which specialist tool to call:
- generate_deck when they need slides or to present something.
- write_script when they need words to send or say (email, message, pitch, toast, apology, talk).
- create_briefing when they need to absorb a document fast as audio.
- make_plan when they need a schedule, an order to do things in, or to know when to start or leave.
- prep_rehearsal when they need to practice for an interview, viva, pitch, board Q&A, or review.
- extract_capture when they need to read receipts, an expense pile, a form, or a document from a photo.
- replan when the situation changed and the whole plan should be re-prioritized.
Call exactly one tool with good arguments. Keep your spoken reply to one or two sentences, confident and specific. Never use the em-dash character.`;

// ---------------------------------------------------------------------------
// Schemas (structured output).
// ---------------------------------------------------------------------------

const chiefSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    firstMove: { type: Type.STRING },
    spokenSummary: { type: Type.STRING },
    commitments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          minutesLeft: { type: Type.INTEGER },
          urgency: { type: Type.STRING, enum: ['critical', 'high', 'medium', 'low'] },
          impact: { type: Type.INTEGER },
          effortMin: { type: Type.INTEGER },
          rationale: { type: Type.STRING },
          suggestedAgent: {
            type: Type.STRING,
            enum: ['deck', 'script', 'briefing', 'planner', 'rehearse', 'capture', 'none'],
          },
        },
        required: ['title', 'minutesLeft', 'urgency', 'impact', 'effortMin', 'rationale', 'suggestedAgent'],
      },
    },
    dispatches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agent: { type: Type.STRING, enum: ['deck', 'script', 'briefing', 'planner', 'rehearse', 'capture'] },
          reason: { type: Type.STRING },
        },
        required: ['agent', 'reason'],
      },
    },
  },
  required: ['summary', 'firstMove', 'spokenSummary', 'commitments', 'dispatches'],
};

const deckSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    subtitle: { type: Type.STRING },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          layout: {
            type: Type.STRING,
            enum: ['cover', 'section', 'bullets', 'image-right', 'image-full', 'quote', 'stat', 'closing'],
          },
          subtitle: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
          notes: { type: Type.STRING },
          imageQuery: { type: Type.STRING },
          stat: {
            type: Type.OBJECT,
            properties: {
              value: { type: Type.STRING },
              label: { type: Type.STRING },
            },
            required: ['value', 'label'],
          },
          quote: { type: Type.STRING },
          attribution: { type: Type.STRING },
        },
        required: ['title', 'bullets', 'notes'],
      },
    },
  },
  required: ['title', 'subtitle', 'slides'],
};

const scriptSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    body: { type: Type.STRING },
    durationSec: { type: Type.INTEGER },
    deliveryTips: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['title', 'body', 'durationSec', 'deliveryTips'],
};

const briefingSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    takeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
    turns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: { type: Type.STRING, enum: ['Maya', 'Dev'] },
          text: { type: Type.STRING },
        },
        required: ['speaker', 'text'],
      },
    },
  },
  required: ['title', 'takeaways', 'turns'],
};

const planSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    headline: { type: Type.STRING },
    blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          detail: { type: Type.STRING },
          minutes: { type: Type.INTEGER },
          type: { type: Type.STRING, enum: ['focus', 'buffer', 'leave'] },
        },
        required: ['label', 'detail', 'minutes', 'type'],
      },
    },
  },
  required: ['title', 'summary', 'headline', 'blocks'],
};

const prepSchema = {
  type: Type.OBJECT,
  properties: {
    role: { type: Type.STRING },
    intro: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          q: { type: Type.STRING },
          answer: { type: Type.STRING },
          why: { type: Type.STRING },
        },
        required: ['q', 'answer', 'why'],
      },
    },
    landmines: { type: Type.ARRAY, items: { type: Type.STRING } },
    askBack: { type: Type.STRING },
  },
  required: ['role', 'intro', 'questions', 'landmines', 'askBack'],
};

const captureSchema = {
  type: Type.OBJECT,
  properties: {
    kind: { type: Type.STRING, enum: ['receipts', 'document'] },
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    currency: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          date: { type: Type.STRING },
          category: { type: Type.STRING },
          amount: { type: Type.NUMBER },
        },
        required: ['label', 'date', 'category', 'amount'],
      },
    },
    fields: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          value: { type: Type.STRING },
        },
        required: ['key', 'value'],
      },
    },
  },
  required: ['kind', 'title', 'summary', 'currency', 'items', 'fields'],
};

// ---------------------------------------------------------------------------
// Generic structured-output helper.
// ---------------------------------------------------------------------------

async function generateStructured<T>(args: {
  system: string;
  prompt: string;
  schema: unknown;
  temperature?: number;
  model?: string;
}): Promise<T> {
  const ai = getClient();
  const res = await ai.models.generateContent({
    model: args.model || MODEL,
    contents: args.prompt,
    config: {
      systemInstruction: args.system,
      responseMimeType: 'application/json',
      responseSchema: args.schema as never,
      temperature: args.temperature ?? 0.6,
    },
  });
  return parseJsonLoose<T>(res.text || '');
}

/**
 * Run a live agent call with free-tier resilience. Transient per-minute 429s are
 * retried; if the daily quota is exhausted (or any quota error survives the
 * retries) we serve the same hand-authored demo content demo mode would, so the
 * UI is never broken mid-demo. Non-quota errors propagate as normal.
 */
async function liveOrDemo<T>(live: () => Promise<T>, demo: () => T | Promise<T>): Promise<T> {
  try {
    return await withGemini(live);
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn('Gemini quota reached; serving demo content so the UI stays alive.', err);
      return demo();
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Chief of Staff: brain-dump -> triaged plan + dispatches.
// ---------------------------------------------------------------------------

export async function runChief(brainDump: string): Promise<ChiefResult> {
  const now = Date.now();
  if (isDemoMode) {
    await sleep(1400);
    return buildDemoChiefResult(now);
  }

  type Raw = {
    summary: string;
    firstMove: string;
    spokenSummary: string;
    commitments: Array<{
      title: string;
      minutesLeft: number;
      urgency: Urgency;
      impact: number;
      effortMin: number;
      rationale: string;
      suggestedAgent: string;
    }>;
    dispatches: Array<{ agent: AgentId; reason: string }>;
  };

  return liveOrDemo(
    async () => {
      const raw = await generateStructured<Raw>({
        system: CHIEF_SYSTEM,
        prompt: `Current time is ${new Date(now).toLocaleString()}. Triage this brain-dump:\n\n"""${brainDump}"""`,
        schema: chiefSchema,
        temperature: 0.4,
      });

      const commitments: Commitment[] = raw.commitments.map((c) => ({
        id: uid('c'),
        title: c.title,
        deadlineMs: now + Math.max(1, c.minutesLeft) * 60_000,
        urgency: c.urgency,
        impact: c.impact,
        effortMin: c.effortMin,
        status: 'todo',
        rationale: c.rationale,
        suggestedAgent: c.suggestedAgent === 'none' ? null : (c.suggestedAgent as AgentId),
      }));

      // Attach the originating commitment id to each dispatch when we can match it.
      const dispatches = raw.dispatches.map((d) => {
        const match = commitments.find((c) => c.suggestedAgent === d.agent);
        return { agent: d.agent, reason: d.reason, commitmentId: match?.id };
      });

      return {
        plan: { summary: raw.summary, firstMove: raw.firstMove, commitments },
        dispatches,
        spokenSummary: raw.spokenSummary,
      };
    },
    () => buildDemoChiefResult(now),
  );
}

// ---------------------------------------------------------------------------
// Router: free-form request -> a single tool call (genuine Gemini function calling).
// ---------------------------------------------------------------------------

const routerTools = [
  {
    functionDeclarations: [
      {
        name: 'generate_deck',
        description: 'Create a slide deck when the user needs to present something.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING, description: 'What the deck is about' },
            notes: { type: Type.STRING, description: 'Any context or raw notes to use' },
          },
          required: ['topic'],
        },
      },
      {
        name: 'write_script',
        description: 'Write words the user must send or say: email, message, pitch, toast, apology, talk, update.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            kind: { type: Type.STRING, description: 'pitch, email, toast, apology, talk, or update' },
            context: { type: Type.STRING, description: 'Who it is for and what it must achieve' },
          },
          required: ['kind', 'context'],
        },
      },
      {
        name: 'create_briefing',
        description: 'Turn a document or notes into a short two-host audio briefing to absorb fast.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            sourceText: { type: Type.STRING, description: 'The material to brief on' },
          },
          required: ['sourceText'],
        },
      },
      {
        name: 'make_plan',
        description: 'Build a backward-planned, time-boxed schedule from the user current commitments and clock. Use when they ask for a plan, an order, or when to start or leave.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            focus: { type: Type.STRING, description: 'Optional: anything to prioritize or constrain' },
          },
        },
      },
      {
        name: 'prep_rehearsal',
        description: 'Build a prep pack to rehearse for an interview, viva, pitch, board Q&A, or review.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            role: { type: Type.STRING, description: 'What they are preparing for' },
            context: { type: Type.STRING, description: 'Any background that helps tailor the questions' },
          },
          required: ['role'],
        },
      },
      {
        name: 'extract_capture',
        description: 'Read a photo of receipts or a document/form into structured data the user can act on.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            kind: { type: Type.STRING, description: '"receipts" for an expense pile, or "document" for a form or paper' },
          },
          required: ['kind'],
        },
      },
      {
        name: 'replan',
        description: 'Re-prioritize the whole plan because the situation changed.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            reason: { type: Type.STRING },
          },
          required: ['reason'],
        },
      },
    ],
  },
];

export interface RouterResult {
  tool: RouterToolName | null;
  args: Record<string, string>;
  spokenReply: string;
}

export async function routeRequest(message: string, situation: string): Promise<RouterResult> {
  const demo = (): RouterResult => {
    const m = message.toLowerCase();
    if (/deck|slide|present|pitch deck|powerpoint|ppt/.test(m)) {
      return {
        tool: 'generate_deck',
        args: { topic: message, notes: situation },
        spokenReply: 'On it. Drafting the deck now. I will open with the headline and end on the ask.',
      };
    }
    if (/receipt|expense|scan|snap|photo|picture|invoice|whiteboard|extract|\bform\b/.test(m)) {
      const docKind = /document|\bform\b|contract|invoice|bill|statement/.test(m);
      return {
        tool: 'extract_capture',
        args: { kind: docKind ? 'document' : 'receipts' },
        spokenReply: docKind
          ? 'Open Capture and point it at the form. I will pull out the fields you need.'
          : 'Snap the receipts in Capture and I will itemize them and total it for you.',
      };
    }
    if (/interview|rehears|practice|prepare me|prep me|mock|viva|q&a|q and a|grill|board q/.test(m)) {
      return {
        tool: 'prep_rehearsal',
        args: { role: message, context: situation },
        spokenReply: 'Good. I will build a prep pack: the hard questions, model answers, and the traps to avoid.',
      };
    }
    if (/\bplan\b|schedule|timeline|sequence|in what order|when (should|do) i|next \d|calendar|time-?box/.test(m)) {
      return {
        tool: 'make_plan',
        args: { focus: message },
        spokenReply: 'Laying out a backward plan from your next deadline so you know exactly when to start.',
      };
    }
    if (/brief|podcast|read|summari|listen|audio/.test(m)) {
      return {
        tool: 'create_briefing',
        args: { sourceText: message },
        spokenReply: 'Good call. I will turn this into a 6 minute two-host briefing you can listen to on the way.',
      };
    }
    if (/email|reply|message|write|toast|apolog|speech|talk|note to/.test(m)) {
      return {
        tool: 'write_script',
        args: { kind: 'email', context: message },
        spokenReply: 'Writing it now in your voice. One ask, no filler.',
      };
    }
    return {
      tool: 'replan',
      args: { reason: message },
      spokenReply: 'Got it. Tell me to make a deck, write a message, or brief a document and I will dispatch the right agent.',
    };
  };

  if (isDemoMode) {
    await sleep(700);
    return demo();
  }

  return liveOrDemo(
    async () => {
      const ai = getClient();
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: `Situation so far: ${situation}\n\nUser request: ${message}`,
        config: { systemInstruction: ROUTER_SYSTEM, tools: routerTools, temperature: 0.3 },
      });

      const call = res.functionCalls?.[0];
      const spokenReply = res.text?.trim() || 'Dispatching the right agent now.';
      if (!call) return { tool: null, args: {}, spokenReply };

      return {
        tool: call.name as RouterToolName,
        args: (call.args as Record<string, string>) || {},
        spokenReply,
      };
    },
    demo,
  );
}

// ---------------------------------------------------------------------------
// Maker agents.
// ---------------------------------------------------------------------------

export async function makeDeck(topic: string, notes = ''): Promise<Deck> {
  if (isDemoMode) {
    await sleep(1800);
    return DEMO_DECK;
  }
  type Raw = { title: string; subtitle: string; slides: Deck['slides'] };
  return liveOrDemo(
    async () => {
      const raw = await generateStructured<Raw>({
        system: DECK_SYSTEM,
        prompt: `Build a board-ready deck about: ${topic}\n\nUse this context if helpful:\n${notes || '(none)'}`,
        schema: deckSchema,
        temperature: 0.7,
      });
      const total = raw.slides.length;
      const slides: Deck['slides'] = raw.slides.map((s, i) => ({
        ...s,
        layout: s.layout || (i === 0 ? 'cover' : i === total - 1 ? 'closing' : 'bullets'),
        imageSeed: s.imageQuery || s.title,
      }));
      return { ...raw, accent: '#ffb200', slides };
    },
    () => DEMO_DECK,
  );
}

export async function writeScript(kind: ScriptKind, context: string): Promise<ScriptDoc> {
  if (isDemoMode) {
    await sleep(1200);
    return { ...DEMO_SCRIPT, kind };
  }
  type Raw = { title: string; body: string; durationSec: number; deliveryTips: string[] };
  return liveOrDemo(
    async () => {
      const raw = await generateStructured<Raw>({
        system: SCRIPT_SYSTEM,
        prompt: `Write a ${kind}. Context:\n${context}`,
        schema: scriptSchema,
        temperature: 0.7,
      });
      return { kind, ...raw };
    },
    () => ({ ...DEMO_SCRIPT, kind }),
  );
}

export async function writeBriefing(sourceText: string): Promise<Briefing> {
  if (isDemoMode) {
    await sleep(1600);
    return DEMO_BRIEFING;
  }
  return liveOrDemo(
    () =>
      generateStructured<Briefing>({
        system: BRIEFING_SYSTEM,
        prompt: `Source material to brief on:\n\n"""${sourceText}"""`,
        schema: briefingSchema,
        temperature: 0.6,
      }),
    () => DEMO_BRIEFING,
  );
}

/**
 * Synthesize the two-host briefing to audio with Gemini multi-speaker TTS.
 * Returns a playable WAV blob URL, or null if TTS is unavailable (demo mode, or the
 * key does not have TTS access). Callers fall back to the browser Web Speech API.
 */
export async function synthesizeBriefingAudio(briefing: Briefing): Promise<string | null> {
  if (isDemoMode) return null;
  try {
    const ai = getClient();
    const dialogue = briefing.turns.map((t) => `${t.speaker}: ${t.text}`).join('\n');
    const res = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: `Read this two-host briefing aloud naturally.\n\n${dialogue}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'Maya', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              { speaker: 'Dev', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
            ],
          },
        },
      } as never,
    });
    const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) return null;
    return pcmBase64ToWavUrl(data, 24000);
  } catch (err) {
    console.warn('Gemini TTS unavailable, falling back to browser speech.', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Planner: commitments + clock -> a backward-planned, time-boxed schedule. The
// model returns ordered, untimed blocks; we lay them back-to-back from "now" so
// the clock labels and Calendar timestamps are always exact and trustworthy.
// ---------------------------------------------------------------------------

function finalizePlan(raw: RawPlan, now: number): SchedulePlan {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  let cursor = now;
  const blocks: PlanBlock[] = (raw.blocks || []).map((b) => {
    const minutes = Math.max(0, Math.round(b.minutes));
    const startMs = cursor;
    const endMs = startMs + minutes * 60_000;
    cursor = endMs;
    return {
      start: fmt(startMs),
      end: fmt(endMs),
      minutes,
      label: b.label,
      detail: b.detail,
      startMs,
      endMs,
      type: b.type === 'buffer' || b.type === 'leave' ? b.type : 'focus',
    };
  });
  return { title: raw.title, summary: raw.summary, headline: raw.headline, blocks };
}

export async function makePlan(commitments: Commitment[], now = Date.now()): Promise<SchedulePlan> {
  if (isDemoMode || commitments.length === 0) {
    await sleep(1200);
    return finalizePlan(buildDemoPlanRaw(), now);
  }
  const open = [...commitments].sort((a, b) => a.deadlineMs - b.deadlineMs);
  const nearest = Math.max(0, Math.round((open[0].deadlineMs - now) / 60_000));
  const lines = open
    .map((c) => {
      const mins = Math.max(0, Math.round((c.deadlineMs - now) / 60_000));
      return `- ${c.title} | due in ${mins}m | impact ${c.impact}/5 | needs about ${c.effortMin}m | ${c.urgency}`;
    })
    .join('\n');
  return liveOrDemo(
    async () => {
      const raw = await generateStructured<RawPlan>({
        system: PLAN_SYSTEM,
        prompt: `It is ${new Date(now).toLocaleTimeString()}. The nearest hard deadline is in ${nearest} minutes. Build a schedule that starts now and fits the time, for these commitments:\n${lines}`,
        schema: planSchema,
        temperature: 0.4,
      });
      return finalizePlan(raw, now);
    },
    () => finalizePlan(buildDemoPlanRaw(), now),
  );
}

// ---------------------------------------------------------------------------
// Rehearse: role + context -> a last-minute prep pack for a high-stakes Q&A.
// ---------------------------------------------------------------------------

export async function makePrep(role: string, context = ''): Promise<PrepPack> {
  if (isDemoMode) {
    await sleep(1300);
    return DEMO_PREP;
  }
  return liveOrDemo(
    () =>
      generateStructured<PrepPack>({
        system: PREP_SYSTEM,
        prompt: `Prepare me for: ${role}\n\nContext if useful:\n${context || '(none)'}`,
        schema: prepSchema,
        temperature: 0.6,
      }),
    () => DEMO_PREP,
  );
}

// ---------------------------------------------------------------------------
// Capture: Gemini Vision reads a photo of receipts or a document into structured
// data. With no image or no key it returns a hand-authored sample, so the demo is
// always bulletproof.
// ---------------------------------------------------------------------------

export interface CaptureImage {
  mimeType: string;
  /** Base64 with no data: prefix. */
  data: string;
}

function normalizeCapture(r: CaptureResult): CaptureResult {
  const items: CaptureItem[] = Array.isArray(r.items) ? r.items : [];
  const fields = Array.isArray(r.fields) ? r.fields : [];
  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  return {
    kind: r.kind === 'document' ? 'document' : 'receipts',
    title: r.title || (r.kind === 'document' ? 'Captured document' : 'Captured receipts'),
    summary: r.summary || '',
    items,
    total: Math.round(total * 100) / 100,
    currency: r.currency || 'USD',
    fields,
  };
}

export async function makeCapture(kind: CaptureKind, image?: CaptureImage): Promise<CaptureResult> {
  if (!image || isDemoMode) {
    await sleep(1200);
    return kind === 'document' ? DEMO_CAPTURE_DOC : DEMO_CAPTURE;
  }
  return liveOrDemo(
    async () => {
      const ai = getClient();
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: image.mimeType, data: image.data } },
              {
                text:
                  kind === 'document'
                    ? 'Read this document or form. Extract the key fields as key/value pairs. Set kind to "document".'
                    : 'Read these receipts. Extract every line item with label, ISO date, category, and amount. Set kind to "receipts".',
              },
            ],
          },
        ],
        config: {
          systemInstruction: CAPTURE_SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: captureSchema as never,
          temperature: 0.2,
        },
      });
      return normalizeCapture(parseJsonLoose<CaptureResult>(res.text || ''));
    },
    () => (kind === 'document' ? DEMO_CAPTURE_DOC : DEMO_CAPTURE),
  );
}

// ---------------------------------------------------------------------------
// Voice: transcribe a recorded clip with Gemini. The browser Speech API streams
// audio to a cloud backend that is blocked on many networks and Chromium builds;
// routing voice through first-party Gemini audio understanding makes spoken
// input work in every browser and strengthens the Google-tech story.
// ---------------------------------------------------------------------------

export async function transcribeAudio(base64: string, mimeType: string): Promise<string> {
  if (isDemoMode) {
    // No key present: simulate a transcription so the voice flow is demoable.
    await sleep(900);
    return DEMO_BRAINDUMP;
  }
  return liveOrDemo(
    async () => {
      const ai = getClient();
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'Transcribe this voice memo into clean, readable text. Smooth out filler words and false starts, ' +
                  'but keep every task, name, date, time, and number exactly as spoken. Return only the transcript, ' +
                  'with no preamble, labels, or quotation marks.',
              },
              { inlineData: { mimeType, data: base64 } },
            ],
          },
        ],
        config: { temperature: 0.2 },
      });
      return (res.text || '').trim();
    },
    () => DEMO_BRAINDUMP,
  );
}

// ---------------------------------------------------------------------------
// Watcher: autonomous monitor. Pure local logic so it is always reliable. It
// reacts to the blackboard (commitments) and the clock, and raises one alert.
// ---------------------------------------------------------------------------

export function runWatcher(commitments: Commitment[], now = Date.now()): WatcherAlert | null {
  const open = commitments.filter((c) => c.status !== 'done');
  if (open.length === 0) return null;

  const withTime = open
    .map((c) => ({ c, minsLeft: Math.round((c.deadlineMs - now) / 60000) }))
    .sort((a, b) => a.minsLeft - b.minsLeft);

  // 1) Anything overdue is critical.
  const overdue = withTime.find((x) => x.minsLeft <= 0);
  if (overdue) {
    const agent = overdue.c.suggestedAgent;
    return {
      id: uid('w'),
      level: 'critical',
      message: `${overdue.c.title} is overdue. Decide now: finish it, ask for an extension, or cut it.`,
      action: agent ? `Dispatch the ${agent} agent` : undefined,
      act: agent
        ? { kind: 'dispatch', commitmentId: overdue.c.id, agent, label: 'Draft it now' }
        : undefined,
    };
  }

  // 2) Not enough time to physically finish the next thing.
  const tooTight = withTime.find((x) => x.minsLeft < x.c.effortMin && x.c.urgency !== 'low');
  if (tooTight) {
    const agent = tooTight.c.suggestedAgent;
    return {
      id: uid('w'),
      level: 'critical',
      message: `Only ${tooTight.minsLeft}m left for "${tooTight.c.title}" but it needs about ${tooTight.c.effortMin}m. Start it now or cut the scope.`,
      action: agent ? `Let the ${agent} agent draft it` : undefined,
      act: agent
        ? { kind: 'dispatch', commitmentId: tooTight.c.id, agent, label: 'Let an agent draft it' }
        : undefined,
    };
  }

  // 3) Over capacity: must-do effort exceeds time to the nearest hard deadline.
  const mustDo = withTime.filter((x) => x.c.urgency === 'critical' || x.c.urgency === 'high');
  if (mustDo.length > 1) {
    const nearest = mustDo[0].minsLeft;
    const totalEffort = mustDo.reduce((s, x) => s + x.c.effortMin, 0);
    if (totalEffort > nearest) {
      const droppable = [...open]
        .filter((c) => c.urgency !== 'critical')
        .sort((a, b) => a.impact - b.impact)[0];
      return {
        id: uid('w'),
        level: 'warning',
        message: `You are over capacity. Your must-do tasks need about ${totalEffort}m and the next deadline is in ${nearest}m.` +
          (droppable ? ` I recommend dropping "${droppable.title}".` : ' Something has to give.'),
        action: droppable ? `Drop "${droppable.title}"` : undefined,
        act: droppable
          ? { kind: 'drop', commitmentId: droppable.id, label: `Drop "${droppable.title}"` }
          : undefined,
      };
    }
  }

  // 4) Otherwise a focused nudge toward the top task.
  const top = withTime[0];
  return {
    id: uid('w'),
    level: 'nudge',
    message: `${top.minsLeft}m to "${top.c.title}". Stay on it. I will hold the rest.`,
  };
}

// ---------------------------------------------------------------------------
// Resume Screener: evaluate a candidate's resume against a job description.
// For interviewers / hiring managers doing rapid pre-call screening.
// ---------------------------------------------------------------------------

const SCREEN_SYSTEM = `You are the Resume Screener agent in Clutch. An interviewer has 90 seconds before a candidate call and needs to know what to probe. Given a job description and a candidate's resume, return:
- candidate: their name or "Candidate" if not clear
- role: the role being hired for
- fitScore: 1 (poor fit) to 10 (ideal fit), based on skills, experience depth, and trajectory
- strengths: 3-4 concrete things from the resume that match the JD
- gaps: 2-3 specific things the resume does not cover but the JD requires
- topQuestions: 4-5 sharp, specific interview questions targeting the gaps and depth of the claimed strengths
- recommendation: "strong-yes", "yes", "maybe", or "no"
- summary: one sentence the interviewer can read out loud to set context. Never use the em-dash character.`;

const screenSchema = {
  type: Type.OBJECT,
  properties: {
    candidate: { type: Type.STRING },
    role: { type: Type.STRING },
    fitScore: { type: Type.INTEGER },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
    topQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendation: { type: Type.STRING, enum: ['strong-yes', 'yes', 'maybe', 'no'] },
    summary: { type: Type.STRING },
  },
  required: ['candidate', 'role', 'fitScore', 'strengths', 'gaps', 'topQuestions', 'recommendation', 'summary'],
};

export async function screenResume(jd: string, resume: string): Promise<ScreenResult> {
  if (isDemoMode) {
    await sleep(1400);
    return DEMO_SCREEN;
  }
  return liveOrDemo(
    () =>
      generateStructured<ScreenResult>({
        system: SCREEN_SYSTEM,
        prompt: `Job description:\n"""\n${jd}\n"""\n\nCandidate resume:\n"""\n${resume}\n"""`,
        schema: screenSchema,
        temperature: 0.3,
      }),
    () => DEMO_SCREEN,
  );
}

// ---------------------------------------------------------------------------
// Resume Recall: candidate side. The user has multiple tailored resumes and
// needs to recall exactly what is in the one they sent before walking into
// the room. Returns alignment notes and specific talking points.
// ---------------------------------------------------------------------------

const RECALL_SYSTEM = `You are the Resume Recall agent in Clutch. A candidate is about to be interviewed and may have forgotten what specific claims they made in the resume they sent. Given the candidate's resume text and the job description, return:
- role: what the candidate is interviewing for
- resumeHighlights: the 4-5 most specific claims on their resume that the interviewer will likely probe (with the actual number or project name)
- alignedStrengths: 3 ways the resume directly maps to what the JD is asking for
- likelyGaps: 2-3 places where the interviewer will push back given the gap between the resume and JD
- talkingPoints: 3-4 specific sentences the candidate should say, in their own voice, using real details from the resume
- watchOut: the one thing they must NOT say given what is (or is not) in their resume. Never use the em-dash character.`;

const recallSchema = {
  type: Type.OBJECT,
  properties: {
    role: { type: Type.STRING },
    resumeHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
    alignedStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    likelyGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
    talkingPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    watchOut: { type: Type.STRING },
  },
  required: ['role', 'resumeHighlights', 'alignedStrengths', 'likelyGaps', 'talkingPoints', 'watchOut'],
};

export async function makeResumeRecall(resume: string, jd: string, role: string): Promise<ResumeRecall> {
  if (isDemoMode) {
    await sleep(1300);
    return DEMO_RESUME_RECALL;
  }
  return liveOrDemo(
    () =>
      generateStructured<ResumeRecall>({
        system: RECALL_SYSTEM,
        prompt: `Role I am interviewing for: ${role}\n\nMy resume:\n"""\n${resume}\n"""\n\nJob description:\n"""\n${jd || '(not provided)'}"""`,
        schema: recallSchema,
        temperature: 0.4,
      }),
    () => DEMO_RESUME_RECALL,
  );
}

// ---------------------------------------------------------------------------
// Prompt Guide: generate a copy-paste AI prompt the user can use to complete
// the task themselves when time is critical or the deadline is already missed.
// ---------------------------------------------------------------------------

const PROMPT_GUIDE_SYSTEM = `You are the Prompt Guide agent in Clutch. A user is about to miss (or has already missed) a deadline. Generate a single, tight AI prompt they can paste into any AI tool (ChatGPT, Gemini, Claude) to produce a usable version of their deliverable in one shot. The prompt should be specific, structured, and include all constraints the user needs (format, tone, length, key facts to include). Never use the em-dash character. Return only the prompt text, no preamble.`;

export async function generatePromptGuide(task: string, context: string): Promise<string> {
  const demo = (): string =>
    `Act as a senior consultant. ${task.toLowerCase().includes('deck') || task.toLowerCase().includes('slide')
      ? `Create a 6-slide board presentation about "${task}". For each slide: write a title, 3 tight bullets with real numbers, and one-line speaker notes. Slide 1: executive headline. Slides 2-4: evidence (metrics, wins, gaps). Slide 5: forward plan with 3 measurable commitments. Slide 6: the ask with specific budget and action required.`
      : task.toLowerCase().includes('email') || task.toLowerCase().includes('script') || task.toLowerCase().includes('message')
      ? `Write a "${task}" in a confident, plain human voice. No jargon. One clear ask. Subject line, 3-sentence context, one ask with a deadline, professional close. Under 150 words.`
      : `Complete this task: "${task}". Context: ${context}. Be specific, use real numbers, format it so the user can use it immediately.`
    }`;

  if (isDemoMode) {
    await sleep(600);
    return demo();
  }

  return liveOrDemo(
    async () => {
      const ai = getClient();
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: `Task: ${task}\nContext: ${context}`,
        config: { systemInstruction: PROMPT_GUIDE_SYSTEM, temperature: 0.5 },
      });
      return (res.text || '').trim();
    },
    demo,
  );
}

export const AGENT_LABELS: Record<AgentId, string> = {
  chief: 'Chief of Staff',
  planner: 'Planner',
  deck: 'Deck Maker',
  script: 'Script Maker',
  briefing: 'Briefing',
  rehearse: 'Rehearse',
  capture: 'Capture',
  watcher: 'Watcher',
};
