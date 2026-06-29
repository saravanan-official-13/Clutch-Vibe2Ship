import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
  DownloadSimple,
  GoogleLogo,
  Image,
  PresentationChart,
  SpinnerGap,
  WarningCircle,
} from '@phosphor-icons/react';
import { useStore } from '../../store';
import { Button } from '../ui/primitives';
import { RunError, RunLoading } from './MakerStates';
import { cn, downloadText } from '../../lib/utils';
import { isSlidesConfigured } from '../../services/googleSlides';
import { stockImageUrl } from '../../services/visuals';
import type { Deck, Slide, SlideLayout } from '../../types';

// ---------------------------------------------------------------------------
// Bold parser: **text** -> <strong>
// ---------------------------------------------------------------------------

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      p
    ),
  );
}

// ---------------------------------------------------------------------------
// Slide layouts
// ---------------------------------------------------------------------------

interface SlideProps {
  slide: Slide;
  accent: string;
  imgUrl: string | null;
  onGenerate?: () => void;
  generating?: boolean;
}

function ImagePanel({ url, alt, onGenerate, generating }: {
  url: string | null;
  alt: string;
  onGenerate?: () => void;
  generating?: boolean;
}) {
  const [err, setErr] = useState(false);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-surface-3">
      {url && !err ? (
        <img
          key={url}
          src={url}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-surface-3 to-surface-2" />
      )}
      {onGenerate && (
        <button
          onClick={onGenerate}
          disabled={generating}
          className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-xs font-medium text-text backdrop-blur transition-colors hover:bg-surface-2 disabled:opacity-60"
        >
          {generating ? (
            <SpinnerGap size={12} className="animate-spin" />
          ) : (
            <Image size={12} weight="duotone" />
          )}
          {generating ? 'Generating...' : 'Generate with Imagen'}
        </button>
      )}
    </div>
  );
}

function CoverSlide({ slide, accent, imgUrl, onGenerate, generating }: SlideProps) {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl" style={{ backgroundColor: accent }}>
      {imgUrl && (
        <img
          src={imgUrl}
          alt={slide.title}
          className="absolute inset-0 h-full w-full object-cover opacity-20"
          onError={() => {}}
        />
      )}
      <div className="relative z-10 px-10 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-white drop-shadow">{slide.title}</h2>
        {slide.subtitle && (
          <p className="mt-3 text-lg text-white/80">{slide.subtitle}</p>
        )}
      </div>
      {onGenerate && (
        <button
          onClick={onGenerate}
          disabled={generating}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs text-white backdrop-blur disabled:opacity-60"
        >
          {generating ? <SpinnerGap size={12} className="animate-spin" /> : <Image size={12} />}
          {generating ? 'Generating...' : 'Generate image'}
        </button>
      )}
    </div>
  );
}

function StatSlide({ slide, accent }: SlideProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-surface-2 p-8">
      <div className="flex items-start gap-3">
        <div className="h-full w-1.5 shrink-0 self-stretch rounded-full" style={{ backgroundColor: accent }} />
        <h3 className="text-xl font-semibold text-text">{slide.title}</h3>
      </div>
      {slide.stat && (
        <div className="flex flex-1 flex-col items-center justify-center">
          <span className="text-7xl font-bold tracking-tight" style={{ color: accent }}>
            {slide.stat.value}
          </span>
          <span className="mt-3 text-center text-base text-muted">{slide.stat.label}</span>
        </div>
      )}
      {slide.bullets.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line pt-4">
          {slide.bullets.map((b, bi) => (
            <li key={bi} className="flex gap-2 text-sm leading-relaxed text-muted">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
              <span>{parseBold(b)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuoteSlide({ slide, accent }: SlideProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-line bg-surface-2 p-10">
      <div className="w-12 h-1 rounded-full mb-6" style={{ backgroundColor: accent }} />
      <p className="text-center text-2xl font-medium italic leading-relaxed text-text">
        "{slide.quote || slide.title}"
      </p>
      {slide.attribution && (
        <p className="mt-6 text-sm text-muted">- {slide.attribution}</p>
      )}
    </div>
  );
}

function SectionSlide({ slide, accent }: SlideProps) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl" style={{ backgroundColor: accent }}>
      <h2 className="px-10 text-center text-4xl font-bold tracking-tight text-white">{slide.title}</h2>
    </div>
  );
}

function ClosingSlide({ slide, accent }: SlideProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl" style={{ backgroundColor: accent }}>
      <div className="flex flex-1 items-center justify-center">
        <h2 className="px-10 text-center text-4xl font-bold text-white">{slide.title}</h2>
      </div>
      {slide.bullets.length > 0 && (
        <ul className="border-t border-white/20 px-8 py-5 space-y-2">
          {slide.bullets.map((b, bi) => (
            <li key={bi} className="flex gap-2 text-base leading-relaxed text-white/90">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
              <span>{parseBold(b)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ImageRightSlide({ slide, accent, imgUrl, onGenerate, generating }: SlideProps) {
  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-line bg-surface-2">
      {/* Left: title + bullets */}
      <div className="flex w-1/2 flex-col p-7">
        <div className="flex gap-3">
          <div className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          <h3 className="text-xl font-semibold leading-snug text-text">{slide.title}</h3>
        </div>
        <ul className="mt-5 space-y-3">
          {slide.bullets.map((b, bi) => (
            <li key={bi} className="flex gap-2 text-sm leading-relaxed text-text">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <span>{parseBold(b)}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Right: image */}
      <div className="w-1/2 p-2">
        <ImagePanel url={imgUrl} alt={slide.imageQuery || slide.title} onGenerate={onGenerate} generating={generating} />
      </div>
    </div>
  );
}

function ImageFullSlide({ slide, accent, imgUrl, onGenerate, generating }: SlideProps) {
  return (
    <div className="relative flex h-full overflow-hidden rounded-2xl bg-surface-3">
      {imgUrl ? (
        <img src={imgUrl} alt={slide.imageQuery || slide.title} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-surface-3 to-surface-2" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-7 pt-14">
        <h3 className="text-2xl font-bold text-white">{slide.title}</h3>
      </div>
      {onGenerate && (
        <button
          onClick={onGenerate}
          disabled={generating}
          className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white backdrop-blur disabled:opacity-60"
        >
          {generating ? <SpinnerGap size={12} className="animate-spin" /> : <Image size={12} />}
          {generating ? 'Generating...' : 'Generate with Imagen'}
        </button>
      )}
    </div>
  );
}

function BulletsSlide({ slide, accent }: SlideProps) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface-2">
      <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl" style={{ backgroundColor: accent }} />
      <div className="flex h-full flex-col p-8 pl-10">
        <h3 className="text-2xl font-semibold tracking-tight text-text">{slide.title}</h3>
        <ul className="mt-6 space-y-4">
          {slide.bullets.map((b, bi) => (
            <li key={bi} className="flex gap-3 text-base leading-relaxed text-text">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <span>{parseBold(b)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout dispatcher
// ---------------------------------------------------------------------------

function SlideStage({ slide, accent, onGenerate, generating }: {
  slide: Slide;
  accent: string;
  onGenerate?: () => void;
  generating?: boolean;
}) {
  const layout: SlideLayout = slide.layout || 'bullets';
  const imgUrl = slide.imageData ?? (slide.imageSeed ? stockImageUrl(slide.imageSeed) : null);
  const props: SlideProps = { slide, accent, imgUrl, onGenerate, generating };

  switch (layout) {
    case 'cover':      return <CoverSlide {...props} />;
    case 'stat':       return <StatSlide {...props} />;
    case 'quote':      return <QuoteSlide {...props} />;
    case 'section':    return <SectionSlide {...props} />;
    case 'closing':    return <ClosingSlide {...props} />;
    case 'image-right': return <ImageRightSlide {...props} />;
    case 'image-full': return <ImageFullSlide {...props} />;
    default:           return <BulletsSlide {...props} />;
  }
}

// ---------------------------------------------------------------------------
// Export bar
// ---------------------------------------------------------------------------

function ExportBar({ deck }: { deck: Deck }) {
  const slidesExport = useStore((s) => s.slidesExport);
  const createSlidesExport = useStore((s) => s.createSlidesExport);
  const configured = isSlidesConfigured();

  if (slidesExport.status === 'done' && slidesExport.embedUrl) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface-2">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
          <span className="flex items-center gap-2 text-sm font-medium text-text">
            <GoogleLogo size={15} weight="fill" className="text-blue-500" />
            Live in Google Slides
          </span>
          {slidesExport.editUrl && (
            <a
              href={slidesExport.editUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Open in Drive <ArrowSquareOut size={12} />
            </a>
          )}
        </div>
        <div className="aspect-video w-full">
          <iframe
            src={slidesExport.embedUrl}
            className="h-full w-full"
            allowFullScreen
            title="Google Slides preview"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3">
      <GoogleLogo size={18} weight="fill" className="shrink-0 text-blue-500" />
      {configured ? (
        <>
          <p className="flex-1 text-sm text-text">
            Build this deck in your Google Drive with one click.
          </p>
          <Button
            size="sm"
            onClick={createSlidesExport}
            disabled={slidesExport.status === 'running'}
          >
            {slidesExport.status === 'running' ? (
              <><SpinnerGap size={13} className="animate-spin" /> Creating...</>
            ) : (
              'Create in Google Slides'
            )}
          </Button>
          {slidesExport.status === 'error' && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <WarningCircle size={13} /> Failed
            </span>
          )}
        </>
      ) : (
        <>
          <p className="flex-1 text-sm text-muted">
            Add a Google OAuth Client ID to export this deck directly to your Drive.
          </p>
          <span className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-muted">
            Connect Google
          </span>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty + presenter
// ---------------------------------------------------------------------------

function DeckEmpty({ onBuild }: { onBuild: (topic: string, notes?: string) => void }) {
  const [topic, setTopic] = useState('Northwind Q3 board review');
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-3 text-accent">
          <PresentationChart size={26} weight="duotone" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-text">No deck yet.</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Tell the Deck Maker what you have to present. It returns a full styled deck with speaker notes.
        </p>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-5 w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-text outline-none focus:border-accent"
          aria-label="Deck topic"
        />
        <div className="mt-4 flex justify-center">
          <Button onClick={() => onBuild(topic)} disabled={!topic.trim()}>
            Build the deck
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeckPresenter({ deck }: { deck: Deck }) {
  const [i, setI] = useState(0);
  const generateDeckImage = useStore((s) => s.generateDeckImage);
  const deckImageGenerating = useStore((s) => s.deckImageGenerating);

  const slide = deck.slides[i];
  const total = deck.slides.length;
  const layout: SlideLayout = slide.layout || 'bullets';
  const hasImage = layout === 'image-right' || layout === 'image-full' || layout === 'cover';

  const exportMd = () => {
    const md = [
      `# ${deck.title}`,
      `_${deck.subtitle}_`,
      '',
      ...deck.slides.flatMap((s, idx) => [
        `## ${idx + 1}. ${s.title}`,
        ...s.bullets.map((b) => `- ${b.replace(/\*\*/g, '')}`),
        '',
        `> Speaker notes: ${s.notes}`,
        '',
      ]),
    ].join('\n');
    downloadText(`${deck.title.replace(/\s+/g, '-').toLowerCase()}.md`, md, 'text/markdown');
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-text">{deck.title}</h2>
          <p className="truncate text-xs text-muted">{deck.subtitle}</p>
        </div>
        <Button variant="subtle" size="sm" onClick={exportMd}>
          <DownloadSimple size={15} weight="bold" /> Export MD
        </Button>
      </div>

      {/* Slide stage */}
      <motion.div
        key={i}
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 min-h-[220px] flex-shrink-0"
        style={{ aspectRatio: '16/9' }}
      >
        <SlideStage
          slide={slide}
          accent={deck.accent}
          onGenerate={hasImage ? () => generateDeckImage(i) : undefined}
          generating={deckImageGenerating === i}
        />
      </motion.div>

      {/* Speaker notes */}
      <div className="mt-3 shrink-0 rounded-xl border border-line bg-surface px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Speaker notes</span>
        <p className="mt-1 text-sm leading-relaxed text-text">{slide.notes}</p>
      </div>

      {/* Nav */}
      <div className="mt-3 flex shrink-0 items-center justify-between">
        <button
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-2 text-sm text-muted transition-colors hover:text-text disabled:opacity-40"
        >
          <CaretLeft size={15} weight="bold" /> Prev
        </button>
        <div className="flex gap-1.5">
          {deck.slides.map((_, di) => (
            <button
              key={di}
              onClick={() => setI(di)}
              aria-label={`Go to slide ${di + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                di === i ? 'w-6 bg-accent' : 'w-1.5 bg-line-strong hover:bg-muted',
              )}
            />
          ))}
        </div>
        <button
          onClick={() => setI((v) => Math.min(total - 1, v + 1))}
          disabled={i === total - 1}
          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-2 text-sm text-muted transition-colors hover:text-text disabled:opacity-40"
        >
          Next <CaretRight size={15} weight="bold" />
        </button>
      </div>

      {/* Google Slides export */}
      <div className="shrink-0">
        <ExportBar deck={deck} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function DeckView() {
  const deck = useStore((s) => s.deck);
  const runDeck = useStore((s) => s.runDeck);

  if (deck.status === 'running') return <RunLoading label="Deck Maker is drafting your slides..." lines={6} />;
  if (deck.status === 'error') return <RunError message={deck.error} onRetry={() => runDeck('Northwind Q3 board review')} />;
  if (deck.status === 'idle' || !deck.data) return <DeckEmpty onBuild={runDeck} />;

  return <DeckPresenter deck={deck.data} />;
}
