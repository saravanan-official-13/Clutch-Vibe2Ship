import type {
  Briefing,
  CaptureResult,
  ChiefResult,
  Commitment,
  Deck,
  PrepPack,
  ResumeRecall,
  ScreenResult,
  ScriptDoc,
} from '../types';

// The canonical last-minute scenario. It is 7:48 PM. The Northwind board call got moved
// up to 9:00 PM tonight and the deck is not done. This drives the demo and the no-key mode.

export const DEMO_BRAINDUMP = `ok this is bad. northwind moved the board review to 9pm TONIGHT and the deck isn't done. i still have to actually read the Q3 financials before the call. priya wants to move standup to 7am, need to reply to her. i promised dana i'd send the partnership intro email tonight. and the Q3 expense report is due friday.`;

export function buildDemoCommitments(now: number): Commitment[] {
  const min = 60_000;
  return [
    {
      id: 'c_deck',
      title: 'Northwind Q3 board deck',
      deadlineMs: now + 72 * min,
      urgency: 'critical',
      impact: 5,
      effortMin: 45,
      status: 'todo',
      rationale: 'Highest impact and the only item that cannot be recovered if the clock wins.',
      suggestedAgent: 'deck',
    },
    {
      id: 'c_brief',
      title: 'Read the Q3 financials before the call',
      deadlineMs: now + 66 * min,
      urgency: 'high',
      impact: 4,
      effortMin: 25,
      status: 'todo',
      rationale: 'You will be asked about margin. I can turn the PDF into a 6 minute audio briefing.',
      suggestedAgent: 'briefing',
    },
    {
      id: 'c_priya',
      title: 'Reply to Priya about moving standup to 7am',
      deadlineMs: now + 20 * min,
      urgency: 'high',
      impact: 3,
      effortMin: 4,
      status: 'todo',
      rationale: 'Quick win, time-sensitive, unblocks four people tomorrow morning.',
      suggestedAgent: 'script',
    },
    {
      id: 'c_dana',
      title: 'Send Dana the partnership intro email',
      deadlineMs: now + 150 * min,
      urgency: 'medium',
      impact: 3,
      effortMin: 10,
      status: 'todo',
      rationale: 'Promised tonight, but it survives past the board call. Do it after the deck.',
      suggestedAgent: 'script',
    },
    {
      id: 'c_expense',
      title: 'Submit Q3 expense report',
      deadlineMs: now + 3 * 24 * 60 * min,
      urgency: 'low',
      impact: 2,
      effortMin: 15,
      status: 'todo',
      rationale: 'Due Friday. Real deadline is far away. Off tonight entirely.',
      suggestedAgent: null,
    },
  ];
}

export function buildDemoChiefResult(now: number): ChiefResult {
  return {
    plan: {
      summary:
        'Five open commitments, 72 minutes before the Northwind board call. Two of them I can produce for you right now.',
      firstMove:
        'Open the deck. With 72 minutes left and 45 of real work, it is the only item that does not survive the clock.',
      commitments: buildDemoCommitments(now),
    },
    dispatches: [
      { agent: 'deck', reason: 'You present in 72 minutes with no deck. I will draft all 7 slides.', commitmentId: 'c_deck' },
      { agent: 'briefing', reason: 'Turn the Q3 financials into a 6 minute audio briefing for the call.', commitmentId: 'c_brief' },
      { agent: 'script', reason: 'Priya needs an answer in 20 minutes. I will write the reply.', commitmentId: 'c_priya' },
    ],
    spokenSummary:
      'You have 72 minutes before the Northwind board call and five open commitments. Start the deck now. In parallel I will write Priya the standup reply, draft Dana the partnership email, and have a 6 minute briefing of the financials ready for you. The expense report is not due until Friday, so I have taken it off tonight.',
  };
}

export const DEMO_DECK: Deck = {
  title: 'Northwind Logistics',
  subtitle: 'Q3 Board Review',
  accent: '#ffb200',
  slides: [
    {
      layout: 'cover',
      title: 'Northwind Logistics',
      subtitle: 'Q3 Board Review - October 2024',
      bullets: [],
      imageSeed: 'logistics warehouse shipping',
      notes:
        'Lead with confidence. Three straight quarters of accelerating growth. One margin story to own, three asks to land. Do not read this slide.',
    },
    {
      layout: 'stat',
      title: 'Q3 at a Glance',
      stat: { value: '18.4%', label: 'Revenue growth - third straight quarter of acceleration' },
      bullets: [
        'ARR reached **7.2M** - up from 6.1M entering the quarter',
        'Net new logos **+22**, churn held at **1.4%**',
        'LaaS now **41%** of revenue, up 8 points in one quarter',
      ],
      notes:
        'Give them the headline number first. Pause after 18.4%. Let "third straight quarter" land before you move on.',
    },
    {
      layout: 'image-right',
      title: 'Revenue and Margin',
      imageQuery: 'logistics supply chain warehouse',
      imageSeed: 'logistics supply chain warehouse',
      bullets: [
        'ARR **28.9M**, up from 24.4M entering the quarter',
        'LaaS is now **41%** of revenue, up from 33%',
        'Gross margin **61.2%**, down **1.9 points** on fuel and a carrier rate reset',
        'Both pressures are temporary and modeled to ease in Q4',
      ],
      notes:
        'Expect the margin question. Your answer: 1.9 points, two named causes, both temporary, Q4 recovery already in the forecast.',
    },
    {
      layout: 'bullets',
      title: 'What Worked',
      imageSeed: 'team success delivery',
      bullets: [
        'Enterprise mid-market: **7 deals over 100K**, average cycle down **11 days**',
        'Self-serve onboarding cut time-to-first-shipment from **9 days to 3**',
        'Support CSAT **94.1%** after the routing model shipped in August',
      ],
      notes:
        'This slide buys you credibility for the asks later. Name the people who drove each win.',
    },
    {
      layout: 'bullets',
      title: 'What Slipped',
      imageSeed: 'planning roadmap delay',
      bullets: [
        'EU launch pushed one quarter on a customs integration dependency',
        'Two senior data hires still open, slowing the forecasting roadmap',
        'A pricing experiment underperformed and was rolled back in week 6',
      ],
      notes:
        'Show the misses before they ask. Boards trust the team that volunteers bad news with a plan attached.',
    },
    {
      layout: 'image-right',
      title: 'The Q4 Plan',
      imageQuery: 'roadmap strategy planning Europe',
      imageSeed: 'roadmap strategy planning Europe',
      bullets: [
        'Ship the EU customs integration and launch in **two markets**',
        'Close both data hires and stand up the demand-forecasting beta',
        'Move LaaS to **50% of revenue** with new tiered pricing',
      ],
      notes:
        'Three commitments, each measurable. Do not list ten. The board remembers three.',
    },
    {
      layout: 'quote',
      title: 'The Confidence Case',
      quote: 'Three straight quarters of accelerating growth is not luck. It is a motion that compounds.',
      attribution: 'Board memo, October 2024',
      bullets: [],
      notes:
        'Let this land in silence before you click. It is your thesis statement and the frame for the three asks.',
    },
    {
      layout: 'closing',
      title: 'Three Asks',
      bullets: [
        'Approve the **1.2M** EU go-to-market budget',
        'Backfill the data roles with a **15% comp band** increase',
        'Greenlight the forecasting beta with **three design partners**',
      ],
      notes:
        'End on the ask, not thank-you. Pause after each one. Let them say yes in the room.',
    },
  ],
};

export const DEMO_SCRIPT: ScriptDoc = {
  kind: 'email',
  title: 'Partnership intro: Dana at Meridian and Northwind',
  durationSec: 48,
  body: `Subject: Quick intro - Meridian and Northwind on last-mile

Hi Dana,

Following up on what we started at the logistics dinner. Northwind just moved 41% of revenue to logistics-as-a-service this quarter, and the gap our customers keep naming is reliable last-mile in secondary cities. That is exactly what Meridian is built for.

I would like to put 25 minutes on the calendar next week to see if a pilot makes sense. I can bring our two largest mid-market accounts who have asked for this by name, so we would be testing against real demand, not a hypothetical.

Are you open Tuesday or Thursday afternoon? Happy to work around your timezone.

Best,
Sam`,
  deliveryTips: [
    'Send before 9 PM so it lands at the top of her morning, not buried overnight.',
    'The specific 41% number signals you did the work. Keep it.',
    'One ask, two time options. Do not offer five slots.',
  ],
};

export const DEMO_BRIEFING: Briefing = {
  title: 'Q3 financials, the 6 minute version',
  takeaways: [
    'Revenue up 18.4% to 7.2M, margin down 1.9 points on fuel and a carrier reset.',
    'LaaS is 41% of revenue and the real growth engine.',
    'Be ready for one margin question and one EU-delay question.',
  ],
  turns: [
    { speaker: 'Maya', text: 'Okay, you have a board call in about an hour and you have not read the Q3 financials. I have. Here is what you actually need.' },
    { speaker: 'Dev', text: 'Start with the headline. Revenue is 7.2 million, up 18.4 percent. That is the third straight quarter that growth has sped up, not slowed down.' },
    { speaker: 'Maya', text: 'Right, and that acceleration is the story. The thing they will push on is margin. Gross margin dropped 1.9 points to 61.2.' },
    { speaker: 'Dev', text: 'Two reasons, both temporary. Fuel costs, and a one-time carrier rate reset. The Q4 forecast already has both easing, so you are not hiding anything.' },
    { speaker: 'Maya', text: 'The part that should make you confident is the mix shift. Logistics-as-a-service went from 33 percent of revenue to 41. That is the high-margin engine taking over.' },
    { speaker: 'Dev', text: 'So if someone frowns at the margin line, your answer is: temporary pressure, named causes, and the mix is moving toward the profitable product anyway.' },
    { speaker: 'Maya', text: 'One more they will ask about. The EU launch slipped a quarter. Do not bury it. Say it slipped on a customs integration, and it ships in Q4.' },
    { speaker: 'Dev', text: 'And the asks. EU budget, two data hires, and the forecasting beta. Three things, each with a number. That is the whole call.' },
    { speaker: 'Maya', text: 'You are ready. Revenue up, margin explained, mix improving, three clear asks. Go open the deck.' },
  ],
};

// ---------------------------------------------------------------------------
// Planner demo. A raw, untimed plan. The maker lays the blocks back-to-back from
// "now" and computes the clock labels and Calendar timestamps, so the demo plan
// always lines up with the live countdown.
// ---------------------------------------------------------------------------

export interface RawPlanBlock {
  label: string;
  detail: string;
  minutes: number;
  type: 'focus' | 'buffer' | 'leave';
}

export interface RawPlan {
  title: string;
  summary: string;
  headline: string;
  blocks: RawPlanBlock[];
}

export function buildDemoPlanRaw(): RawPlan {
  return {
    title: 'Tonight, backward from the 9 PM board call',
    summary:
      'Five commitments, 72 minutes of clock. This is the order that gets the un-recoverable things done first and protects five minutes so you do not walk in flustered.',
    headline:
      'Start the deck now. At 45 minutes of real work against 72 on the clock, it is the only thing that does not survive the night.',
    blocks: [
      {
        label: 'Build the Northwind board deck',
        detail: 'Highest impact and the only item that cannot be recovered if the clock wins. Do it first while you are fresh.',
        minutes: 45,
        type: 'focus',
      },
      {
        label: 'Reply to Priya about the 7 AM standup',
        detail: 'A four minute win that unblocks four people tomorrow. Knock it out while the deck settles in your head.',
        minutes: 4,
        type: 'focus',
      },
      {
        label: 'Listen to the Q3 financials briefing',
        detail: 'Absorb the numbers on audio so the margin question cannot catch you cold in the room.',
        minutes: 12,
        type: 'focus',
      },
      {
        label: 'Breathe, water, walk to the call',
        detail: 'Protect five minutes of buffer. Arriving calm is part of the deliverable.',
        minutes: 5,
        type: 'buffer',
      },
      {
        label: 'Northwind board call starts',
        detail: 'Hard stop. Everything above must be done by now. Phone face down.',
        minutes: 0,
        type: 'leave',
      },
      {
        label: 'Send Dana the partnership email',
        detail: 'This one survives the call. Do it right after while the momentum is still warm.',
        minutes: 10,
        type: 'focus',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Rehearse demo. A last-minute prep pack for the board Q&A.
// ---------------------------------------------------------------------------

export const DEMO_PREP: PrepPack = {
  role: 'Northwind Q3 board review, the Q&A',
  intro:
    'Thanks everyone. Q3 was our third straight quarter of accelerating growth: revenue up 18.4% to 7.2 million. The one thing I want to be straight about is margin, which slipped 1.9 points on fuel and a one-time carrier reset, both of which ease in Q4. Then I have three asks. Let me walk you through it.',
  questions: [
    {
      q: 'Your gross margin dropped almost two points. Is this the start of a trend?',
      answer:
        'No, and here is why I am confident. The 1.9 point drop has two named causes: fuel, and a one-time carrier rate reset. Both are already modeled to ease in Q4. Meanwhile our highest-margin product, logistics-as-a-service, went from 33 to 41% of revenue, so the mix is moving toward profit, not away from it.',
      why: 'They are testing whether you understand your own P&L and whether bad news is temporary or structural.',
    },
    {
      q: 'The EU launch slipped a quarter. What went wrong and what does it cost us?',
      answer:
        'It slipped on a single customs integration dependency, not on demand. The cost is one quarter of EU revenue, roughly 400K, and it ships in Q4. I would rather launch right than launch into a compliance problem in a new market.',
      why: 'They want to see you volunteer the miss with a plan attached, not get cornered into it.',
    },
    {
      q: 'You are asking for two senior data hires at a 15% comp band increase. Justify it.',
      answer:
        'The forecasting roadmap is blocked on those two roles. Every month they stay open, we ship the demand-forecasting beta a month later, and that beta is what moves three design partners to annual contracts. The comp band increase is what is actually clearing offers in this market right now.',
      why: 'They are pressure-testing whether the spend is tied to a measurable outcome.',
    },
    {
      q: 'If growth is accelerating, why is net revenue retention only 117%?',
      answer:
        '117% NRR on a base growing this fast is healthy, and gross retention held at 96.6%. The lever we are pulling is expansion through the tiered pricing we roll out in Q4, which is built to move the LaaS cohort up a tier as their shipment volume grows.',
      why: 'A numbers person on the board wants to see you know the metric cold and have a lever for it.',
    },
    {
      q: 'What is the single biggest risk to the Q4 plan?',
      answer:
        'Execution on the two data hires. Everything else in Q4, the EU launch and the pricing change, is largely in our control. The forecasting beta is the one thing gated on talent we do not have yet, which is exactly why it is my top ask tonight.',
      why: 'They want to know you can name your own biggest risk before they do.',
    },
  ],
  landmines: [
    'Do not call the margin drop "small" or wave it off. Name the number first, then the two causes.',
    'Do not promise the EU launch ships "early" in Q4. Say Q4 and leave yourself the room.',
    'Do not list ten Q4 priorities. The board remembers three. Stay on the three asks.',
  ],
  askBack:
    'Before we close, which of the three asks would you want to see more evidence on, so I can bring exactly that to the next session?',
};

// ---------------------------------------------------------------------------
// Capture demo. Gemini Vision turning a pile of receipts into an expense report.
// Used when there is no API key, or when the user taps "use the sample".
// ---------------------------------------------------------------------------

export const DEMO_CAPTURE: CaptureResult = {
  kind: 'receipts',
  title: 'Q3 expense report, ready to submit',
  summary: 'Six receipts read and categorized. Total comes to 412.74 USD. Two are missing a category, tap to fix.',
  items: [
    { label: 'Blue Bottle Coffee, client meeting', date: '2024-09-12', category: 'Meals', amount: 18.4 },
    { label: 'Uber, airport to Northwind office', date: '2024-09-14', category: 'Travel', amount: 41.2 },
    { label: 'Delta, SFO to SEA round trip', date: '2024-09-14', category: 'Travel', amount: 214.0 },
    { label: 'Marriott, one night', date: '2024-09-14', category: 'Lodging', amount: 96.34 },
    { label: 'Staples, presentation supplies', date: '2024-09-15', category: 'Office', amount: 27.8 },
    { label: 'Working lunch, three people', date: '2024-09-15', category: 'Meals', amount: 15.0 },
  ],
  total: 412.74,
  currency: 'USD',
  fields: [],
};

// ---------------------------------------------------------------------------
// Resume Screener demo. Hiring manager screening a logistics analyst candidate
// against a Senior Data Analyst, Supply Chain role.
// ---------------------------------------------------------------------------

export const DEMO_SCREEN: ScreenResult = {
  candidate: 'Priya Mehta',
  role: 'Senior Data Analyst, Supply Chain',
  fitScore: 7,
  strengths: [
    'Three years of hands-on SQL and Python at a 3PL company, directly mapping to our data stack.',
    'Built the demand-forecasting model at her current role, which cut stockouts by 18% - exactly what this role owns.',
    'Cross-functional experience: she ran weekly ops reviews with warehouse managers, not just analysts.',
  ],
  gaps: [
    'No mention of Snowflake or dbt, which we use for the entire warehouse layer.',
    'Forecasting was batch (weekly runs), not near-real-time. Our role needs sub-4-hour latency.',
    'Team lead experience is claimed but no mention of direct reports or headcount.',
  ],
  topQuestions: [
    'Walk me through the demand-forecasting model you built - what inputs, what algorithm, and how did you validate the 18% stockout reduction?',
    'We run Snowflake and dbt. How quickly could you get productive, and what would you need to get there?',
    'Your current forecasts run weekly. How would you redesign that for a four-hour freshness requirement?',
    'You mention leading a team - who reported to you, and how did you handle a disagreement about a technical approach?',
    'What is the biggest mistake you made in a model that went to production, and what did you change after?',
  ],
  recommendation: 'yes',
  summary: 'Strong operational instincts and proven forecasting work, but needs a direct technical conversation on the real-time requirement and the dbt gap before moving forward.',
};

// ---------------------------------------------------------------------------
// Resume Recall demo. Candidate recalling their resume before a product
// manager interview at a logistics tech company.
// ---------------------------------------------------------------------------

export const DEMO_RESUME_RECALL: ResumeRecall = {
  role: 'Senior Product Manager, Last-Mile Logistics',
  resumeHighlights: [
    'Led the self-serve onboarding redesign at Northwind that cut time-to-first-shipment from 9 days to 3.',
    'Owned the carrier rate negotiation module - a 1.2M cost avoidance that you quantified yourself.',
    'Ran a 6-person squad across engineering, design, and ops for 18 months.',
    'You listed "Certified Scrum Product Owner" - make sure you can speak to it; it is on there.',
    'Gap to remember: your resume says "data-driven" but lists no specific analytics tools. They will ask.',
  ],
  alignedStrengths: [
    'The JD says "reduce friction in the last-mile handoff" - your onboarding work is the exact proof point. Lead with it.',
    'They want someone who can talk to carriers and ops teams. Your carrier module shows you have done it.',
    'Cross-functional squad leadership maps directly to their "own the roadmap with engineering" requirement.',
  ],
  likelyGaps: [
    'The JD mentions "route optimization algorithms" - your resume has no technical routing work. Prepare to address this.',
    'They are a Series B company. Your entire background is in late-stage. Expect a question about working without resources.',
    '"International logistics" appears twice in the JD. You have no international exposure on your resume.',
  ],
  talkingPoints: [
    'When they ask about impact: "At Northwind I cut time-to-first-shipment from nine days to three, which was the top driver of our NRR improvement in Q3."',
    'When they ask about data: "I partnered closely with our data team and owned the product metrics, including a cost-avoidance model that surfaced 1.2 million in carrier savings."',
    'When they ask about cross-functional leadership: "I ran a six-person squad for a year and a half. The hardest thing I did was hold the line on scope when ops wanted to expand the carrier module mid-sprint."',
  ],
  watchOut: 'Do not claim you are a technical PM. Your resume has no technical depth and they will find it in five minutes. Frame yourself as deeply data-informed and technically fluent, not a hands-on builder.',
};

export const DEMO_CAPTURE_DOC: CaptureResult = {
  kind: 'document',
  title: 'PG&E statement, the parts that matter',
  summary: 'Amount due is 142.38 USD by October 3. Autopay is off, so this one needs a manual payment.',
  items: [],
  total: 0,
  currency: 'USD',
  fields: [
    { key: 'Amount due', value: '142.38 USD' },
    { key: 'Due date', value: 'October 3, 2024' },
    { key: 'Billing period', value: 'Aug 28 to Sep 27, 2024' },
    { key: 'Account number', value: 'Ending in 4471' },
    { key: 'Autopay', value: 'Off' },
    { key: 'Customer service', value: '1-800-743-5000' },
  ],
};
