import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton shown while the workspace is read from the file store. */
export default function WorkspaceLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-20 sm:px-6">
      <div className="py-6">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="rounded-2xl border p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      <div className="mt-8 space-y-6">
        {[0, 1, 2].map((index) => (
          <div key={index} className="rounded-xl border p-6">
            <div className="flex gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="mt-4 h-6 w-3/5" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
          </div>
        ))}
      </div>
    </main>
  );
}
