# Clutch - 3 Minute Demo Script

Total: 3:00. The whole demo runs in demo mode, so it needs no key and cannot fail on stage.
Add a Gemini key beforehand if you want the briefing voiced by Gemini TTS instead of the browser.

---

## Cold open (0:00 - 0:25)

Land on the home page. Do not read the hero, say the line:

> "It is 7:48 PM. Your board call got moved to 9 tonight and your deck is not done. Reminders
> will not save you. Producing the work will. This is Clutch."

Point at the live mission control card on the right. The countdown is ticking. The Watcher nudge
has already slid in: "72m to the deck but it needs about 45m."

Click **Open Clutch**.

## Triage (0:25 - 0:55)

The brain-dump is prefilled with a realistic panic. Say:

> "I dump everything on my mind, messy. One agent reads the room."

Click **Triage my chaos**. In about a second the plan appears.

> "The Chief of Staff ranked five commitments by urgency, impact, and what survives the clock.
> Notice the first move it picked: start the deck, because it is the only thing that does not
> recover if the clock wins. And up top, the Watcher already flagged that I am over capacity and
> told me what to drop."

## The deck (0:55 - 1:25)

Click the **Deck** tab, then **Build the deck**.

> "Each commitment the Chief can produce has a dispatch button. The Deck Maker returns a full
> board deck with speaker notes, not an outline."

Flip through two slides. Land on the margin slide and read one speaker note out loud.

> "It even tells me the question the board will ask and the answer. I can export this right now."

## The standout: the briefing (1:25 - 2:25)

Click the **Briefing** tab, then **Create the briefing**.

> "Here is the move that wins the room. I never read the financials. Clutch turns them into a
> two-host audio briefing I can listen to on the way to the call."

Read the three takeaways aloud, then click **Play briefing**. Let Maya and Dev talk for ten
seconds. As they speak, the active line highlights.

> "Two hosts, Maya and Dev. With a Gemini key this is voiced by Gemini multi-speaker text to
> speech. This is NotebookLM pointed at the one document you actually have to walk into a room
> and defend."

## The agency: autopilot (2:25 - 2:50)

Go back to the **Console**. Type: "reply to Priya about the 7am standup" and send.

> "I can also just ask. The Chief of Staff uses Gemini function calling to pick the right agent.
> That routed to the Script Maker, which wrote the reply in my voice."

Now the closer. Toggle the autonomy dial to **Auto**. The app jumps to the **Mission** tab.

> "But watch what real autonomy looks like. On Auto, I do not click anything. The Chief of Staff
> takes the wheel."

Mission Control lights up live: the agent roster activates one by one, the activity feed streams
every decision, and the plan progress bar fills as each commitment is dispatched and completed.

> "It booked my schedule, then worked every commitment in deadline order, dispatching the right
> specialist for each one. And when it saw I was over capacity, the Watcher autonomously dropped
> the lowest-impact task to protect the deadline and told me it did. That is a closed loop:
> perceive, decide, act, observe. No clicks."

## Close (2:50 - 3:00)

> "Reminders tell you the deadline exists. Clutch produces what the deadline needs, and a teammate
> that watches the clock so you do not have to. Built entirely on Gemini and Google AI Studio."

---

## Five wow moments
1. The Watcher nudge already on screen before you click anything.
2. The first-move call with a real reason attached.
3. A full deck with the board's likely question pre-answered in the notes.
4. A voiced two-host briefing of your own document.
5. Auto mode: the whole plan executes itself in Mission Control while the Watcher self-heals an overload, no clicks.

## Likely judge questions and answers

- **"Is the multi-agent part real or marketing?"** Real. The orchestrator uses Gemini function
  declarations and executes the returned tool call; the Watcher runs autonomously off the clock
  and the shared blackboard; each maker is its own agent with its own system instruction and schema.
  On Auto, the Chief runs the full perceive-decide-act-observe loop across the whole plan, and you
  watch every step stream into Mission Control.
- **"What is genuinely novel here?"** The makers produce the deliverable, and the briefing turns
  your own document into voiced audio. Most assistants stop at advice.
- **"Does the demo depend on the network?"** No. Demo mode returns realistic data with no key, so
  the deployed app and the stage demo both always work. A key upgrades it to live agents and Gemini TTS.
- **"How does this scale to millions?"** Stateless agent services on Cloud Run, Firestore for user
  state, Pub/Sub for the Watcher loop, BigQuery for analytics, Vertex AI for learned prioritization.
- **"Why Gemini specifically?"** Function calling for the orchestrator, structured output for typed
  artifacts, multimodal for reading uploads, and multi-speaker TTS for the briefing, all in one model family.
- **"What about Calendar without OAuth?"** Today it uses prefilled Calendar deep links, which work
  instantly. Full two-way OAuth sync is the first roadmap item.
- **"Accessibility?"** WCAG AA contrast, keyboard nav, visible focus, `aria-live` on streaming
  surfaces, and reduced-motion honored throughout.
- **"What did you cut for the timeline?"** Real OAuth, Gmail send, and PPTX export. The core agent
  loop and the briefing are complete.
- **"Could this be a Google product?"** It is Workspace-shaped: it sits on Calendar, Gmail, and
  Drive, and it is the action layer those tools never had.
- **"What breaks first under load?"** The synchronous maker calls. The fix is queueing maker jobs
  through Pub/Sub and streaming results, which the architecture already anticipates.
