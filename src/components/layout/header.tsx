import Link from 'next/link';
import ThemeToggle from '@/components/theme-toggle';

export default function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center bg-transparent px-4 pt-3 sm:pt-4 lg:px-10">
      <nav
        aria-label="Main"
        className="flex w-full max-w-full items-center justify-between gap-2 sm:w-auto sm:justify-center sm:gap-3"
      >
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-card py-1.5 pl-4 pr-4 shadow-sm transition-colors hover:bg-muted/90 sm:py-2 sm:pl-5 sm:pr-5"
          aria-label="scribverse home"
        >
          <img
            src="/logo_light_mode.svg"
            alt=""
            width={832}
            height={174}
            className="h-6 w-auto dark:hidden"
            decoding="async"
          />
          <img
            src="/logo_dark_mode.svg"
            alt=""
            width={832}
            height={174}
            className="hidden h-6 w-auto dark:block"
            decoding="async"
          />
        </Link>
        <div className="flex shrink-0 items-center justify-center rounded-full bg-card p-1.5 shadow-sm sm:p-2">
          <ThemeToggle embedded />
        </div>
      </nav>
    </header>
  );
}
