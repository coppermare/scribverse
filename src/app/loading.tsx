import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 lg:px-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-5 w-full max-w-lg" />
        <Skeleton className="mt-6 h-11 w-full max-w-xl" />
      </div>
    </div>
  );
}
