'use client';

import { usePathname } from 'next/navigation';

export default function PageBackground() {
  const pathname = usePathname();
  if (pathname !== '/') return null;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-bottom bg-no-repeat [transform:translateZ(0)] dark:hidden"
        style={{ backgroundImage: 'url(/hero/bg_day.webp)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 hidden bg-cover bg-bottom bg-no-repeat [transform:translateZ(0)] dark:block"
        style={{ backgroundImage: 'url(/hero/bg_night.webp)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] bg-background/48 dark:bg-background/52 [transform:translateZ(0)]"
      />
    </>
  );
}
