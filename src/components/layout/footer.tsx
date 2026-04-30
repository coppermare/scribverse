'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Footer() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  return (
    <footer className="bg-transparent">
      <div
        className={cn(
          'mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-8 text-sm lg:px-10',
          isHome
            ? 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]'
            : 'text-foreground dark:text-white',
        )}
      >
        <span>© {new Date().getFullYear()} scribverse</span>
        <Link
          href="/privacy"
          className={cn(
            'underline-offset-4 hover:underline',
            isHome ? 'text-white hover:text-white/90' : 'text-inherit dark:hover:text-white/90',
          )}
        >
          Privacy
        </Link>
      </div>
    </footer>
  );
}
