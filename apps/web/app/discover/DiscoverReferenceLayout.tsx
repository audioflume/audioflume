"use client";

import { type FormEvent, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

const ORANGE_IMAGE =
  "https://images.filmwave.io/images/discover/3a193bec-27ca-455c-902d-f653897eb37e.png";

function CrosshairGraphic() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="48" cy="48" r="7" />
        <circle cx="48" cy="48" r="2" fill="currentColor" stroke="none" />
        <path d="M48 10v25M48 61v25M10 48h25M61 48h25" />
        <path d="M42 16h12M42 80h12M16 42v12M80 42v12" />
      </g>
    </svg>
  );
}

function EditorialSymbolsGraphic() {
  return (
    <svg viewBox="0 0 214 44" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <g transform="translate(2 2)">
          <circle cx="20" cy="20" r="15" />
          <circle cx="20" cy="20" r="4" />
          <path d="M20 5v7M20 28v7M5 20h7M28 20h7" />
        </g>

        <g transform="translate(56 2)">
          <circle cx="20" cy="20" r="15" />
          <path d="M10 20c4-8 16-8 20 0-4 8-16 8-20 0Z" />
          <circle cx="20" cy="20" r="2" fill="currentColor" stroke="none" />
        </g>

        <g transform="translate(110 2)">
          <rect x="5" y="5" width="30" height="30" />
          <rect x="13" y="13" width="14" height="14" />
          <path d="M5 13h8M27 13h8M5 27h8M27 27h8" />
        </g>

        <g transform="translate(164 2)">
          <circle cx="20" cy="20" r="15" />
          <path d="M20 8v24M8 20h24" />
          <circle cx="20" cy="20" r="6" />
        </g>
      </g>
    </svg>
  );
}

function WaveGraphic() {
  return (
    <svg viewBox="0 0 320 50" aria-hidden="true">
      <path d="M1 25h17l4-5 5 10 6-20 7 30 7-18 7 6 7-12 7 19 7-10 7 4 7-16 7 25 7-15 7 8 7-21 7 31 7-20 7 11 7-18 7 25 7-16 7 7 7-13 7 20 7-12 7 5 7-9 7 14 7-8 7 3 7-5h21" />
      <path d="M1 25h318" opacity="0.22" />
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
        <p>
          Browse curated music playlists
          <br />
          Preview audio + soundtracks
        </p>
        <p>
          <strong>(Tailored sound)</strong>
          <br />
          Music chosen to fit the cut
          <br />
          From first frame to final
        </p>
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
        <h2>
          More music.
          <br />
          Less noise.
        </h2>
        <p>
          Uncover curated music playlists
          <br />
          Preview audio soundtracks
          <br />
          For film
        </p>
      </div>

      <div className="discover-reference-intro-center">
        <CrosshairGraphic />
        <div className="discover-reference-pulse-copy">
          <strong>(Tracks with a pulse)</strong>
          <span>
            Motion without the extra noise
            <br />
            Music built to move with the cut
          </span>
        </div>
        <EditorialSymbolsGraphic />
        <p>
          A focused library of tracks selected for editors who need the right
          feeling quickly. Less digging, fewer dead ends, more momentum between
          the first frame and final cut.
        </p>
      </div>

      <figure className="discover-reference-orange-panel">
        <span className="discover-reference-index">
          28
          <br />
          28
        </span>
        <img src={ORANGE_IMAGE} alt="Abstract orange portrait" />
      </figure>
    </section>
  );
}

function OutroComposition() {
  return (
    <section className="discover-reference-outro" aria-label="Audioflume approach">
      <div>
        <h2>
          A little polished,
          <br />a little strange.
        </h2>
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

    heroContent.classList.add("has-discover-reference-layout");

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
      heroContent.classList.remove("has-discover-reference-layout");
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
