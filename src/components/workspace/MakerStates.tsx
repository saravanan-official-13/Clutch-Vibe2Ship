import type { ReactNode } from 'react';
import { Warning } from '@phosphor-icons/react';
import { Button, Skeleton } from '../ui/primitives';

export function RunEmpty({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-3 text-accent">
          {icon}
        </div>
        <h3 className="mt-5 text-lg font-semibold text-text">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

export function RunLoading({ label, lines = 5 }: { label: string; lines?: number }) {
  return (
    <div className="p-6" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        <span className="text-sm text-muted">{label}</span>
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-full" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4" />
        ))}
      </div>
    </div>
  );
}

export function RunError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="max-w-sm text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-3 text-danger">
          <Warning size={26} weight="duotone" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-text">That agent stalled.</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {message || 'Could not reach Gemini. Check your API key or try again.'}
        </p>
        {onRetry && (
          <div className="mt-6 flex justify-center">
            <Button variant="subtle" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
