"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, type ReactNode } from "react";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import MusicIcon from "@/components/icons/MusicIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import WaveformIcon from "@/components/icons/WaveformIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { Song } from "@/lib/types";

const ARTIST_COUNT = 6;
const RECENT_COUNT = 6;

function formatDuration(seconds: number) {
  if (!seconds || !Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function getFallbackGradient(index: number) {
  const gradients = [
    "linear-gradient(135deg, #372f4f 0%, #111111 48%, #75649a 100%)",
    "linear-gradient(135deg, #1f3d3a 0%, #111111 52%, #4d8c7b 100%)",
    "linear-gradient(135deg, #4f3529 0%, #111111 50%, #b66c45 100%)",
    "linear-gradient(135deg, #25364f 0%, #111111 52%, #6287c4 100%)",
    "linear-gradient(135deg, #45233d 0%, #111111 52%, #b75d91 100%)",
  ];

  return gradients[index % gradients.length];
}

function sortSongsForVisuals(songs: Song[]) {
  return [...songs]
    .filter((song) => song.audioUrl)
    .sort((a, b) => {
      const aScore = (a.coverArt ? 2 : 0) + a.genres.length + a.moods.length;
      const bScore = (b.coverArt ? 2 : 0) + b.genres.length + b.moods.length;

      if (bScore !== aScore) return bScore - aScore;

      return a.title.localeCompare(b.title);
    });
}

type ArtistSpotlight = {
  artist: string;
  songCount: number;
  coverArt: string | null;
  genres: string[];
  leadSong: Song;
};

function buildArtistSpotlights(songs: Song[]): ArtistSpotlight[] {
  const artistMap = new Map<string, Song[]>();

  songs.forEach((song) => {
    const artistSongs = artistMap.get(song.artist) ?? [];
    artistSongs.push(song);
    artistMap.set(song.artist, artistSongs);
  });

  return [...artistMap.entries()]
    .map(([artist, artistSongs]) => {
      const leadSong = artistSongs.find((song) => song.coverArt) ?? artistSongs[0];

      return {
        artist,
        songCount: artistSongs.length,
        coverArt: leadSong.coverArt,
        genres: uniqueValues(artistSongs.flatMap((song) => song.genres)).slice(
          0,
          3,
        ),
        leadSong,
      };
    })
    .sort((a, b) => b.songCount - a.songCount || a.artist.localeCompare(b.artist))
    .slice(0, ARTIST_COUNT);
}

function CoverImage({
  song,
  index,
  className,
}: {
  song: Song;
  index: number;
  className: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[var(--bg-tertiary)] ${className}`}
      style={{ background: song.coverArt ? undefined : getFallbackGradient(index) }}
    >
      {song.coverArt ? (
        <Image
          src={song.coverArt}
          alt={`${song.title} cover art`}
          fill
          sizes="(min-width: 1280px) 60vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
          <WaveformIcon size={34} />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
    </div>
  );
}

function CoverBackdrop({
  song,
  index,
  className,
  children,
}: {
  song: Song;
  index: number;
  className: string;
  children?: ReactNode;
}) {
  const background = song.coverArt
    ? `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.78)), url(${song.coverArt})`
    : getFallbackGradient(index);

  return (
    <div
      className={`relative overflow-hidden bg-[var(--bg-tertiary)] bg-cover bg-center ${className}`}
      style={{ backgroundImage: background }}
    >
      {!song.coverArt && (
        <div className="absolute inset-0 flex items-center justify-center text-white/30">
          <WaveformIcon size={42} />
        </div>
      )}
      {children}
    </div>
  );
}

function PlayButton({
  song,
  size = "large",
}: {
  song: Song;
  size?: "large" | "small";
}) {
  const { currentSong, isPlaying, togglePlayPause } = usePlayer();
  const active = currentSong?.id === song.id;
  const playing = active && isPlaying;
  const buttonSize = size === "large" ? "h-12 w-12" : "h-9 w-9";
  const iconSize = size === "large" ? 20 : 15;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        togglePlayPause(song);
      }}
      className={`flex ${buttonSize} shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition hover:scale-105 disabled:cursor-default disabled:opacity-50`}
      disabled={!song.audioUrl}
      aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
    >
      {playing ? <PauseIcon size={iconSize} /> : <PlayIconSmall size={iconSize} />}
    </button>
  );
}

function TopStory({
  leadSong,
  supportingSongs,
}: {
  leadSong: Song;
  supportingSongs: Song[];
}) {
  const tags = [...leadSong.genres, ...leadSong.moods].slice(0, 3);

  return (
    <section className="overflow-hidden rounded-[34px] border border-[var(--border)] bg-[var(--bg-secondary)] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.22)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <CoverBackdrop
          song={leadSong}
          index={0}
          className="min-h-[560px] rounded-[26px]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.2),transparent_28%)]" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <div className="mb-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="max-w-[11ch] font-[family-name:var(--font-instrument-sans)] text-[clamp(44px,7vw,92px)] font-medium leading-[0.9] tracking-[-0.065em] text-white">
              {leadSong.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PlayButton song={leadSong} />
              <div className="rounded-full bg-black/30 px-4 py-2 text-sm font-medium text-white/78 backdrop-blur">
                {leadSong.artist}
              </div>
            </div>
          </div>
        </CoverBackdrop>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[26px] border border-[var(--border)] bg-[var(--bg-primary)] p-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--bg-tertiary)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <WaveformIcon size={13} />
              Visual dashboard
            </div>
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-[clamp(34px,4vw,58px)] font-medium leading-[0.94] tracking-[-0.055em] text-[var(--text-primary)]">
              Cover-led discovery for your next scene.
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
              Browse songs through artwork, artists, and quick playable cues pulled directly from the library.
            </p>
            <Link
              href="/music"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--text-primary)] px-5 text-sm font-semibold text-[var(--bg-primary)] transition hover:opacity-80"
            >
              Open full library
              <ArrowUpRightIcon />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {supportingSongs.slice(0, 4).map((song, index) => (
              <CoverBackdrop
                key={song.id}
                song={song}
                index={index + 1}
                className="min-h-[188px] rounded-[26px]"
              >
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="mb-3 flex justify-end">
                    <PlayButton song={song} size="small" />
                  </div>
                  <h3 className="line-clamp-2 font-[family-name:var(--font-instrument-sans)] text-xl font-medium leading-[1.02] tracking-[-0.04em] text-white">
                    {song.title}
                  </h3>
                  <p className="mt-1 truncate text-xs text-white/70">
                    {song.artist}
                  </p>
                </div>
              </CoverBackdrop>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SceneStrip({ songs }: { songs: Song[] }) {
  if (!songs.length) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-3xl font-medium tracking-[-0.05em] text-[var(--text-primary)]">
            Scene starters
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Image-first cues ready to preview.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {songs.map((song, index) => (
          <CoverBackdrop
            key={song.id}
            song={song}
            index={index + 7}
            className="min-h-[280px] rounded-[28px] border border-[var(--border)]"
          >
            <div className="absolute left-4 top-4 rounded-full bg-black/30 px-3 py-1 text-[11px] font-medium text-white/75 backdrop-blur">
              {[...song.genres, ...song.moods][0] ?? "Cue"}
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5">
              <div className="mb-4 flex justify-end">
                <PlayButton song={song} size="small" />
              </div>
              <h3 className="line-clamp-2 font-[family-name:var(--font-instrument-sans)] text-2xl font-medium leading-none tracking-[-0.045em] text-white">
                {song.title}
              </h3>
              <p className="mt-2 truncate text-sm text-white/72">{song.artist}</p>
            </div>
          </CoverBackdrop>
        ))}
      </div>
    </section>
  );
}

function ArtistCard({ artist, index }: { artist: ArtistSpotlight; index: number }) {
  return (
    <article className="group overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-secondary)] transition hover:border-[var(--text-muted)]">
      <div
        className="relative aspect-square overflow-hidden bg-[var(--bg-tertiary)]"
        style={{
          background: artist.coverArt ? undefined : getFallbackGradient(index),
        }}
      >
        {artist.coverArt ? (
          <Image
            src={artist.coverArt}
            alt={`${artist.artist} featured cover art`}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
            <MusicIcon size={32} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="truncate font-[family-name:var(--font-instrument-sans)] text-xl font-medium tracking-[-0.04em] text-white">
            {artist.artist}
          </h3>
          <p className="mt-1 text-xs font-medium text-white/70">
            {artist.songCount} song{artist.songCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 text-xs text-[var(--text-secondary)]">
          {artist.genres.length ? artist.genres.join(" / ") : "Featured artist"}
        </div>
        <PlayButton song={artist.leadSong} size="small" />
      </div>
    </article>
  );
}

function RecentRow({ song, index }: { song: Song; index: number }) {
  return (
    <article className="group flex items-center gap-3 rounded-2xl border border-transparent bg-[var(--bg-secondary)] p-2 transition hover:border-[var(--border)] hover:bg-[var(--bg-hover)]">
      <CoverImage song={song} index={index} className="h-16 w-16 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-[var(--text-primary)]">
          {song.title}
        </h3>
        <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
          {song.artist}
        </p>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span>{song.key || "—"}</span>
          <span>•</span>
          <span>{song.bpm ? `${song.bpm} BPM` : "—"}</span>
          <span>•</span>
          <span>{formatDuration(song.duration)}</span>
        </div>
      </div>
      <PlayButton song={song} size="small" />
    </article>
  );
}

function LoadingCard() {
  return (
    <div className="min-h-[430px] animate-pulse rounded-[32px] border border-[var(--border)] bg-[var(--bg-secondary)]" />
  );
}

export default function DashboardPage() {
  const { songs, loading, error } = useSongs();
  const { currentSong, setQueue } = usePlayer();
  const playableSongs = useMemo(() => sortSongsForVisuals(songs), [songs]);
  const imageReadySongs = useMemo(
    () =>
      [...playableSongs].sort((a, b) => {
        if (Boolean(a.coverArt) !== Boolean(b.coverArt)) {
          return a.coverArt ? -1 : 1;
        }

        return a.title.localeCompare(b.title);
      }),
    [playableSongs],
  );
  const topLeadSong = imageReadySongs[0];
  const topSupportingSongs = imageReadySongs.slice(1, 5);
  const sceneSongs = imageReadySongs.slice(5, 9);
  const artistSpotlights = useMemo(
    () => buildArtistSpotlights(playableSongs),
    [playableSongs],
  );
  const recentSongs = playableSongs.slice(-RECENT_COUNT).reverse();
  const playerVisible = !!currentSong;

  useEffect(() => {
    setQueue(playableSongs);
  }, [playableSongs, setQueue]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section
        className="min-h-screen pt-14 ml-[var(--sidebar-width)] transition-[margin-left] duration-200"
        style={{ paddingBottom: playerVisible ? "112px" : "40px" }}
      >
        <div className="px-5 py-6 md:px-8 lg:px-10">
          {loading && playableSongs.length === 0 ? (
            <LoadingCard />
          ) : error ? (
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-[var(--text-secondary)]">
              Could not load songs right now. Please try the music library again in a moment.
            </div>
          ) : topLeadSong ? (
            <>
              <TopStory
                leadSong={topLeadSong}
                supportingSongs={topSupportingSongs}
              />
              <SceneStrip songs={sceneSongs} />
            </>
          ) : (
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-[var(--text-secondary)]">
              No playable songs are available yet.
            </div>
          )}

          {(artistSpotlights.length > 0 || recentSongs.length > 0) && (
            <section className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              {artistSpotlights.length > 0 && (
                <div>
                  <div className="mb-4">
                    <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
                      Artist spotlights
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Discover contributors through their strongest visual moments.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {artistSpotlights.map((artist, index) => (
                      <ArtistCard
                        key={artist.artist}
                        artist={artist}
                        index={index + 11}
                      />
                    ))}
                  </div>
                </div>
              )}

              {recentSongs.length > 0 && (
                <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                  <div className="mb-4 flex items-center justify-between px-1">
                    <div>
                      <h2 className="font-[family-name:var(--font-instrument-sans)] text-xl font-medium tracking-[-0.04em]">
                        Quick plays
                      </h2>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Jump straight into playable library picks.
                      </p>
                    </div>
                    <MusicIcon size={16} />
                  </div>

                  <div className="grid gap-2">
                    {recentSongs.map((song, index) => (
                      <RecentRow key={song.id} song={song} index={index + 20} />
                    ))}
                  </div>
                </aside>
              )}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
