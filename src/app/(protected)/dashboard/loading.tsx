export default function DashboardSegmentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border/50 bg-muted/30" />
        ))}
      </div>
      <div className="h-64 rounded-xl border border-border/50 bg-muted/20" />
    </div>
  );
}
