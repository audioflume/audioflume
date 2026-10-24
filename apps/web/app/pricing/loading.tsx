import "./pricing-page.css";

function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`audioflume-pricing-skeleton-block${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    />
  );
}

function PlanSkeleton() {
  return (
    <article className="audioflume-pricing-plan audioflume-pricing-plan-skeleton" aria-hidden="true">
      <div className="audioflume-pricing-plan-banner">
        <SkeletonBlock className="is-plan-name" />
      </div>
      <div className="audioflume-pricing-plan-body">
        <div className="audioflume-pricing-plan-skeleton-description">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <div className="audioflume-pricing-plan-skeleton-price">
          <SkeletonBlock className="is-price" />
          <SkeletonBlock className="is-price-detail" />
        </div>
        <SkeletonBlock className="is-plan-button" />
        <div className="audioflume-pricing-plan-skeleton-features">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <SkeletonBlock className="is-feature-line" />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function LifetimeSkeleton() {
  return (
    <section className="audioflume-pricing-lifetime-section" aria-hidden="true">
      <div className="audioflume-pricing-lifetime audioflume-pricing-lifetime-skeleton">
        <SkeletonBlock className="is-lifetime-brand" />
        <SkeletonBlock className="is-lifetime-heading" />
        <SkeletonBlock className="is-lifetime-meta" />
        <div className="is-lifetime-description">
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <div className="is-lifetime-pricing">
          <div>
            <SkeletonBlock className="is-lifetime-badge" />
            <SkeletonBlock className="is-lifetime-price" />
          </div>
          <div>
            <SkeletonBlock className="is-lifetime-badge is-short" />
            <SkeletonBlock className="is-lifetime-price is-short" />
          </div>
        </div>
        <SkeletonBlock className="is-lifetime-action" />
      </div>

      <div className="audioflume-pricing-originals-shelf audioflume-pricing-originals-skeleton">
        <div className="audioflume-pricing-originals-grid">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="audioflume-pricing-originals-card" key={index}>
              <SkeletonBlock className="is-original-art" />
              <SkeletonBlock className="is-original-title" />
              <SkeletonBlock className="is-original-meta" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <main className="audioflume-pricing-page-root audioflume-pricing-loading" aria-hidden="true">
      <section className="audioflume-pricing-plans-section">
        <div className="audioflume-pricing-overview">
          <div className="audioflume-pricing-overview-heading">
            <SkeletonBlock className="is-overview-eyebrow" />
            <SkeletonBlock className="is-overview-title" />
          </div>
          <div className="audioflume-pricing-overview-skeleton-copy">
            <SkeletonBlock />
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
        </div>

        <div className="audioflume-pricing-offers-grid">
          <div className="audioflume-pricing-plan-grid">
            <PlanSkeleton />
            <PlanSkeleton />
            <PlanSkeleton />
          </div>
          <LifetimeSkeleton />
        </div>

        <section className="audioflume-pricing-comparison-section">
          <div className="audioflume-pricing-comparison-heading">
            <SkeletonBlock className="is-comparison-label" />
            <SkeletonBlock className="is-comparison-link" />
          </div>
          <div className="audioflume-pricing-comparison-block audioflume-pricing-comparison-skeleton">
            <div className="audioflume-pricing-comparison-skeleton-head">
              <div className="is-intro">
                <SkeletonBlock className="is-small-label" />
                <SkeletonBlock className="is-compare-title" />
              </div>
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="is-plan-head" key={index}>
                  <SkeletonBlock className="is-table-plan" />
                  <SkeletonBlock className="is-table-price" />
                  <SkeletonBlock className="is-table-kicker" />
                </div>
              ))}
            </div>
            <div className="audioflume-pricing-comparison-skeleton-rows">
              {Array.from({ length: 5 }).map((_, row) => (
                <div className="is-row" key={row}>
                  <SkeletonBlock className="is-row-label" />
                  <SkeletonBlock className="is-check" />
                  <SkeletonBlock className="is-check" />
                  <SkeletonBlock className="is-check" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      <section className="audioflume-pricing-includes-section audioflume-pricing-includes-skeleton">
        <div>
          <SkeletonBlock className="is-includes-eyebrow" />
          <SkeletonBlock className="is-includes-title" />
          <SkeletonBlock className="is-includes-title is-short" />
        </div>
        <div className="audioflume-pricing-includes-list">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="audioflume-pricing-include-row" key={index}>
              <SkeletonBlock className="is-number" />
              <SkeletonBlock className="is-include-title" />
              <div className="is-include-copy">
                <SkeletonBlock />
                <SkeletonBlock />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="audioflume-pricing-enterprise-band">
        <div className="audioflume-pricing-enterprise-section audioflume-pricing-enterprise-skeleton">
          <div className="audioflume-pricing-enterprise-heading">
            <SkeletonBlock className="is-enterprise-media" />
            <SkeletonBlock className="is-enterprise-eyebrow" />
            <SkeletonBlock className="is-enterprise-title" />
            <SkeletonBlock className="is-enterprise-title is-short" />
          </div>
          <div className="audioflume-pricing-enterprise-copy">
            <div className="is-enterprise-copy-lines">
              <SkeletonBlock />
              <SkeletonBlock />
              <SkeletonBlock />
            </div>
            <SkeletonBlock className="is-enterprise-button" />
          </div>
        </div>
      </section>
    </main>
  );
}
