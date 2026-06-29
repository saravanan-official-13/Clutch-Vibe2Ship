import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

// Shape lock: buttons are pill, cards are rounded-2xl (16px), inputs are rounded-xl (12px).

type Variant = 'primary' | 'outline' | 'ghost' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-accent-bright text-accent-ink hover:brightness-110 shadow-[0_10px_30px_-12px_var(--accent)]',
  outline:
    'border border-line-strong text-text hover:border-accent hover:text-accent bg-transparent',
  ghost: 'text-muted hover:text-text hover:bg-surface-3',
  subtle: 'bg-surface-3 text-text hover:bg-surface-2 border border-line',
  danger: 'bg-transparent text-danger border border-line hover:border-danger',
};

const sizeClass: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[3.25rem] px-7 text-base',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-medium select-none',
        'transition-[transform,filter,background-color,color,border-color] duration-150',
        'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-surface-2',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Pill({
  children,
  className,
  tone = 'muted',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'muted' | 'accent' | 'danger' | 'ok';
}) {
  const tones: Record<string, string> = {
    muted: 'bg-surface-3 text-muted border-line',
    accent: 'bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] text-accent border-[color-mix(in_oklab,var(--accent)_30%,transparent)]',
    danger: 'bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-danger border-[color-mix(in_oklab,var(--danger)_30%,transparent)]',
    ok: 'bg-[color-mix(in_oklab,var(--ok)_14%,transparent)] text-ok border-[color-mix(in_oklab,var(--ok)_30%,transparent)]',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'tabular text-[11px] uppercase tracking-[0.22em] text-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-xl bg-surface-3', className)} />;
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="text-sm font-medium text-text">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-accent-bright text-accent-ink">
        <span className="text-base font-bold leading-none">C</span>
      </span>
      <span className="text-lg font-semibold tracking-tight text-text">Clutch</span>
    </span>
  );
}
