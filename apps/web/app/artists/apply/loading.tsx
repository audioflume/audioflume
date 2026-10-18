function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`block animate-pulse bg-[rgba(255,255,255,0.10)]${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    />
  );
}

export default function Loading() {
  return (
    <main className="artist-apply-page-root min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        .artist-onboarding-loading-hero {
          background: #e5e5dd;
        }

        html:not(.light):not([data-theme="light"]) .artist-onboarding-loading-hero {
          background: #111111;
        }
      `}</style>
      <section className="artist-onboarding-loading-hero relative isolate overflow-hidden px-5 pb-[120px] pt-[152px] md:px-8 xl:px-10">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-1/2 bg-[rgba(255,255,255,0.035)]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/2 overflow-hidden md:block"
        >
          <SkeletonBlock className="absolute left-[4%] top-[7%] h-[12%] w-[16%]" />
          <SkeletonBlock className="absolute left-[27%] top-[18%] h-[9%] w-[12%]" />
          <SkeletonBlock className="absolute left-[6%] top-[34%] h-[27%] w-[30%]" />
          <SkeletonBlock className="absolute left-[40%] top-[53%] h-[11%] w-[14%]" />
          <SkeletonBlock className="absolute bottom-[9%] left-[13%] h-[14%] w-[18%]" />
          <SkeletonBlock className="absolute bottom-[4%] left-[42%] h-[8%] w-[10%]" />
        </div>

        <div className="relative mx-auto max-w-[650px]">
          <section className="mb-8">
            <SkeletonBlock className="h-[66px] w-[92%] max-w-[610px]" />
            <SkeletonBlock className="mt-2 h-[66px] w-[64%] max-w-[420px]" />
          </section>

          <div className="relative z-10 bg-[var(--bg-primary)] p-[50px]">
            <div className="grid gap-7">
              <div>
                <SkeletonBlock className="mb-3 h-3 w-[92px] bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]" />
                <SkeletonBlock className="h-[46px] w-full bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]" />
              </div>

              <div>
                <SkeletonBlock className="mb-3 h-3 w-[110px] bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]" />
                <SkeletonBlock className="h-[46px] w-full bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]" />
              </div>

              <div>
                <SkeletonBlock className="mb-3 h-3 w-[124px] bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]" />
                <SkeletonBlock className="h-[46px] w-full bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]" />
              </div>

              <div>
                <SkeletonBlock className="mb-3 h-3 w-[104px] bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]" />
                <SkeletonBlock className="h-[104px] w-full bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]" />
              </div>

              <div className="flex justify-end pt-1">
                <SkeletonBlock className="h-[40px] w-[126px] bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
