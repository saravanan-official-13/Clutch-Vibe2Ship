# Clutch

**Your AI chief of staff for the last 24 hours.** It does not remind you. It produces the
work: the deck, the briefing, the message, and a plan that fits the clock you actually have.

![Built with Gemini](https://img.shields.io/badge/AI-Gemini%202.5-FFB200)
![Google AI Studio](https://img.shields.io/badge/Deploy-Google%20AI%20Studio-4285F4)
![Vite](https://img.shields.io/badge/Vite-6-646CFF)
![React 19](https://img.shields.io/badge/React-19-61DAFB)
![License MIT](https://img.shields.io/badge/license-MIT-555)

> Vibe2Ship submission for **Problem 1: The Last-Minute Life Saver**.

---

## The problem

Passive reminders fail. At 11pm the issue is not "I forgot," it is "I have four hours and
three things due and I cannot physically produce them all." Clutch is the first productivity
tool whose agents produce the deliverable instead of nagging about it.

## What it does

1. **Dump the panic.** Type or speak everything on your mind.
2. **Triage.** The Chief of Staff ranks every commitment by urgency, impact, and what survives the clock, and tells you the single first move.
3. **Dispatch.** It calls the right specialist agent through Gemini function calling.
4. **Produce.** You get a board-ready deck, a two-host audio briefing, the written message, and a plan with focus blocks for Google Calendar.
5. **Or just hit Auto.** Flip the trust dial to Auto and the Chief of Staff runs the entire rescue with no clicks, while you watch every agent decision stream into a live Mission Control feed.

## The multi-agent system

| Agent | Role | How |
| --- | --- | --- |
| **Chief of Staff** | Triages the brain-dump, ranks commitments, routes work, and on Auto executes the whole plan. | Gemini structured output + function calling |
| **Watcher** | Autonomous monitor. Runs against the clock and, on Auto, self-heals an overload by dropping the lowest-impact task. | Live blackboard + clock rules |
| **Deck Maker** | Board-ready slide deck with speaker notes. | Gemini structured output |
| **Script Maker** | Email, pitch, toast, apology, talk, in your voice. | Gemini structured output |
| **Briefing** | Your document as a two-host audio briefing. | Gemini structured output + multi-speaker TTS |
| **Planner** | Backward-plans the deadline, books focus blocks. | Google Calendar deep links |
| **Rehearse / Capture** | Interview prep packs and vision-based receipt and document capture. | Gemini structured output + multimodal |

The agents share a "situation" blackboard. The Chief of Staff dispatches specialists via Gemini
function declarations (`generate_deck`, `write_script`, `create_briefing`, `make_plan`,
`prep_rehearsal`, `extract_capture`, `replan`), each writes a structured artifact back, and the
Watcher reacts to changes in the blackboard and the clock. Every agent action is appended to a
**Mission Control** activity trace, so the orchestration is visible, not hidden. A trust dial
(suggest / confirm / auto) genuinely changes behavior: advice only, prepare and wait, or full
autonomous execution.

## Google technology

- **Gemini 2.5 Flash** for reasoning, triage, and structured generation.
- **Gemini function calling** for the orchestrator routing.
- **Gemini multi-speaker TTS** (`gemini-2.5-flash-preview-tts`) for the podcast briefing.
- **Gemini audio transcription** for voice input, so speaking your brain-dump works in any browser.
- **Gemini multimodal** to read a photographed syllabus or whiteboard (extensible).
- **Google Slides API + Google Drive API** to create presentation decks directly in the user's
  Drive and embed the live player in-app. Uses Google Identity Services for the one-time OAuth
  token; no backend required.
- **Google Imagen 3** (`imagen-3.0-generate-001`) for per-slide AI-generated images on demand.
- **Google Calendar** deep links to book focus blocks with no OAuth friction.
- **Web Speech API** as a no-key voice-input and narration fallback.
- **Google AI Studio** as the build and deploy platform.

Documented production scale path: Firebase Auth/Firestore, Cloud Run for stateless agent
services, Pub/Sub for the Watcher event loop, BigQuery for productivity analytics, Vertex AI
for a learned prioritization model.

## Run locally

```bash
npm install
cp .env.local.example .env.local   # add your key, or leave empty for demo mode
npm run dev
```

Get a key at https://aistudio.google.com/app/apikey and set `GEMINI_API_KEY` in `.env.local`.

**Google Slides export (optional):** set `GOOGLE_OAUTH_CLIENT_ID` in `.env.local` to a Web
Application OAuth 2.0 Client ID (Google Cloud console). Enable the Google Slides API and Google
Drive API for the project, and add `http://localhost:5173` plus your AI Studio deploy URL to the
authorized JavaScript origins. Without this key the app shows a "Connect Google" placeholder and
all other features work normally.

**Demo mode:** with no key, every agent returns realistic, hand-authored output so the entire
UI is alive. This is also what the deployed AI Studio build shows by default.

## Deploy to Google AI Studio

1. Open https://aistudio.google.com and create or import this app in Build mode.
2. AI Studio injects the Gemini key as `process.env.API_KEY` automatically.
3. Click **Publish**, then **Get started**, then **Publish app**.
4. The deployed link is your submission link. Reference: https://ai.google.dev/gemini-api/docs/aistudio-deploying

## Project structure

```
last-minute-life-saver/
  index.html  index.tsx  index.css  App.tsx  metadata.json
  vite.config.ts  tsconfig.json  package.json
  types.ts  store.ts
  lib/        utils.ts  speech.ts
  data/       demo.ts            # realistic no-key scenario + artifacts
  services/   gemini.ts  agents.ts   # the multi-agent runtime
              visuals.ts             # stock photos + Google Imagen
              googleSlides.ts        # Google Slides API + Google Identity Services
  components/
    ThemeToggle.tsx
    ui/        primitives.tsx
    landing/   Landing.tsx  LivePreview.tsx
    workspace/ Workspace.tsx Intake.tsx PlanBoard.tsx WatcherBar.tsx MissionControl.tsx
               Console.tsx DeckView.tsx ScriptView.tsx BriefingView.tsx
               PlanView.tsx RehearseView.tsx CaptureView.tsx MakerStates.tsx
```

## Design

Built end to end on the **ThunderUI** anti-slop design system: one locked accent (Electric
Amber) on a Zinc base, Geist typography, Phosphor icons, Motion for all animation, dual light
and dark themes, WCAG AA, and a zero-em-dash rule. See `../../THUNDERUI.md`.

Built for Vibe2Ship on Google AI Studio and Gemini.
