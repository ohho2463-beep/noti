export default function ProtectedLoading() {
  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      <div className="hidden w-56 shrink-0 border-r border-border md:block">
        <div className="flex h-full flex-col gap-3 p-3">
          <div className="h-9 animate-pulse rounded-md bg-muted" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted/70" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <div className="h-8 w-8 animate-pulse rounded-md bg-muted md:hidden" />
          <div className="h-6 w-24 animate-pulse rounded-md bg-muted md:hidden" />
          <div className="ml-auto h-9 w-40 animate-pulse rounded-full bg-muted" />
        </div>
        <main className="flex-1 space-y-4 p-4 md:p-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-muted/60" />
          <div className="h-24 animate-pulse rounded-lg bg-muted/40" />
        </main>
      </div>
    </div>
  );
}
