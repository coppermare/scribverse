'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'scribverse-notice-dismissed';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — skip banner
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Privacy notice"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:pb-5 lg:px-8"
    >
      <div className="flex w-full max-w-2xl items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg sm:items-center sm:gap-4 sm:px-5 sm:py-3.5">
        <p className="flex-1 text-sm text-muted-foreground">
          We store your theme preference in local storage. No tracking cookies.{' '}
          <Link
            href="/privacy"
            className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
          >
            Privacy policy
          </Link>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={dismiss}
          aria-label="Dismiss notice"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
