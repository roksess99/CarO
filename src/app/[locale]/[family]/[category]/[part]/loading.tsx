export default function Loading() {
  return (
    <div className="site-container py-8 md:py-12" aria-busy="true">
      <div className="h-4 w-40 animate-pulse rounded bg-surface" />
      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-12">
        <div className="aspect-4/3 w-full animate-pulse rounded-lg bg-surface lg:flex-1" />
        <div className="lg:max-w-md lg:flex-1">
          <div className="h-3 w-24 animate-pulse rounded bg-surface" />
          <div className="mt-3 h-10 w-full animate-pulse rounded bg-surface" />
          <div className="mt-6 h-9 w-32 animate-pulse rounded bg-surface" />
          <div className="mt-8 h-12 w-full animate-pulse rounded-md bg-surface" />
          <div className="mt-10 h-6 w-40 animate-pulse rounded bg-surface" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-surface" />
            <div className="h-4 w-full animate-pulse rounded bg-surface" />
          </div>
        </div>
      </div>
    </div>
  );
}
