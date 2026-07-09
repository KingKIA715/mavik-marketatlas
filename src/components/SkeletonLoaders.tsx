import { Skeleton } from "@/components/ui/skeleton";

export function MetalRowSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-alt px-4 py-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function IndexCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-3 w-12" />
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}

export function MoversListSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <Skeleton className="mb-3 h-4 w-24" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FuelTileSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-7 w-24" />
      <Skeleton className="mt-1 h-2.5 w-12" />
    </div>
  );
}

export function CurrencyTileSkeleton() {
  return (
    <div className="flex flex-col gap-1 border-b border-white/10 pb-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-20 self-end" />
    </div>
  );
}

export function CryptoCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-2.5 w-10" />
        </div>
      </div>
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-2 h-3 w-20" />
    </div>
  );
}
