import { Skeleton } from "@/components/ui/skeleton";

export default function OutboundDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading document">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
