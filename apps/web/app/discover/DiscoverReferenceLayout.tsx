"use client";

import { type FormEvent, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import AudioflumeOutroSection from "@/components/AudioflumeOutroSection";

const ORANGE_IMAGE =
  "https://images.filmwave.io/images/discover/3a193bec-27ca-455c-902d-f653897eb37e.png";

function CrosshairGraphic() {
  return (
    <svg viewBox="0 0 413.74 413.74" aria-hidden="true">
      <g fill="#fff">
        <rect x="204.56" width="4.61" height="28.87" />
        <rect x="204.56" y="48.11" width="4.61" height="28.87" />
        <rect x="204.56" y="96.22" width="4.61" height="28.87" />
        <rect x="204.56" y="144.33" width="4.61" height="28.87" />
        <rect x="204.56" y="192.44" width="4.61" height="28.87" />
        <rect x="204.56" y="240.55" width="4.61" height="28.87" />
        <rect x="204.56" y="288.66" width="4.61" height="28.87" />
        <rect x="204.56" y="336.77" width="4.61" height="28.87" />
        <rect x="204.56" y="384.87" width="4.61" height="28.87" />
        <rect x="397" y="192.44" width="4.61" height="28.87" transform="rotate(90 399.305 206.875)" />
        <rect x="348.89" y="192.44" width="4.61" height="28.87" transform="rotate(90 351.195 206.875)" />
        <rect x="300.78" y="192.44" width="4.61" height="28.87" transform="rotate(90 303.085 206.875)" />
        <rect x="252.67" y="192.44" width="4.61" height="28.87" transform="rotate(90 254.975 206.875)" />
        <rect x="204.56" y="192.44" width="4.61" height="28.87" transform="rotate(90 206.865 206.875)" />
        <rect x="156.46" y="192.44" width="4.61" height="28.87" transform="rotate(90 158.765 206.875)" />
        <rect x="108.35" y="192.44" width="4.61" height="28.87" transform="rotate(90 110.655 206.875)" />
        <rect x="60.24" y="192.44" width="4.61" height="28.87" transform="rotate(90 62.545 206.875)" />
        <rect x="12.13" y="192.44" width="4.61" height="28.87" transform="rotate(90 14.435 206.875)" />
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
          <path d="M771.95,93.35c-30.98,0-56.18-20.78-56.18-46.31S740.97.72,771.95.72s56.18,20.78,56.18,46.31-25.2,46.31-56.18,46.31ZM771.95,5.72c-28.22,0-51.18,18.53-51.18,41.31s22.96,41.31,51.18,41.31,51.18-18.53,51.18-41.31S800.17,5.72,771.95,5.72Z" />
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

function YearMarkerGraphic() {
  return (
    <svg
      viewBox="0 0 56.85 527.66"
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "-24px",
        right: "-2px",
        zIndex: 2,
        width: "29px",
        height: "270px",
        overflow: "visible",
      }}
    >
      <style>{`.discover-reference-orange-panel::after { display: none !important; }`}</style>
      <g fill="#fff">
        <rect x="27.08" y="406.81" width="1.58" height="8.43" /><rect x="27.08" y="420.86" width="1.58" height="8.43" /><rect x="27.08" y="434.92" width="1.58" height="8.43" /><rect x="27.08" y="448.97" width="1.58" height="8.43" /><rect x="27.08" y="463.02" width="1.58" height="8.43" /><rect x="27.08" y="477.07" width="1.58" height="8.43" /><rect x="27.08" y="491.12" width="1.58" height="8.43" /><rect x="27.08" y="505.17" width="1.58" height="8.43" /><rect x="27.08" y="519.23" width="1.58" height="8.43" /><rect x="27.08" y="280.35" width="1.58" height="8.43" /><rect x="27.08" y="294.4" width="1.58" height="8.43" /><rect x="27.08" y="308.45" width="1.58" height="8.43" /><rect x="27.08" y="322.5" width="1.58" height="8.43" /><rect x="27.08" y="336.55" width="1.58" height="8.43" /><rect x="27.08" y="210.09" width="1.58" height="8.43" /><rect x="27.08" y="196.04" width="1.58" height="8.43" /><rect x="27.08" y="224.14" width="1.58" height="8.43" /><rect x="27.08" y="238.19" width="1.58" height="8.43" /><rect x="27.08" y="252.25" width="1.58" height="8.43" /><rect x="27.08" y="266.3" width="1.58" height="8.43" /><rect x="27.08" y="350.61" width="1.58" height="8.43" /><rect x="27.08" y="364.66" width="1.58" height="8.43" /><rect x="27.08" y="378.71" width="1.58" height="8.43" /><rect x="27.08" y="392.76" width="1.58" height="8.43" />
        <path d="M.71,37.62v-3.39l12.15-13.5c1.09-1.21,2-2.28,2.73-3.21.73-.93,1.31-1.8,1.76-2.6.44-.78.76-1.52.94-2.23.19-.71.28-1.43.28-2.18,0-.92-.15-1.78-.45-2.58s-.73-1.51-1.29-2.1c-.58-.59-1.27-1.07-2.08-1.41s-1.72-.52-2.74-.52c-1.24,0-2.31.18-3.22.54s-1.66.86-2.25,1.5c-.61.66-1.06,1.46-1.36,2.39s-.45,1.98-.45,3.13H0c0-1.56.27-3.04.81-4.42.54-1.38,1.33-2.59,2.37-3.63,1.02-1.04,2.27-1.86,3.76-2.47C8.43.33,10.12.03,12.02.03c1.75,0,3.32.26,4.72.78,1.4.52,2.59,1.24,3.55,2.15.97.92,1.71,2,2.23,3.26.52,1.26.78,2.62.78,4.1,0,1.1-.19,2.2-.56,3.27s-.88,2.14-1.5,3.2c-.65,1.05-1.39,2.09-2.23,3.12-.84,1.03-1.73,2.05-2.66,3.07l-9.96,10.8h18.62v3.85H.71Z" />
        <path d="M56.03,29.71c-.54,1.83-1.32,3.36-2.34,4.6-1.02,1.26-2.27,2.21-3.74,2.85-1.48.64-3.17.97-5.07.97s-3.57-.32-5.07-.96c-1.5-.64-2.76-1.59-3.79-2.87-1.04-1.24-1.83-2.77-2.37-4.6s-.81-3.92-.81-6.28v-8.68c0-2.36.27-4.45.81-6.28.54-1.82,1.33-3.37,2.37-4.62,1.02-1.26,2.27-2.21,3.76-2.87s3.17-.98,5.05-.98,3.6.33,5.08.98c1.48.65,2.75,1.61,3.78,2.87,1.02,1.26,1.8,2.8,2.34,4.62.54,1.83.81,3.92.81,6.28v8.68c0,2.36-.27,4.45-.81,6.28ZM52.01,11.41c-.14-1.22-.38-2.31-.73-3.25s-.82-1.73-1.41-2.36c-.58-.64-1.29-1.13-2.13-1.45-.84-.32-1.81-.48-2.92-.48s-2.11.17-2.97.52c-.86.35-1.58.85-2.18,1.51-.71.83-1.24,1.91-1.59,3.22-.35,1.32-.52,2.84-.52,4.57v8.79l14.44-11.08ZM52.11,19.18v-3.26l-14.42,11.03c.15,1.24.42,2.33.81,3.27s.9,1.72,1.53,2.33c.58.58,1.27,1.01,2.09,1.31.81.3,1.73.45,2.75.45,1.07,0,2.02-.16,2.85-.48.83-.32,1.54-.79,2.11-1.4.78-.83,1.35-1.92,1.72-3.26.37-1.34.55-2.92.55-4.74v-5.25Z" />
        <path d="M.71,104.21v-3.39l12.15-13.5c1.09-1.21,2-2.28,2.73-3.21.73-.93,1.31-1.8,1.76-2.6.44-.78.76-1.52.94-2.23.19-.71.28-1.43.28-2.18,0-.92-.15-1.78-.45-2.58s-.73-1.51-1.29-2.1c-.58-.59-1.27-1.07-2.08-1.41s-1.72-.52-2.74-.52c-1.24,0-2.31.18-3.22.54s-1.66.86-2.25,1.5c-.61.66-1.06,1.46-1.36,2.39s-.45,1.98-.45,3.13H0c0-1.56.27-3.04.81-4.42.54-1.38,1.33-2.59,2.37-3.63,1.02-1.04,2.27-1.86,3.76-2.47,1.48-.61,3.18-.92,5.08-.92,1.75,0,3.32.26,4.72.78,1.4.52,2.59,1.24,3.55,2.15.97.92,1.71,2,2.23,3.26.52,1.26.78,2.62.78,4.1,0,1.1-.19,2.2-.56,3.27s-.88,2.14-1.5,3.2c-.65,1.05-1.39,2.09-2.23,3.12-.84,1.03-1.73,2.05-2.66,3.07l-9.96,10.8h18.62v3.85H.71Z" />
        <path d="M50.94,71.33h-.41c-2.24,0-4.14.32-5.71.96s-2.85,1.49-3.87,2.56c-1.07,1.12-1.88,2.45-2.43,4-.55,1.55-.88,3.13-.98,4.76.44-.53.95-1.01,1.53-1.46.58-.45,1.21-.84,1.88-1.18.66-.32,1.38-.58,2.15-.78.77-.2,1.58-.29,2.43-.29,1.85,0,3.45.35,4.79,1.06,1.34.71,2.45,1.63,3.31,2.79.87,1.15,1.5,2.46,1.91,3.92.41,1.46.61,2.95.61,4.46,0,1.73-.24,3.36-.72,4.89-.48,1.53-1.21,2.86-2.18,4-.97,1.15-2.17,2.06-3.61,2.72-1.43.66-3.09.99-4.98.99s-3.57-.38-5.02-1.15-2.66-1.76-3.64-2.98c-1.11-1.34-1.93-2.91-2.47-4.7-.54-1.79-.82-3.59-.82-5.39v-2.22c0-3.09.37-6.13,1.1-9.12.73-2.99,2.16-5.54,4.28-7.67,1.46-1.46,3.23-2.56,5.32-3.3s4.46-1.11,7.11-1.11h.41v4.23ZM42.46,84.19c-.75.25-1.44.61-2.09,1.07-.64.46-1.21,1.01-1.71,1.66-.49.65-.88,1.36-1.17,2.14v1.58c0,1.63.2,3.08.59,4.34s.92,2.33,1.58,3.2,1.43,1.52,2.29,1.97c.87.45,1.77.67,2.72.67,1.1,0,2.08-.21,2.93-.64s1.57-1.01,2.16-1.76c.58-.75,1.02-1.64,1.31-2.69.3-1.04.45-2.18.45-3.4,0-1.09-.14-2.14-.41-3.17s-.69-1.94-1.25-2.74c-.56-.8-1.26-1.43-2.11-1.91-.85-.47-1.84-.71-2.98-.71-.8,0-1.57.13-2.32.38Z" />
      </g>
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
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search music library" aria-label="Search music library" />
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
        <p className="curated-video-hero-primary-copy">
          <span>Uncover curated music playlists</span>
          <span>Preview audio soundtracks</span>
          <span>For film</span>
        </p>
      </div>
      <div className="discover-reference-intro-center">
        <CrosshairGraphic />
        <div className="discover-reference-pulse-copy">
          <strong>(Tracks with a pulse)</strong>
          <span>Motion without the extra noise<br />Music built to move with the cut</span>
        </div>
        <EditorialSymbolsGraphic />
        <p>A focused library of tracks selected for editors who need the right feeling quickly. Less digging, fewer dead ends, more momentum between the first frame and final cut.</p>
      </div>
      <figure className="discover-reference-orange-panel">
        <YearMarkerGraphic />
        <img src={ORANGE_IMAGE} alt="Abstract orange portrait" />
      </figure>
    </section>
  );
}

export default function DiscoverReferenceLayout() {
  const [heroMount, setHeroMount] = useState<HTMLElement | null>(null);
  const [introMount, setIntroMount] = useState<HTMLElement | null>(null);
  const [outroMount, setOutroMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const heroContent = document.querySelector<HTMLElement>(".discover-hero-content");
    const firstSection = document.querySelector<HTMLElement>(".discover-curated-playlist-section");
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
      {outroMount && createPortal(<AudioflumeOutroSection />, outroMount)}
    </>
  );
}
