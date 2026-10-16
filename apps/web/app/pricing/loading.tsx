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
      <SkeletonBlock className="is-plan-kicker" />
      <SkeletonBlock className="is-plan-name" />
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
            <SkeletonBlock className="is-dot" />
            <SkeletonBlock className="is-feature-line" />
          </div>
        ))}
      </div>
    </article>
  );
}

export default function Loading() {
  return (
    <main className="audioflume-pricing-page-root audioflume-pricing-loading" aria-hidden="true">
      <div className="audioflume-pricing-searchbar-slot">
        <div className="audioflume-pricing-searchbar audioflume-pricing-searchbar-skeleton">
          <div className="audioflume-pricing-searchbar-filters">
            <SkeletonBlock className="is-filter-icon" />
            <SkeletonBlock className="is-filter-label" />
          </div>
          <div className="audioflume-pricing-searchbar-skeleton-field">
            <SkeletonBlock className="is-search-icon" />
            <SkeletonBlock className="is-search-copy" />
          </div>
          <div className="audioflume-pricing-searchbar-actions">
            <SkeletonBlock className="is-search-song" />
            <SkeletonBlock className="is-sort" />
          </div>
        </div>
      </div>

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

        <div className="audioflume-pricing-plan-grid">
          <PlanSkeleton />
          <PlanSkeleton />
          <PlanSkeleton />
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

      <section className="audioflume-pricing-testimonial-skeleton">
        <div>
          <SkeletonBlock className="is-testimonial-eyebrow" />
          <div className="is-quote">
            <SkeletonBlock />
            <SkeletonBlock />
            <SkeletonBlock />
          </div>
          <SkeletonBlock className="is-person" />
          <SkeletonBlock className="is-role" />
        </div>
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
