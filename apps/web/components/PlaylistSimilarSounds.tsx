"use client";

const PLACEHOLDER_COUNT = 7;

export default function PlaylistSimilarSounds() {
  return (
    <section className="playlist-detail-similar" aria-labelledby="playlist-similar-heading">
      <h2 id="playlist-similar-heading">Similar Sounds</h2>
      <div className="playlist-detail-similar-grid" aria-hidden="true">
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
          <div key={index} className="playlist-detail-similar-card">
            <div className="playlist-detail-similar-placeholder" />
          </div>
        ))}
      </div>
    </section>
  );
}
