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
    Promise.all([
      fetch("/api/discover-featured-artists", { signal: controller.signal }).then((res) => res.json()),
      fetch("/api/discover-feature-card-artists", { signal: controller.signal }).then((res) => res.json()),
    ]).then(([featured, cards]) => {
      const combined = [
        ...(Array.isArray(featured?.artists) ? featured.artists : []),
        ...(Array.isArray(cards?.artists) ? cards.artists : []),
      ];
      if (!controller.signal.aborted) {
        setArtists(Array.from(new Map(combined.map((artist) => [artist.id, artist])).values())
          .filter((artist) => artist.hero_image_url || artist.profile_image_url));
      }
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const viewport = carouselRef.current;
    if (!viewport || artists.length === 0) return;

    const getLoopWidth = () =>
      (viewport.firstElementChild?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    let loopWidth = getLoopWidth();
    if (!loopWidth) return;
    viewport.scrollLeft = loopWidth;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let dragging = false;
    let dragged = false;
    let startX = 0;
    let startScroll = 0;
    let lastFrame = 0;
    let frame = 0;

    function wrap() {
      if (!viewport || !loopWidth) return;
      if (viewport.scrollLeft >= loopWidth * 2) viewport.scrollLeft -= loopWidth;
      if (viewport.scrollLeft < loopWidth) viewport.scrollLeft += loopWidth;
    }

    function tick(time: number) {
      if (lastFrame && !dragging && !reducedMotion.matches) {
        viewport!.scrollLeft += (loopWidth / 95000) * Math.min(time - lastFrame, 64);
        wrap();
      }
      lastFrame = time;
      frame = requestAnimationFrame(tick);
    }

    function onWheel(event: WheelEvent) {
      if (event.ctrlKey) return;
      const delta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      viewport!.scrollLeft += delta;
      wrap();
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      dragged = false;
      startX = event.clientX;
      startScroll = viewport!.scrollLeft;
    }
    function onPointerMove(event: PointerEvent) {
      if (!dragging) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 5 && !dragged) {
        dragged = true;
        viewport!.setPointerCapture(event.pointerId);
      }
      viewport!.scrollLeft = startScroll - delta;
      wrap();
      if (loopWidth && (viewport!.scrollLeft !== startScroll - delta)) {
        startScroll = viewport!.scrollLeft + delta;
      }
    }
    function onPointerUp() {
      dragging = false;
      if (dragged) {
        suppressCarouselClickRef.current = true;
        window.setTimeout(() => { suppressCarouselClickRef.current = false; }, 0);
      }
    }
    function onResize() {
      const newWidth = getLoopWidth();
      if (!newWidth) return;
      const fraction = loopWidth ? (viewport!.scrollLeft - loopWidth) / loopWidth : 0;
      loopWidth = newWidth;
      viewport!.scrollLeft = loopWidth * (1 + fraction);
      wrap();
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", onResize);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
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
