"use client";

import Footer from "@/components/Footer";
import { AudioflumeMark } from "@/components/LifetimeAccessCard";
import { useHasCurrentSong } from "@/context/PlayerContext";

const HOME_HERO_IMAGE =
  "https://images.filmwave.io/images/home/natalie-parham-9Qccv5rZtRM-unsplash.jpg";

export default function HomeLandingContent() {
  const playerVisible = useHasCurrentSong();

  return (
    <main
      className={`audioflume-home-reference audioflume-home-landing${playerVisible ? " has-player" : ""}`}
    >
      <section
        className="audioflume-home-reference-hero"
        style={{ backgroundImage: `url("${HOME_HERO_IMAGE}")` }}
      >
        <div className="audioflume-home-reference-hero-shade" />
        <div
          className="audioflume-home-reference-hero-headline"
          aria-label="Human made music and SFX for film."
        >
          <span className="is-human">Human</span>
          <span className="is-made">Made</span>
          <span className="is-music">Music</span>
          <span className="is-amp">&amp;</span>
          <span className="is-sfx">SFX</span>
          <span className="is-for-film">For film.</span>
          <AudioflumeMark
            className="audioflume-home-reference-hero-mark"
            ariaHidden
          />
        </div>
        <div
          className="audioflume-home-reference-width audioflume-home-reference-hero-trust"
        >
          <p>Filmmakers working for these brands already use Audioflume.</p>
          <div
            className="audioflume-home-reference-logo-row"
            aria-label="Brand work"
          >
            <img
              src="https://images.filmwave.io/images/home/logos.png"
              alt="Brands using Audioflume"
              draggable={false}
            />
          </div>
        </div>
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
