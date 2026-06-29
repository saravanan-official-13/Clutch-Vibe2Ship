import { useRef, useState } from 'react';
import {
  ArrowCounterClockwise,
  DownloadSimple,
  FileText,
  Image as ImageIcon,
  Receipt,
  UploadSimple,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useStore } from '../../store';
import { Button } from '../ui/primitives';
import { RunError, RunLoading } from './MakerStates';
import { downloadText } from '../../lib/utils';
import type { CaptureKind, CaptureResult } from '../../types';
import type { CaptureImage } from '../../services/agents';

export function CaptureView() {
  const capture = useStore((s) => s.capture);
  const runCapture = useStore((s) => s.runCapture);

  if (capture.status === 'running') return <RunLoading label="Capture is reading the image with Gemini Vision..." lines={5} />;
  if (capture.status === 'error') return <RunError message={capture.error} onRetry={() => runCapture('receipts')} />;
  if (capture.status === 'idle' || !capture.data) return <CaptureEmpty onRun={runCapture} />;

  return <CaptureResultView data={capture.data} onReset={runCapture} />;
}

function CaptureEmpty({ onRun }: { onRun: (kind: CaptureKind, image?: CaptureImage) => void }) {
  const [kind, setKind] = useState<CaptureKind>('receipts');
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.split(',')[1] || '';
      if (base64) onRun(kind, { mimeType: f.type || 'image/jpeg', data: base64 });
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="grid h-full place-items-center p-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-3 text-accent">
          <Receipt size={26} weight="duotone" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-text">Turn a photo into data.</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Snap a pile of receipts or a form. Gemini Vision reads it and hands back clean, structured rows
          you can submit. No key on hand? Use the sample.
        </p>

        <div className="mt-5 flex justify-center gap-2">
          <KindButton active={kind === 'receipts'} onClick={() => setKind('receipts')} icon={<Receipt size={14} weight="bold" />}>
            Receipts
          </KindButton>
          <KindButton active={kind === 'document'} onClick={() => setKind('document')} icon={<FileText size={14} weight="bold" />}>
            Document
          </KindButton>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} aria-label="Upload an image" />

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={() => fileRef.current?.click()}>
            <UploadSimple size={16} weight="bold" />
            Upload a photo
          </Button>
          <Button variant="outline" onClick={() => onRun(kind)}>
            <ImageIcon size={16} weight="bold" />
            Use the sample
          </Button>
        </div>
      </div>
    </div>
  );
}

function KindButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ' +
        (active ? 'border-accent text-accent' : 'border-line text-muted hover:text-text')
      }
    >
      {icon}
      {children}
    </button>
  );
}

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function CaptureResultView({
  data,
  onReset,
}: {
  data: CaptureResult;
  onReset: (kind: CaptureKind, image?: CaptureImage) => void;
}) {
  const exportCsv = () => {
    if (data.kind === 'receipts') {
      const rows = [
        ['Date', 'Merchant', 'Category', 'Amount'],
        ...data.items.map((it) => [it.date, it.label, it.category, String(it.amount)]),
        ['', '', 'Total', String(data.total)],
      ];
      downloadText('expense-report.csv', rows.map((r) => r.join(',')).join('\n'));
    } else {
      const rows = [['Field', 'Value'], ...data.fields.map((f) => [f.key, f.value])];
      downloadText('captured-fields.csv', rows.map((r) => r.join(',')).join('\n'));
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-text">{data.title}</h2>
          <p className="mt-1 text-xs leading-snug text-muted">{data.summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onReset(data.kind)} className="h-9 px-2.5">
            <ArrowCounterClockwise size={15} weight="bold" />
          </Button>
          <Button variant="subtle" size="sm" onClick={exportCsv}>
            <DownloadSimple size={15} weight="bold" />
            CSV
          </Button>
        </div>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        {data.kind === 'receipts' ? (
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-semibold">Item</th>
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-line last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-text">{it.label}</div>
                      <div className="tabular text-xs text-muted">{it.date}</div>
                    </td>
                    <td className="px-3 py-3 text-muted">{it.category}</td>
                    <td className="tabular px-4 py-3 text-right font-medium text-text">
                      {money(it.amount, data.currency)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]">
                  <td className="px-4 py-3 text-sm font-semibold text-text" colSpan={2}>
                    Total
                  </td>
                  <td className="tabular px-4 py-3 text-right text-sm font-bold text-accent">
                    {money(data.total, data.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <dl className="space-y-2">
            {data.fields.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface-2 px-4 py-3"
              >
                <dt className="text-xs uppercase tracking-wide text-muted">{f.key}</dt>
                <dd className="min-w-0 flex-1 text-right text-sm font-medium text-text">{f.value}</dd>
              </motion.div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
