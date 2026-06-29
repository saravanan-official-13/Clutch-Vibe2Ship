import { Moon, Sun } from '@phosphor-icons/react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useStore((s) => s.theme);
  const toggle = useStore((s) => s.toggleTheme);
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        'grid h-10 w-10 place-items-center rounded-full border border-line text-muted',
        'transition-colors hover:text-text hover:border-line-strong active:scale-[0.96]',
        className,
      )}
    >
      {theme === 'dark' ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
    </button>
  );
}
