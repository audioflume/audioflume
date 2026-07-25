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
    <svg viewBox="0 0 828.13 94.07" aria-hidden="true">
      <g fill="#fff">
        <g>
          <path d="M92.42,91.74c-24.65,0-44.71-20.06-44.71-44.71S67.77,2.33,92.42,2.33s44.71,20.06,44.71,44.71-20.06,44.71-44.71,44.71ZM92.42,7.33c-21.89,0-39.71,17.81-39.71,39.71s17.81,39.71,39.71,39.71,39.71-17.81,39.71-39.71S114.32,7.33,92.42,7.33Z" />
          <path d="M44.71,91.74C20.06,91.74,0,71.69,0,47.03S20.06,2.33,44.71,2.33s44.71,20.06,44.71,44.71-20.06,44.71-44.71,44.71ZM44.71,7.33C22.81,7.33,5,25.14,5,47.03s17.81,39.71,39.71,39.71,39.71-17.81,39.71-39.71S66.6,7.33,44.71,7.33Z" />
        </g>
        <g>
          <path d="M303.62,89.55c-23.44,0-42.51-19.07-42.51-42.51s19.07-42.51,42.51-42.51v11c-17.38,0-31.51,14.14-31.51,31.51s14.14,31.51,31.51,31.51v11Z" />
          <path d="M358.02,89.55c-23.44,0-42.51-19.07-42.51-42.51s19.07-42.51,42.51-42.51v11c-17.38,0-31.51,14.14-31.51,31.51s14.14,31.51,31.51,31.51v11Z" />
          <rect x="321.01" y="41.53" width="29.35" height="11" />
        </g>
        <g>
          <path d="M576.95,94.07h-72c-7.52,0-13.64-6.12-13.64-13.64V13.64c0-7.52,6.12-13.64,13.64-13.64h72c7.52,0,13.64,6.12,13.64,13.64v66.79c0,7.52-6.12,13.64-13.64,13.64ZM504.94,5.73c-4.36,0-7.91,3.55-7.91,7.91v66.79c0,4.36,3.55,7.91,7.91,7.91h72c4.36,0,7.91-3.55,7.91-7.91V13.64c0-4.36-3.55-7.91-7.91-7.91h-72Z" />
          <path d="M549.74,82.26l-19.81-19.83c-2.41-2.42-2.41-6.35,0-8.76l17.64-17.64-19.83-19.84,4.38-4.38,19.83,19.84c2.42,2.42,2.42,6.35,0,8.77l-17.64,17.64,19.81,19.84-4.38,4.38Z" />
          <rect x="532.85" y="55.03" width="53.74" height="6.2" />
          <rect x="496.14" y="32.91" width="53.74" height="6.2" />
        </g>
        <g>
          <path d="M771.95,93.35c-30.98,0-56.18-20.78-56.18-46.31S740.97.72,771.95.72s56.18,20.78,56.18,46.31-25.2,46.31-56.18,46.31ZM771.95,5.72c-28.22,0-51.18,18.53-51.18,41.31s22.96,41.31,51.18,41.31,51.18-18.53,51.18-41.31-22.96-41.31-51.18-41.31Z" />
          <g>
            <path d="M736.05,80.36l-3.11-3.91c10.53-8.37,24.38-12.98,39.01-12.98s28.49,4.61,39.01,12.98l-3.11,3.91c-9.65-7.67-22.39-11.9-35.9-11.9s-26.25,4.23-35.9,11.9Z" />
            <path d="M771.95,30.6c-14.63,0-28.49-4.61-39.01-12.99l3.11-3.91c9.65,7.67,22.39,11.9,35.9,11.9s26.25-4.23,35.9-11.9l3.11,3.91c-10.53,8.37-24.38,12.98-39.01,12.98Z" />
          </g>
          <path d="M771.95,92.67l-1.14-.58c-17.02-8.7-27.6-25.97-27.6-45.05s10.57-36.35,27.6-45.05l1.14-.58,1.14.58c17.02,8.7,27.6,25.96,27.6,45.05s-10.57,36.35-27.6,45.05l-1.14.58ZM771.95,7.03c-14.67,8.02-23.73,23.23-23.73,40s9.06,31.98,23.73,40c14.67-8.02,23.73-23.23,23.73-40s-9.06-31.98-23.73-40Z" />
          <rect x="718.37" y="44.53" width="107.16" height="5" />
          <rect x="769.45" y="3.22" width="5" height="87.63" />
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
