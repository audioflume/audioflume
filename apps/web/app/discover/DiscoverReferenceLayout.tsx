"use client";

import { type FormEvent, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

const ORANGE_IMAGE =
  "https://images.filmwave.io/images/discover/3a193bec-27ca-455c-902d-f653897eb37e.png";

function CrosshairGraphic() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="4" />
      <line x1="40" y1="8" x2="40" y2="72" />
      <line x1="8" y1="40" x2="72" y2="40" />
    </svg>
  );
}

function ControlGraphic() {
  return (
    <svg viewBox="0 0 180 34" aria-hidden="true">
      <circle cx="16" cy="17" r="10" />
      <path d="M12 17h8M16 13v8" />
      <circle cx="58" cy="17" r="10" />
      <path d="M54 17h8" />
      <rect x="92" y="7" width="20" height="20" />
      <path d="M96 17h12M102 11v12" />
      <circle cx="150" cy="17" r="10" />
      <path d="m146 17 3 3 6-7" />
    </svg>
  );
}

function WaveGraphic() {
  return (
    <svg viewBox="0 0 290 44" aria-hidden="true">
      <path d="M2 22h18l5-9 8 18 8-26 9 34 8-17 8 8 8-20 8 24 9-12 8 7 8-18 9 24 8-13 8 8 8-21 9 29 8-16 8 7 8-14 9 19 8-12 8 7 8-9 9 13h23" />
    </svg>
  );
}

function HeroComposition() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/music?search=${encodeURIComponent(query)}` : "/music");
  }

  return (
    <div className="discover-reference-hero">
      <div className="discover-reference-hero-grid">
        <h1>Endless audio for film</h1>
        <p>Browse curated music playlists<br />Preview audio + soundtracks</p>
        <p><strong>(Tailored sound)</strong><br />Music chosen to fit the cut<br />From first frame to final</p>
      </div>
      <form className="discover-reference-search" onSubmit={submit}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search music library"
          aria-label="Search music library"
        />
        <button type="submit">Search</button>
      </form>
    </div>
  );
}

function IntroComposition() {
  return (
    <section className="discover-reference-intro" aria-label="About Audioflume">
      <div className="discover-reference-intro-title">
        <h2>More music.<br />Less noise.</h2>
        <p>Uncover curated music playlists<br />Preview audio soundtracks<br />For film</p>
      </div>

      <div className="discover-reference-intro-center">
        <CrosshairGraphic />
        <div className="discover-reference-pulse-copy">
          <strong>(Tracks with a pulse)</strong>
          <span>Motion without the extra noise<br />Music built to move with the cut</span>
        </div>
        <ControlGraphic />
        <p>
          A focused library of tracks selected for editors who need the right
          feeling quickly. Less digging, fewer dead ends, more momentum between
          the first frame and final cut.
        </p>
      </div>

      <figure className="discover-reference-orange-panel">
        <span className="discover-reference-index">28<br />28</span>
        <img src={ORANGE_IMAGE} alt="Abstract orange portrait" />
      </figure>
    </section>
  );
}

function OutroComposition() {
  return (
    <section className="discover-reference-outro" aria-label="Audioflume approach">
      <div>
        <h2>A little polished,<br />a little strange.</h2>
        <div className="discover-reference-line-graphic" aria-hidden="true">
          <span />
        </div>
      </div>
      <div>
        <strong>(Tracks with a pulse)</strong>
        <span>Curated music for the cut, not the algorithm</span>
        <WaveGraphic />
      </div>
      <p>
        A focused library of distinctive tracks, selected for editors who need
        character without losing momentum. Human choices, useful categories,
        and a faster path from search to timeline.
      </p>
    </section>
  );
}

export default function DiscoverReferenceLayout() {
  const [heroMount, setHeroMount] = useState<HTMLElement | null>(null);
  const [introMount, setIntroMount] = useState<HTMLElement | null>(null);
  const [outroMount, setOutroMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const heroContent = document.querySelector<HTMLElement>(".discover-hero-content");
    const firstSection = document.querySelector<HTMLElement>(
      ".discover-curated-playlist-section",
    );
    const footer = document.querySelector<HTMLElement>(".discover-footer-wrap");

    if (!heroContent || !firstSection || !footer) return;

    const hero = document.createElement("div");
    hero.className = "discover-reference-hero-mount";
    heroContent.appendChild(hero);

    const intro = document.createElement("div");
    intro.className = "discover-reference-intro-mount";
    firstSection.insertAdjacentElement("beforebegin", intro);

    const outro = document.createElement("div");
    outro.className = "discover-reference-outro-mount";
    footer.insertAdjacentElement("beforebegin", outro);

    setHeroMount(hero);
    setIntroMount(intro);
    setOutroMount(outro);

    return () => {
      hero.remove();
      intro.remove();
      outro.remove();
    };
  }, []);

  return (
    <>
      {heroMount && createPortal(<HeroComposition />, heroMount)}
      {introMount && createPortal(<IntroComposition />, introMount)}
      {outroMount && createPortal(<OutroComposition />, outroMount)}
    </>
  );
}
