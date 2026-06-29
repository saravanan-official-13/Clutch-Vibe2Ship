# Clutch - Vibe2Ship Submission

Paste this into a Google Doc, set sharing to "anyone with the link can view," and submit the
link. Every required section is here, in order.

---

## Problem Statement Selected

**Problem 1: The Last-Minute Life Saver.** An AI productivity companion that proactively helps
users plan, prioritize, and complete tasks before deadlines are missed, moving beyond passive
reminders toward meaningful action.

## Solution Overview

Clutch is an AI chief of staff for the last 24 hours. Existing tools remind you that a deadline
exists; Clutch produces the thing the deadline needs. You dump everything on your mind, in text
or voice. A Chief of Staff agent triages it into a ranked, time-boxed plan and tells you the one
move to start now. It then dispatches a team of specialist agents that generate the actual
deliverables: a board-ready slide deck, a two-host audio briefing of a document you never read,
the email or pitch you owe someone, and focus blocks booked to your calendar.

The difference is autonomy you can dial and watch. Flip Clutch to Auto and the Chief of Staff runs
the entire rescue with no clicks: it books the schedule, then works each commitment in deadline
order, dispatching the right specialist for each one while you watch every decision stream into a
live Mission Control feed. A Watcher agent runs continuously against the clock and, in Auto mode,
self-heals: when you are over capacity it autonomously drops the lowest-impact task to protect the
deadline and tells you what it did. The result is a tool that turns a panic into a plan and then
does the work that fits the time you have left.

## Key Features

1. **Autopilot (end-to-end autonomy).** Flip the trust dial to Auto and the Chief of Staff executes the whole plan with no clicks: it books your schedule, then works each commitment in deadline order, dispatching the right specialist agent for each and marking it done as it lands. This is the product promise made real, it does not remind you, it does the work.
2. **Mission Control (visible orchestration).** A live, timestamped feed of every agent decision, route, dispatch, and deliverable, plus a roster of the eight-agent swarm that lights up as work flows through it. You see the autonomy happen in real time.
3. **The self-healing Watcher (proactive agency).** A monitoring agent that reacts to the clock and the plan, raises capacity warnings with one-click corrective actions, and in Auto mode autonomously drops the lowest-impact task to protect the deadline. Real agency, not a chat reply.
4. **Brain-dump to battle plan.** Free-form text or voice becomes a ranked plan in seconds, scored by urgency, impact, and what survives the clock, with a clear first move.
5. **Deck Maker with Google Slides export.** A fully styled slide deck with multiple layouts (cover, stat, image-right, quote, closing), bold emphasis, per-slide AI images via Google Imagen, and a one-click export that creates the deck in Google Drive and embeds the live Google Slides player in-app.
6. **Briefing (the standout).** Hand it the file you never read; two hosts turn it into a six-minute audio briefing you absorb on the way to the meeting, voiced by Gemini multi-speaker text to speech.
7. **Script Maker.** The email, pitch, toast, apology, or talk track, written in a plain human voice with delivery tips and a spoken-duration estimate.
8. **Calendar focus blocks.** One click books a focus block for any task via a Google Calendar deep link.
9. **Voice first.** Speak your brain-dump and hear your briefing. Voice input is transcribed by
   Gemini itself, so it works in any browser, and is hands-free when you are running.
10. **Trust dial that means something.** Suggest, Confirm, or Auto. The dial genuinely changes agent behavior, from advice only, to prepare-and-wait, to full autonomous execution.

## Technologies Used

- **Frontend:** React 19, TypeScript, Vite 6.
- **Styling and motion:** Tailwind CSS v4, Motion (`motion/react`), the ThunderUI design system, Geist typography, Phosphor icons.
- **State:** Zustand with a live clock loop driving the autonomous Watcher.
- **AI SDK:** `@google/genai` (the unified Google Gen AI SDK).
- **Platform:** Google AI Studio for build and deployment.

## Google Technologies Utilized

- **Gemini 2.5 Flash** is the reasoning core for every agent. The Chief of Staff uses structured
  output (a response schema) to return a typed, ranked plan; the makers use structured output to
  return typed decks, scripts, and briefings.
- **Gemini function calling** powers the orchestrator. The Chief of Staff is given seven tool
  declarations (`generate_deck`, `write_script`, `create_briefing`, `make_plan`, `prep_rehearsal`,
  `extract_capture`, and `replan`) and decides which specialist to invoke for a free-form request.
  The returned function call is executed in app and streamed to Mission Control.
- **Gemini multi-speaker text to speech** (`gemini-2.5-flash-preview-tts`) voices the two hosts of
  the audio briefing. The raw PCM is wrapped to WAV in the browser for playback.
- **Gemini audio understanding** powers voice input. Spoken brain-dumps are recorded in the browser
  to a WAV clip and transcribed by Gemini 2.5 Flash, so voice works in every browser instead of
  depending on a browser-specific speech backend.
- **Gemini multimodal understanding** is wired to read uploaded or photographed source material
  for the briefing and deck agents.
- **Google Slides API and Google Drive API** are used by the Deck Maker to build the presentation
  directly in the user's Google Drive. Google Identity Services (GIS) handles the one-time OAuth
  token; the app then issues a `presentations.create` and a `batchUpdate` with per-slide requests
  covering titles (bold), bullet bodies with bold ranges, image placements, and layout-specific
  backgrounds. The live Google Slides iframe is embedded inside Clutch after creation.
- **Google Imagen 3** (`imagen-3.0-generate-001`) generates original AI images per slide on demand
  via the Gemini SDK. Stock photos (picsum.photos) render instantly by default so the in-app
  preview works with no additional OAuth.
- **Google Calendar** is integrated through prefilled event deep links, so a user can book a focus
  block in one click with no OAuth step.
- **Web Speech API** provides a no-key voice-input fallback and a local narration fallback for the
  briefing.
- **Google AI Studio** is the build and deployment platform. The app is in AI Studio's native
  format and reads the key from `process.env.API_KEY`, which AI Studio injects at deploy time.

Production scale path on Google Cloud: Firebase Auth and Firestore for user state, Cloud Run for
stateless agent services, Pub/Sub for the Watcher event loop, BigQuery for productivity analytics,
and Vertex AI for a learned prioritization model.

## Architecture and Design

A "situation" blackboard object holds the deadlines, the plan, and the artifacts. The Chief of
Staff writes the plan and dispatches; the makers write artifacts; the Watcher reads the blackboard
plus the clock and raises one alert at a time. Every agent action is appended to a Mission Control
activity trace, so the orchestration is visible rather than hidden. In Auto mode the Chief runs a
closed loop, perceive, decide, dispatch, observe, across the whole plan. Every agent has a demo
path that returns realistic data with no key, so the deployed app is always fully functional.

The interface is built on ThunderUI: one locked accent (Electric Amber) on a Zinc base, Geist
type, Phosphor icons, Motion for all animation with reduced-motion honored, dual light and dark
themes, WCAG AA contrast, and a strict no-em-dash rule.

## Demo Video Script

See DEMO_SCRIPT.md in the repository for the scene-by-scene three-minute script.

## Future Roadmap

- **3 months:** real Google Calendar OAuth two-way sync, Gmail send for the Script Maker, PDF and PPTX export for decks.
- **6 months:** a learning loop that adapts prioritization to the user's real follow-through (Vertex AI), team mode where the Chief of Staff coordinates across a group.
- **1 year:** proactive ingestion (the Watcher reads your calendar and inbox and pre-stages the deliverables before you panic), an on-device fast path for privacy.

## Team and Acknowledgments

Built for Vibe2Ship on Google AI Studio and Gemini.
