import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback shown while a workspace's entries are read from the file store.
 * Rendered inside a `<Suspense>` in `page.tsx` rather than via a segment
 * `loading.tsx` — a segment-level loading boundary flushes the response shell
 * before `notFound()` runs, which would turn an unknown workspace into a 200.
 */
export function TimelineSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-full sm:max-w-xs" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      {[0, 1, 2].map((index) => (
        <div key={index} className="relative pl-8 sm:pl-10">
          <div className="rounded-xl border p-6">
            <div className="flex gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="mt-4 h-6 w-3/5" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
