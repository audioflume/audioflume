"use client";

import Link from "next/link";
import { AudioflumeOriginalsLogo } from "@/components/LifetimeAccessCard";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer, useIsCurrentSongPlaying } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

function HomeLifetimeSongRow({ song }: { song: Song }) {
  const { currentSong, togglePlayPause } = usePlayer();
  const playing = useIsCurrentSongPlaying(song.id);
  const active = currentSong?.id === song.id;

  return (
    <article
      className={`audioflume-home-lifetime-v2-song${active ? " is-active" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        togglePlayPause(song);
      }}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        togglePlayPause(song);
      }}
    >
      <div className="audioflume-home-lifetime-v2-song-cover">
        {song.coverArt ? (
          <img src={song.coverArt} alt="" draggable={false} />
        ) : (
          <span />
        )}
      </div>

      <div className="audioflume-home-lifetime-v2-song-copy">
        <strong className="audioflume-home-song-title">{song.title}</strong>
        <span className="audioflume-home-song-artist">{song.artist}</span>
      </div>

      <button
        type="button"
        className="audioflume-home-lifetime-v2-song-play"
        onClick={(event) => {
          event.stopPropagation();
          togglePlayPause(song);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
        aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        {playing ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
      </button>
    </article>
  );
}

export function DiscoverPricingCards() {
  return (
    <section className="audioflume-home-mockup-editorial-strip audioflume-home-reference-width">
      <Link
        href="/pricing"
        className="audioflume-home-mockup-editorial-card is-subscription audioflume-arrow-text-link"
      >
        <span>Plans for <b>solo creators</b></span>
        <div className="audioflume-home-mockup-editorial-price">
          <strong>$15</strong>
          <span>CAD / month</span>
        </div>
        <ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[2px]" />
      </Link>

      <Link
        href="/artists"
        className="audioflume-home-mockup-editorial-card is-artists audioflume-arrow-text-link"
      >
        <span>Plans for <b>studios</b></span>
        <div className="audioflume-home-mockup-editorial-price">
          <strong>$39</strong>
          <span>CAD / month</span>
        </div>
        <ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[2px]" />
      </Link>

      <Link
        href="/pricing"
        className="audioflume-home-mockup-editorial-card is-enterprise audioflume-arrow-text-link"
      >
        <span>Plans for <b>enterprise</b></span>
        <strong>For larger teams needing broader licensing and support.</strong>
        <ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[2px]" />
      </Link>
    </section>
  );
}

export function DiscoverLifetimeAccess({ originalSongs, songsLoading }: { originalSongs: Song[]; songsLoading: boolean }) {
  return (
    <div className="audioflume-home-reference-tools-originals">
          <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row audioflume-home-mockup-catalogue-heading">
            <div className="audioflume-home-originals-heading-main">
              <h2>
                Lifetime access to original{" "}
                <br className="audioflume-home-lifetime-heading-break" />
                in-house made music
              </h2>
              <div className="audioflume-home-originals-heading-pricing">
                <div className="audioflume-home-originals-heading-price is-regular">
                  <span className="audioflume-home-originals-heading-badge">Regular price</span>
                  <strong>$299</strong>
                </div>
                <div className="audioflume-home-originals-heading-price">
                  <span className="audioflume-home-originals-heading-badge is-light">Limited time offer</span>
                  <div className="audioflume-home-originals-heading-offer">
                    <strong>$99</strong>
                    <span>One time payment</span>
                  </div>
                </div>
              </div>
            </div>
            <Link
                href="/music?artist=Audioflume"
                className="audioflume-arrow-text-link inline-flex items-center gap-[5px]"
              >
                Explore original music
                <ArrowUpRightIcon
                  size={16}
                  strokeWidth={1.5}
                  className="translate-y-[2px]"
                />
              </Link>
          </div>

          <div className="audioflume-home-reference-width audioflume-home-lifetime-v2">
            <div className="audioflume-home-lifetime-v2-art">
              <img
                className="audioflume-home-lifetime-v2-image"
                src="https://images.filmwave.io/images/home/adrien-olichon-u34JNBOIQ10-unsplash-web.jpg"
                alt=""
                draggable={false}
              />

              <div className="audioflume-home-lifetime-v2-logo">
                <AudioflumeOriginalsLogo />
              </div>

              <div className="audioflume-home-lifetime-v2-meta">
                <span className="audioflume-home-lifetime-v2-meta-left">
                  LIFETIME ACCESS TO ORIGINAL IN-HOUSE MADE MUSIC
                </span>
                <span className="audioflume-home-lifetime-v2-meta-right">
                  <s>REGULAR $299</s>&nbsp;&nbsp; LIMITED TIME ONLY $99
                </span>
              </div>
            </div>

            <div className="audioflume-home-lifetime-v2-songs">
              <div className="audioflume-home-lifetime-v2-song-list">
                {songsLoading
                  ? Array.from({ length: 7 }, (_, index) => (
                      <div
                        key={index}
                        className="audioflume-home-lifetime-v2-song is-skeleton"
                      >
                        <span className="audioflume-home-lifetime-v2-song-cover" />
                        <span className="audioflume-home-lifetime-v2-song-copy" />
                        <span className="audioflume-home-lifetime-v2-song-play" />
                      </div>
                    ))
                  : originalSongs.slice(0, 7).map((song) => (
                      <HomeLifetimeSongRow key={song.id} song={song} />
                    ))}
              </div>
            </div>
          </div>
        </div>

  );
}
