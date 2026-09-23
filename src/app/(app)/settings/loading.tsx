import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-5"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
      <div className="space-y-3 pt-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-2/3 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-10 w-36 rounded-md" />
    </div>
  );
}
