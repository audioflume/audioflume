"use client";

import Footer from "@/components/Footer";
import Link from "next/link";
import GlobalMusicSearch from "@/components/GlobalMusicSearch";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import { AudioflumeMark } from "@/components/LifetimeAccessCard";
import { useHasCurrentSong } from "@/context/PlayerContext";
import { useEffect, useRef, useState } from "react";

const HOME_HERO_IMAGE =
  "https://images.filmwave.io/images/home/jakob-owens-xKfS7Hll0Ck-unsplash.jpg";

export default function HomeLandingContent() {
  const playerVisible = useHasCurrentSong();
  const carouselRef = useRef<HTMLElement>(null);
  const suppressCarouselClickRef = useRef(false);
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
      }).catch(() => {});
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
    let lastFrame = 0;
    let pausedUntil = 0;
    let frame = 0;

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

    function tick(time: number) {
      if (lastFrame && loopWidth && !dragging && time >= pausedUntil && !reducedMotion.matches) {
        offset += (loopWidth / 95000) * Math.min(time - lastFrame, 64);
        render();
      }
      lastFrame = time;
      frame = requestAnimationFrame(tick);
    }

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey || !loopWidth) return;
      // Never capture vertical page scrolling.
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      offset += event.deltaX;
      pausedUntil = performance.now() + 1300;
      render();
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      dragged = false;
      previousX = event.clientX;
      pausedUntil = performance.now() + 1300;
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
      pausedUntil = performance.now() + 1300;
      render();
    }

    function onPointerUp() {
      if (!dragging) return;
      dragging = false;
      pausedUntil = performance.now() + 1300;
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
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
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
        style={{ backgroundImage: `url("${HOME_HERO_IMAGE}")` }}
      >
        <div className="audioflume-home-reference-hero-shade" />
        <h1 className="audioflume-home-reference-hero-headline">Human made music<br className="audioflume-home-hero-responsive-break" />&amp; SFX for film</h1>
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
            {["Cinematic", "Ambient", "Emotional", "Uplifting", "Documentary", "Tension", "Piano"].map((keyword) => (
              <Link key={keyword} href={`/music?search=${encodeURIComponent(keyword)}`} className="audioflume-home-landing-keyword">
                {keyword}
              </Link>
            ))}
          </nav>
        </div>
        <div className="audioflume-home-reference-width audioflume-home-landing-brand-row">
          <p>Filmmakers working for these brands already use Audioflume.</p>
          <img src="https://images.filmwave.io/images/home/logos.png" alt="Brands using Audioflume" draggable={false} />
        </div>
      </section>

      {artists.length > 0 && (
        <section ref={carouselRef} className="audioflume-home-landing-artist-carousel" aria-label="Featured artists" onClickCapture={(event) => { if (suppressCarouselClickRef.current) { event.preventDefault(); event.stopPropagation(); } }}>
          <div className="audioflume-home-landing-artist-track">
            {[0, 1, 2, 3].map((copy) => (
              <div className="audioflume-home-landing-artist-sequence" key={copy} aria-hidden={copy > 0}>
                {artists.map((artist) => (
                  <Link key={artist.id} tabIndex={copy > 0 ? -1 : undefined} href={`/artists/${artist.slug}`} className="audioflume-home-landing-artist-card">
                    <img src={artist.hero_image_url || artist.profile_image_url || ""} alt="" loading="lazy" />
                    <span className="audioflume-home-landing-artist-title">{artist.name}</span>
                    <span className="audioflume-home-landing-artist-subtitle">{artist.designation || "Composer"}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

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
