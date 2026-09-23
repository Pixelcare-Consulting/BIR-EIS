import { Skeleton } from "@/components/ui/skeleton";

export default function OutboundLoading() {
  return (
    <div className="space-y-6 lg:space-y-7" aria-busy="true" aria-label="Loading outbound">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="space-y-2 rounded-2xl border border-border/60 bg-card p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
