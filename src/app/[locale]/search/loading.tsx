export default function Loading() {
  return (
    <div className="site-container py-12 md:py-16" aria-busy="true">
      <div className="h-9 w-48 animate-pulse rounded bg-surface" />
      <div className="mt-6 h-12 w-full max-w-xl animate-pulse rounded-md bg-surface" />
      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-border">
            <div className="aspect-4/3 rounded-t-lg bg-surface" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-1/2 rounded bg-surface" />
              <div className="h-4 w-3/4 rounded bg-surface" />
              <div className="h-4 w-1/3 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
