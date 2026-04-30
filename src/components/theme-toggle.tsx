'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

type ThemeToggleProps = {
  /** Sit inside a parent bar (no own card / shadow). */
  embedded?: boolean;
};

export default function ThemeToggle({ embedded = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chip = embedded
    ? 'rounded-full border-0 bg-transparent shadow-none hover:bg-muted [&:disabled]:opacity-50'
    : 'rounded-full border-transparent bg-card shadow-sm hover:bg-muted [&:disabled]:opacity-50';

  const size = embedded ? 'icon-sm' : 'icon-xl';

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size={size}
        className={chip}
        aria-label="Toggle theme"
        disabled
      />
    );
  }

  const isDark = (resolvedTheme ?? theme) === 'dark';

  function applyTheme(next: 'light' | 'dark') {
    const doc = typeof document !== 'undefined' ? document : undefined;
    const vt = doc && 'startViewTransition' in doc && typeof doc.startViewTransition === 'function';
    if (vt) {
      doc.startViewTransition(() => {
        setTheme(next);
      });
    } else {
      setTheme(next);
    }
  }

  const iconClass = embedded ? 'size-4' : 'size-5';

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={chip}
      onClick={() => applyTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className={iconClass} /> : <Moon className={iconClass} />}
    </Button>
  );
}
