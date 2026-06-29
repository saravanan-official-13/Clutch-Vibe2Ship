import { stockImageUrl } from './visuals';
import type { Deck, Slide, SlideLayout } from '../types';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const SCOPES =
  'https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive.file';
const API = 'https://slides.googleapis.com/v1/presentations';

// Slide canvas dimensions in EMU (English Metric Units). 1 in = 914400 EMU.
const SW = 9144000; // slide width  (10 in)
const SH = 5143500; // slide height (5.625 in)
const M = 457200;   // 0.5 in margin

// Google Identity Services type declaration (no @types/google-one-tap needed).
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (r: { access_token: string; error?: string }) => void;
          }): { requestAccessToken(): void };
        };
      };
    };
  }
}

export function isSlidesConfigured(): boolean {
  return !!CLIENT_ID;
}

// ---------------------------------------------------------------------------
// OAuth token acquisition via Google Identity Services.
// ---------------------------------------------------------------------------

async function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Google Identity Services'));
    document.head.appendChild(s);
  });
}

async function getToken(): Promise<string> {
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (r) => (r.error ? reject(new Error(r.error)) : resolve(r.access_token)),
    });
    client.requestAccessToken();
  });
}

// ---------------------------------------------------------------------------
// Slides REST API helpers.
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;

async function apiGet(token: string, url: string): Promise<Json> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Slides GET ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Json>;
}

async function apiPost(token: string, url: string, body: unknown): Promise<Json> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Slides POST ${res.status}: ${await res.text()}`);
  return res.json() as Promise<Json>;
}

// ---------------------------------------------------------------------------
// Bold markup parser: "Revenue grew **18.4%** to 7.2M" -> plain text + ranges.
// ---------------------------------------------------------------------------

interface BoldRange { start: number; end: number; }

function parseBoldRanges(text: string): { plain: string; ranges: BoldRange[] } {
  let plain = '';
  const ranges: BoldRange[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    plain += text.slice(last, m.index);
    const start = plain.length;
    plain += m[1];
    ranges.push({ start, end: plain.length });
    last = m.index + m[0].length;
  }
  plain += text.slice(last);
  return { plain, ranges };
}

// ---------------------------------------------------------------------------
// Request builders.
// ---------------------------------------------------------------------------

let _counter = 0;
function gid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${(++_counter).toString(36)}`;
}

function textBox(id: string, pageId: string, x: number, y: number, w: number, h: number): Json {
  return {
    createShape: {
      objectId: id,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: pageId,
        size: { width: { magnitude: w, unit: 'EMU' }, height: { magnitude: h, unit: 'EMU' } },
        transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: 'EMU' },
      },
    },
  };
}

function insertText(id: string, text: string): Json {
  return { insertText: { objectId: id, insertionIndex: 0, text } };
}

function textStyle(id: string, style: Json, fields: string): Json {
  return { updateTextStyle: { objectId: id, style, fields, textRange: { type: 'ALL' } } };
}

function textStyleRange(id: string, style: Json, fields: string, start: number, end: number): Json {
  return {
    updateTextStyle: {
      objectId: id,
      style,
      fields,
      textRange: { type: 'FIXED_RANGE', startIndex: start, endIndex: end },
    },
  };
}

function paraStyle(id: string, style: Json, fields: string): Json {
  return { updateParagraphStyle: { objectId: id, style, fields, textRange: { type: 'ALL' } } };
}

function solidFill(r: number, g: number, b: number): Json {
  return { solidFill: { color: { rgbColor: { red: r, green: g, blue: b } } } };
}

function fgColor(r: number, g: number, b: number): Json {
  return { foregroundColor: { opaqueColor: { rgbColor: { red: r, green: g, blue: b } } } };
}

function fontSize(pt: number): Json {
  return { fontSize: { magnitude: pt, unit: 'PT' } };
}

function imgRequest(id: string, pageId: string, url: string, x: number, y: number, w: number, h: number): Json {
  return {
    createImage: {
      objectId: id,
      url,
      elementProperties: {
        pageObjectId: pageId,
        size: { width: { magnitude: w, unit: 'EMU' }, height: { magnitude: h, unit: 'EMU' } },
        transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: y, unit: 'EMU' },
      },
    },
  };
}

/** Build a body text box with bullets (joined by \n) and apply bold ranges. */
function bulletBox(pageId: string, x: number, y: number, w: number, h: number, bullets: string[]): Json[] {
  const id = gid('b');
  const parts = bullets.map(parseBoldRanges);
  const text = parts.map((p) => p.plain).join('\n');
  const reqs: Json[] = [
    textBox(id, pageId, x, y, w, h),
    insertText(id, text),
    textStyle(id, fontSize(17), 'fontSize'),
  ];
  let offset = 0;
  for (const part of parts) {
    for (const range of part.ranges) {
      reqs.push(textStyleRange(id, { bold: true }, 'bold', offset + range.start, offset + range.end));
    }
    offset += part.plain.length + 1; // +1 for \n separator
  }
  return reqs;
}

function accentBg(pageId: string, ar: number, ag: number, ab: number): Json {
  return {
    updatePageProperties: {
      objectId: pageId,
      pageProperties: { pageBackgroundFill: solidFill(ar, ag, ab) },
      fields: 'pageBackgroundFill',
    },
  };
}

// ---------------------------------------------------------------------------
// Per-layout request builders.
// ---------------------------------------------------------------------------

function buildSlideRequests(slide: Slide, slideId: string, ar: number, ag: number, ab: number): Json[] {
  const layout: SlideLayout = slide.layout || 'bullets';
  const reqs: Json[] = [
    { createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: 'BLANK' } } },
  ];

  const WHITE = fgColor(1, 1, 1);

  switch (layout) {
    case 'cover': {
      reqs.push(accentBg(slideId, ar, ag, ab));
      const tid = gid('t');
      reqs.push(textBox(tid, slideId, 0, SH * 0.28, SW, SH * 0.33));
      reqs.push(insertText(tid, slide.title));
      reqs.push(textStyle(tid, { bold: true, ...WHITE, ...fontSize(44) }, 'bold,foregroundColor,fontSize'));
      reqs.push(paraStyle(tid, { alignment: 'CENTER' }, 'alignment'));
      if (slide.subtitle) {
        const sid = gid('s');
        reqs.push(textBox(sid, slideId, M, SH * 0.62, SW - M * 2, SH * 0.14));
        reqs.push(insertText(sid, slide.subtitle));
        reqs.push(textStyle(sid, { ...WHITE, ...fontSize(20) }, 'foregroundColor,fontSize'));
        reqs.push(paraStyle(sid, { alignment: 'CENTER' }, 'alignment'));
      }
      break;
    }

    case 'section': {
      reqs.push(accentBg(slideId, ar, ag, ab));
      const tid = gid('t');
      reqs.push(textBox(tid, slideId, 0, SH * 0.33, SW, SH * 0.33));
      reqs.push(insertText(tid, slide.title));
      reqs.push(textStyle(tid, { bold: true, ...WHITE, ...fontSize(40) }, 'bold,foregroundColor,fontSize'));
      reqs.push(paraStyle(tid, { alignment: 'CENTER' }, 'alignment'));
      break;
    }

    case 'stat': {
      const titleId = gid('t');
      reqs.push(textBox(titleId, slideId, M, M / 2, SW - M * 2, 900000));
      reqs.push(insertText(titleId, slide.title));
      reqs.push(textStyle(titleId, { bold: true, ...fontSize(26) }, 'bold,fontSize'));
      if (slide.stat) {
        const valId = gid('sv');
        const labelId = gid('sl');
        reqs.push(textBox(valId, slideId, 0, SH * 0.28, SW, SH * 0.35));
        reqs.push(insertText(valId, slide.stat.value));
        reqs.push(textStyle(valId, { bold: true, foregroundColor: { opaqueColor: { rgbColor: { red: ar, green: ag, blue: ab } } }, ...fontSize(80) }, 'bold,foregroundColor,fontSize'));
        reqs.push(paraStyle(valId, { alignment: 'CENTER' }, 'alignment'));
        reqs.push(textBox(labelId, slideId, M * 2, SH * 0.64, SW - M * 4, SH * 0.14));
        reqs.push(insertText(labelId, slide.stat.label));
        reqs.push(textStyle(labelId, fontSize(18), 'fontSize'));
        reqs.push(paraStyle(labelId, { alignment: 'CENTER' }, 'alignment'));
      }
      // Optional supporting bullets
      if (slide.bullets.length > 0) {
        const bx = M * 3, by = SH * 0.79, bw = SW - M * 6, bh = SH * 0.18;
        reqs.push(...bulletBox(slideId, bx, by, bw, bh, slide.bullets));
      }
      break;
    }

    case 'quote': {
      const qid = gid('q');
      const quoteText = slide.quote || slide.title;
      reqs.push(textBox(qid, slideId, M, M * 2, SW - M * 2, SH * 0.62));
      reqs.push(insertText(qid, `"${quoteText}"`));
      reqs.push(textStyle(qid, { italic: true, ...fontSize(28) }, 'italic,fontSize'));
      reqs.push(paraStyle(qid, { alignment: 'CENTER' }, 'alignment'));
      if (slide.attribution) {
        const aid = gid('a');
        reqs.push(textBox(aid, slideId, M, SH * 0.76, SW - M * 2, SH * 0.14));
        reqs.push(insertText(aid, `- ${slide.attribution}`));
        reqs.push(textStyle(aid, fontSize(16), 'fontSize'));
        reqs.push(paraStyle(aid, { alignment: 'CENTER' }, 'alignment'));
      }
      break;
    }

    case 'closing': {
      reqs.push(accentBg(slideId, ar, ag, ab));
      const tid = gid('t');
      reqs.push(textBox(tid, slideId, 0, SH * 0.18, SW, SH * 0.3));
      reqs.push(insertText(tid, slide.title));
      reqs.push(textStyle(tid, { bold: true, ...WHITE, ...fontSize(38) }, 'bold,foregroundColor,fontSize'));
      reqs.push(paraStyle(tid, { alignment: 'CENTER' }, 'alignment'));
      if (slide.bullets.length > 0) {
        const bid = gid('b');
        const text = slide.bullets.map((b) => parseBoldRanges(b).plain).join('\n');
        reqs.push(textBox(bid, slideId, M * 2, SH * 0.52, SW - M * 4, SH * 0.38));
        reqs.push(insertText(bid, text));
        reqs.push(textStyle(bid, { ...WHITE, ...fontSize(18) }, 'foregroundColor,fontSize'));
        reqs.push(paraStyle(bid, { alignment: 'CENTER' }, 'alignment'));
      }
      break;
    }

    case 'image-right': {
      const halfW = SW / 2 - M / 2;
      const titleId = gid('t');
      reqs.push(textBox(titleId, slideId, M, M / 2, halfW - M, 900000));
      reqs.push(insertText(titleId, slide.title));
      reqs.push(textStyle(titleId, { bold: true, ...fontSize(26) }, 'bold,fontSize'));
      reqs.push(...bulletBox(slideId, M, M / 2 + 950000, halfW - M, SH - M - 950000, slide.bullets));
      const imgSrc = stockImageUrl(slide.imageSeed || slide.imageQuery || slide.title);
      reqs.push(imgRequest(gid('i'), slideId, imgSrc, SW / 2 + M / 2, 0, halfW, SH));
      break;
    }

    case 'image-full': {
      const imgSrc = stockImageUrl(slide.imageSeed || slide.imageQuery || slide.title);
      reqs.push(imgRequest(gid('i'), slideId, imgSrc, 0, 0, SW, SH));
      const tid = gid('t');
      reqs.push(textBox(tid, slideId, M, SH * 0.68, SW - M * 2, SH * 0.24));
      reqs.push(insertText(tid, slide.title));
      reqs.push(textStyle(tid, { bold: true, ...WHITE, ...fontSize(34) }, 'bold,foregroundColor,fontSize'));
      break;
    }

    default: {
      // 'bullets' - accent left rail + standard title/body
      const railId = gid('r');
      reqs.push({
        createShape: {
          objectId: railId,
          shapeType: 'RECTANGLE',
          elementProperties: {
            pageObjectId: slideId,
            size: { width: { magnitude: M / 4, unit: 'EMU' }, height: { magnitude: SH, unit: 'EMU' } },
            transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: 'EMU' },
          },
        },
      });
      reqs.push({
        updateShapeProperties: {
          objectId: railId,
          shapeProperties: { shapeBackgroundFill: solidFill(ar, ag, ab) },
          fields: 'shapeBackgroundFill',
        },
      });
      const titleId = gid('t');
      reqs.push(textBox(titleId, slideId, M, M / 2, SW - M * 2, 900000));
      reqs.push(insertText(titleId, slide.title));
      reqs.push(textStyle(titleId, { bold: true, ...fontSize(28) }, 'bold,fontSize'));
      reqs.push(...bulletBox(slideId, M, M / 2 + 950000, SW - M * 2, SH - M - 950000, slide.bullets));
      break;
    }
  }

  return reqs;
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export interface SlidesResult {
  presentationId: string;
  embedUrl: string;
  editUrl: string;
}

export async function createGoogleSlides(deck: Deck): Promise<SlidesResult> {
  const token = await getToken();

  // Create the presentation (Google creates one default slide).
  const pres = await apiPost(token, API, { title: deck.title }) as {
    presentationId: string;
    slides: Array<{ objectId: string }>;
  };
  const { presentationId } = pres;

  // Fetch to get the default slide objectId so we can delete it.
  const fetched = await apiGet(token, `${API}/${presentationId}`) as {
    slides: Array<{ objectId: string }>;
  };

  const allRequests: Json[] = [];

  // Delete the default blank slide.
  if (fetched.slides?.[0]) {
    allRequests.push({ deleteObject: { objectId: fetched.slides[0].objectId } });
  }

  // Parse accent hex (#rrggbb) to 0-1 RGB.
  const hex = deck.accent.replace('#', '');
  const ar = parseInt(hex.slice(0, 2), 16) / 255;
  const ag = parseInt(hex.slice(2, 4), 16) / 255;
  const ab = parseInt(hex.slice(4, 6), 16) / 255;

  _counter = 0; // reset per-presentation counter
  for (let i = 0; i < deck.slides.length; i++) {
    const slideId = `sl${i}_${Date.now().toString(36)}`;
    allRequests.push(...buildSlideRequests(deck.slides[i], slideId, ar, ag, ab));
  }

  await apiPost(token, `${API}/${presentationId}:batchUpdate`, { requests: allRequests });

  return {
    presentationId,
    embedUrl: `https://docs.google.com/presentation/d/${presentationId}/embed`,
    editUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`,
  };
}
