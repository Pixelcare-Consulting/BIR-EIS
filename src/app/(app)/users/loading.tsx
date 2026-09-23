import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-6 lg:space-y-7" aria-busy="true" aria-label="Loading users">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 grid grid-cols-4 gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-24" />
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
