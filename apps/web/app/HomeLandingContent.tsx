"use client";

import Footer from "@/components/Footer";
import Link from "next/link";
import GlobalMusicSearch from "@/components/GlobalMusicSearch";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import { AudioflumeMark } from "@/components/LifetimeAccessCard";
import PricingHeroImageFlash from "./pricing/PricingHeroImageFlash";
import { useHasCurrentSong, usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import PauseIcon from "@/components/icons/PauseIcon";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const HOME_HERO_IMAGE =
  "https://images.filmwave.io/images/home/jakob-owens-xKfS7Hll0Ck-unsplash.jpg";

export default function HomeLandingContent({ homeFlashImages }: { homeFlashImages: string[] }) {
  const playerVisible = useHasCurrentSong();
  const { songs } = useSongs();
  const gridSongs = songs.filter((song) => Boolean(song.audioUrl && song.coverArt)).slice(0, 10);
  const songRows = [gridSongs.slice(0, 2), gridSongs.slice(2, 5), gridSongs.slice(5, 7), gridSongs.slice(7, 10)];
  function playGridSong(song: (typeof songs)[number]) {
    if (!song.audioUrl) return;
    setQueue(gridSongs);
    togglePlayPause(song);
  }

  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  function playArtist(name: string) {
    const artistSongs = songs.filter((song) =>
      song.audioUrl && song.artist.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (!artistSongs.length) return;
    const active = currentSong && artistSongs.some((song) => song.id === currentSong.id);
    if (active && isPlaying) {
      togglePlayPause(currentSong);
    } else {
      setQueue(artistSongs);
      togglePlayPause(active && currentSong ? currentSong : artistSongs[0]);
    }
  }

  const [homeImages, setHomeImages] = useState({
    hero: HOME_HERO_IMAGE,
    lowerBanner: "https://images.filmwave.io/images/home/yunus-tug-HA3X_sDhAgk-unsplash-web.jpg",
  });
  useEffect(() => {
    fetch("/api/home-images", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const images = await response.json();
        if (typeof images.hero === "string" && typeof images.lowerBanner === "string") {
          setHomeImages(images);
        }
      })
      .catch(() => {});
  }, []);
  const carouselRef = useRef<HTMLElement>(null);
  const authenticBannerRef = useRef<HTMLElement>(null);
  const [authenticBannerVisible, setAuthenticBannerVisible] = useState(false);

  useEffect(() => {
    const banner = authenticBannerRef.current;
    if (!banner) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setAuthenticBannerVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setAuthenticBannerVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.7 });
    observer.observe(banner);
    return () => observer.disconnect();
  }, []);

  const suppressCarouselClickRef = useRef(false);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [artists, setArtists] = useState<Array<{
    id: string;
    name: string;
    slug: string;
    designation?: string | null;
    hero_image_url?: string | null;
    profile_image_url?: string | null;
  }>>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/home-featured-artists", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load homepage featured artists");
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setArtists((Array.isArray(data?.artists) ? data.artists : [])
            .filter((artist: { hero_image_url?: string | null; profile_image_url?: string | null }) =>
              artist.hero_image_url || artist.profile_image_url));
        }
      }).catch(() => {}).finally(() => {
        if (!controller.signal.aborted) setArtistsLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const viewport = carouselRef.current;
    const track = viewport?.querySelector<HTMLElement>(".audioflume-home-landing-artist-track");
    const sequence = track?.querySelector<HTMLElement>(".audioflume-home-landing-artist-sequence");
    if (!viewport || !track || !sequence || artists.length === 0) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let loopWidth = 0;
    let offset = 0;
    let dragging = false;
    let dragged = false;
    let previousX = 0;
    let previousScrollY = window.scrollY;

    function render() {
      if (!loopWidth) return;
      offset = ((offset % loopWidth) + loopWidth) % loopWidth;
      track!.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }

    function measure() {
      const width = sequence!.getBoundingClientRect().width;
      if (!width) return;
      if (loopWidth && Math.abs(width - loopWidth) > 0.5) {
        offset *= width / loopWidth;
      }
      loopWidth = width;
      render();
    }

    function onPageScroll() {
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - previousScrollY;
      previousScrollY = currentScrollY;
      if (!loopWidth || dragging || reducedMotion.matches || !deltaY) return;
      const rect = viewport!.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      offset += deltaY * 0.5;
      render();
    }

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || !loopWidth) return;
      // Never capture vertical page scrolling.
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      offset += event.deltaX;
      render();
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      dragged = false;
      previousX = event.clientX;
    }

    function onPointerMove(event: PointerEvent) {
      if (!dragging) return;
      const dx = event.clientX - previousX;
      if (Math.abs(dx) > 5 && !dragged) {
        dragged = true;
        viewport!.setPointerCapture(event.pointerId);
      }
      previousX = event.clientX;
      if (!dragged) return;
      offset -= dx;
      render();
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      if (dragged) {
        suppressCarouselClickRef.current = true;
        window.setTimeout(() => { suppressCarouselClickRef.current = false; }, 0);
      }
    }

    const observer = new ResizeObserver(measure);
    observer.observe(sequence);
    measure();
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("scroll", onPageScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onPageScroll);
      observer.disconnect();
      track.style.transform = "";
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
    };
  }, [artists]);

  return (
    <main
      className={`audioflume-home-reference audioflume-home-landing${playerVisible ? " has-player" : ""}`}
    >
      <section
        className="audioflume-home-reference-hero"
        style={{ "--audioflume-home-hero-photo": `url("${homeImages.hero}")` } as CSSProperties}
      >
        <div className="audioflume-home-reference-hero-shade" />
        <h1 className="audioflume-home-reference-hero-headline"><span>Human</span>{" "}<span>made</span>{" "}<span>music</span><br className="audioflume-home-hero-responsive-break" /><span>&amp;</span>{" "}<span>SFX</span>{" "}<span>for</span>{" "}<span>film</span></h1>
        <div className="audioflume-home-reference-width audioflume-home-landing-hero-captions">
          <span>ROYALTY FREE MUSIC LICENSED FOR FILM</span>
          <span>HUMAN MADE MUSIC &amp; ETHICAL ARTIST COMPENSATION</span>
        </div>
      </section>

      <section className="audioflume-home-landing-discover" aria-label="Discover music">
        <div className="audioflume-home-landing-search-group">
          <div className="audioflume-home-landing-search">
            <div className="audioflume-home-landing-search-field">
              <Link href="/discover" className="audioflume-home-landing-search-brand" aria-label="Explore Discover">
                <AudioflumeMark ariaHidden className="audioflume-home-landing-search-mark" />
              </Link>
              <GlobalMusicSearch showSubmitArrow />
            </div>
            <GlobalReferenceSearch className="audioflume-home-landing-search-song" />
          </div>
          <nav className="audioflume-home-landing-keywords" aria-label="Popular music searches">
            {[
              { label: "Cinematic", filter: "genre", value: "Cinematic" },
              { label: "Ambient", filter: "genre", value: "Ambient" },
              { label: "Emotional", filter: "mood", value: "Emotional" },
              { label: "Uplifting", filter: "mood", value: "Uplifting" },
              { label: "Documentary", filter: "genre", value: "Film" },
              { label: "Tension", filter: "mood", value: "Tense" },
              { label: "Piano", filter: "instrument", value: "Piano" },
            ].map(({ label, filter, value }) => (
              <Link key={label} href={`/music?${filter}=${encodeURIComponent(value)}`} className="audioflume-home-landing-keyword">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="audioflume-home-reference-width audioflume-home-landing-brand-row">
          <p>Filmmakers working for these brands already use Audioflume.</p>
          <img src="https://images.filmwave.io/images/home/logos.png" alt="Brands using Audioflume" draggable={false} />
        </div>
      </section>

      {artistsLoading ? (
        <section className="audioflume-home-landing-artist-carousel is-loading" aria-label="Loading featured artists" aria-busy="true">
          <div className="audioflume-home-landing-artist-track" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="audioflume-home-landing-artist-card is-skeleton" key={index}>
                <span className="audioflume-home-landing-artist-image audioflume-home-landing-skeleton-shape" />
                <span className="audioflume-home-landing-artist-title audioflume-home-landing-skeleton-shape" />
                <span className="audioflume-home-landing-artist-subtitle audioflume-home-landing-skeleton-shape" />
              </div>
            ))}
          </div>
        </section>
      ) : artists.length > 0 ? (
        <section ref={carouselRef} className="audioflume-home-landing-artist-carousel" aria-label="Featured artists" onClickCapture={(event) => { if (suppressCarouselClickRef.current) { event.preventDefault(); event.stopPropagation(); } }}>
          <div className="audioflume-home-landing-artist-track">
            {[0, 1, 2, 3].map((copy) => (
              <div className="audioflume-home-landing-artist-sequence" key={copy} aria-hidden={copy > 0}>
                {artists.map((artist) => (
                  <div key={artist.id} className="audioflume-home-landing-artist-card">
                    <div className="audioflume-home-landing-artist-image-wrap">
                      <Link tabIndex={copy > 0 ? -1 : undefined} href={`/artists/${artist.slug}`} className="audioflume-home-landing-artist-image">
                        <img src={artist.hero_image_url || artist.profile_image_url || ""} alt="" loading="lazy" />
                      </Link>
                      <button
                        type="button"
                        tabIndex={copy > 0 ? -1 : undefined}
                        className="audioflume-home-landing-artist-play"
                        onClick={() => playArtist(artist.name)}
                        aria-label={`Play music by ${artist.name}`}
                      >
                        {isPlaying && currentSong?.artist.trim().toLowerCase() === artist.name.trim().toLowerCase()
                          ? <PauseIcon size={18} />
                          : <PlayIconSmall size={18} />}
                      </button>
                    </div>
                    <Link tabIndex={copy > 0 ? -1 : undefined} href={`/artists/${artist.slug}`} className="audioflume-home-landing-artist-title">{artist.name}</Link>
                    <span className="audioflume-home-landing-artist-subtitle">{artist.designation || "Composer"}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section ref={authenticBannerRef} className={`audioflume-home-authentic-banner${authenticBannerVisible ? " is-visible" : ""}`} aria-label="Authentic music, curated and licensed for film. Human made music. Story driven sound.">
        <div className="audioflume-home-authentic-left">
          <div className="audioflume-home-authentic-lockup">
            <span className="audioflume-home-authentic-logo-reveal">
              <AudioflumeMark className="audioflume-home-authentic-mark" ariaHidden />
              <svg className="audioflume-home-authentic-ring" viewBox="0 0 39.82 39.53" aria-hidden="true">
                <circle cx="19.91" cy="19.76" r="17.87" fill="none" stroke="currentColor" strokeWidth="3.2" />
              </svg>
            </span>
            <h2>Authentic music, curated<br />and licensed for film.</h2>
          </div>
        </div>
        <div className="audioflume-home-authentic-right">
          <PricingHeroImageFlash images={homeFlashImages} mediaClassName="audioflume-home-authentic-flash-media" />
          <div className="audioflume-home-authentic-message">
            <span><span>HUMAN</span><span>MADE</span><span>MUSIC.</span></span>
            <span><span>STORY</span><span>DRIVEN</span><span>SOUND.</span></span>
          </div>
        </div>
      </section>

      <section className="audioflume-home-song-mosaic" aria-label="Explore music from the Audioflume catalogue">
        {songRows.map((row, rowIndex) => (
          <div className="audioflume-home-song-mosaic-row" key={rowIndex}>
            {row.map((song) => {
              const playing = isPlaying && currentSong?.id === song.id;
              return (
                <article className={`audioflume-home-song-mosaic-card${(rowIndex === 0 && row[0]?.id === song.id) || (rowIndex === 2 && row[1]?.id === song.id) ? " is-wide" : ""}`} key={song.id}>
                  <img className="audioflume-home-song-mosaic-background" src={song.coverArt} alt="" loading="lazy" />
                  <div className="audioflume-home-song-mosaic-shade" aria-hidden="true" />
                  <div className="audioflume-home-song-mosaic-info">
                    <span className="audioflume-home-song-mosaic-thumbnail">
                      <img src={song.coverArt} alt="" loading="lazy" />
                      {!(rowIndex === 0 && row[0]?.id === song.id) && !(rowIndex === 2 && row[1]?.id === song.id) ? (
                        <button
                          type="button"
                          className="audioflume-home-song-mosaic-thumbnail-play"
                          onClick={() => playGridSong(song)}
                          aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
                        >
                          {playing ? <PauseIcon size={18} /> : <PlayIconSmall size={18} />}
                        </button>
                      ) : null}
                    </span>
                    <div className="audioflume-home-song-mosaic-copy">
                      <span>{song.title}</span>
                      <span>{song.artist}</span>
                    </div>
                  </div>
                  {((rowIndex === 0 && row[0]?.id === song.id) || (rowIndex === 2 && row[1]?.id === song.id)) ? <button
                    type="button"
                    className="audioflume-home-song-mosaic-play"
                    onClick={() => playGridSong(song)}
                    aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
                  >
                    {playing ? <PauseIcon size={18} /> : <PlayIconSmall size={18} />}
                  </button> : null}
                </article>
              );
            })}
          </div>
        ))}
      </section>

      <section className="audioflume-home-reference-library">
        <div className="audioflume-home-reference-width audioflume-home-reference-library-grid">
          <div className="audioflume-home-reference-library-copy">
            <h2>An extensive library of music curated for film.</h2>
          </div>
          <p>
            A growing catalogue built around cinematic storytelling, featuring music and SFX
            from in-demand artists and composers. Curated to make finding distinctive, usable
            tracks faster across film, commercial and branded work.
          </p>
        </div>

        <div className="audioflume-home-reference-width audioflume-home-reference-feature-grid">
          <div>
            <h3>Human made music &amp; SFX.</h3>
            <p>
              Original work created by independent artists and sound designers,
              built around picture, pacing and story.
            </p>
          </div>
          <div>
            <h3>Playlists built around the scene.</h3>
            <p>
              Curated by people who understand how music works against picture,
              so the right track is easier to find.
            </p>
          </div>
          <div>
            <h3>Support real world artists.</h3>
            <p>
              Music comes from real artists and composers, with licensing built
              around sustainable creative work.
            </p>
          </div>
          <div>
            <h3>Subscription, premium &amp; bespoke.</h3>
            <p>
              Flexible licensing for everyday edits, larger productions, enterprise access,
              and custom commissioned work.
            </p>
          </div>
        </div>
      </section>

      <div className="audioflume-home-reference-footer-region">
        <Footer className="audioflume-home-reference-footer" />
      </div>
    </main>
  );
}
