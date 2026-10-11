function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`block animate-pulse bg-[color-mix(in_srgb,var(--text-primary)_7%,transparent)]${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    />
  );
}

function ModelRowSkeleton() {
  return (
    <article className="grid gap-6 border-b border-[var(--border)] py-8 md:grid-cols-[70px_minmax(180px,0.7fr)_minmax(0,1.3fr)] md:gap-8 md:py-10">
      <SkeletonBlock className="h-[70px] w-[70px]" />

      <div>
        <SkeletonBlock className="h-6 w-[78%] max-w-[180px]" />
        <SkeletonBlock className="mt-3 h-3 w-[110px]" />
      </div>

      <div>
        <SkeletonBlock className="h-3.5 w-full" />
        <SkeletonBlock className="mt-2 h-3.5 w-[94%]" />
        <SkeletonBlock className="mt-2 h-3.5 w-[82%]" />
        <SkeletonBlock className="mt-9 h-3 w-[72%]" />
      </div>
    </article>
  );
}

function SplitSectionSkeleton({ rows = false }: { rows?: boolean }) {
  return (
    <section className="grid gap-8 border-b border-[var(--border)] py-12 md:grid-cols-[minmax(200px,0.7fr)_minmax(0,1.3fr)]">
      <div>
        <SkeletonBlock className="mb-[18px] h-3.5 w-[120px]" />
        <SkeletonBlock className="h-7 w-[88%] max-w-[300px]" />
        <SkeletonBlock className="mt-2 h-7 w-[64%] max-w-[220px]" />
      </div>

      {rows ? (
        <div className="w-full max-w-[560px] md:justify-self-end">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`grid gap-2 py-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6 ${index < 2 ? "border-b border-[var(--border)]" : ""}`}
            >
              <SkeletonBlock className="h-3 w-[90px]" />
              <div>
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="mt-2 h-3 w-[84%]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full max-w-[560px] md:justify-self-end">
          <SkeletonBlock className="h-3.5 w-full" />
          <SkeletonBlock className="mt-2 h-3.5 w-[96%]" />
          <SkeletonBlock className="mt-2 h-3.5 w-[88%]" />
          <SkeletonBlock className="mt-2 h-3.5 w-[64%]" />
        </div>
      )}
    </section>
  );
}

export default function Loading() {
  return (
    <main className="artist-earnings-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="px-5 pt-[158px] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[980px]">
          <section className="mb-16 grid gap-8 md:grid-cols-[70px_minmax(180px,0.7fr)_minmax(0,1.3fr)] md:items-end">
            <div className="md:col-span-2">
              <SkeletonBlock className="mb-[18px] h-3.5 w-[128px]" />
              <SkeletonBlock className="h-[50px] w-[88%] max-w-[560px]" />
            </div>

            <div>
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="mt-2 h-4 w-[96%]" />
              <SkeletonBlock className="mt-2 h-4 w-[76%]" />
            </div>
          </section>

          <section className="border-t border-[var(--border)]">
            {[0, 1, 2].map((index) => (
              <ModelRowSkeleton key={index} />
            ))}
          </section>

          <SplitSectionSkeleton />
          <SplitSectionSkeleton rows />

          <section className="mb-16 flex flex-col items-start justify-between gap-6 py-8 sm:flex-row sm:items-center">
            <div className="w-full max-w-[560px]">
              <SkeletonBlock className="h-6 w-[280px] max-w-full" />
              <SkeletonBlock className="mt-3 h-3 w-[80%]" />
            </div>
            <SkeletonBlock className="h-[52px] w-[132px] shrink-0" />
          </section>
        </div>
      </section>
    </main>
  );
}
