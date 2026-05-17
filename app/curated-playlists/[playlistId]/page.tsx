"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import SongRow from "@/components/SongRow";
import LoadingSpinner from "@/components/LoadingSpinner";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import ShuffleIconSmall from "@/components/icons/ShuffleIconSmall";
import type { CuratedPlaylist, CuratedPlaylistSong } from "@/lib/curatedPlaylists";
import { usePlayer } from "@/context/PlayerContext";

function formatSongCount(count: number) {
  return `${count} song${count === 1 ? "" : "s"}`;
}

function shuffleSongs<T>(songs: T[]) {
  const shuffled = [...songs];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export default function CuratedPlaylistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playlistId = String(params.playlistId || "");
  const { currentSong, setQueue, togglePlayPause } = usePlayer();
  const playerVisible = !!currentSong;

  const [playlist, setPlaylist] = useState<CuratedPlaylist | null>(null);
  const [songs, setSongs] = useState<CuratedPlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPlaylist() {
      try {
        setLoading(true);
        setError("");

        const [playlistRes, songsRes] = await Promise.all([
          fetch(`/api/curated-playlists/${encodeURIComponent(playlistId)}`),
          fetch(`/api/curated-playlists/${encodeURIComponent(playlistId)}/songs`),
        ]);

        const playlistData = await playlistRes.json();
        const songsData = await songsRes.json();

        if (!playlistRes.ok) {
          throw new Error(playlistData?.error || "Failed to load playlist");
        }

        if (!songsRes.ok) {
          throw new Error(songsData?.error || "Failed to load playlist songs");
        }

        if (!Array.isArray(songsData)) {
          throw new Error("Invalid playlist songs response");
        }

        if (!cancelled) {
          setPlaylist(playlistData);
          setSongs(songsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load playlist");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (playlistId) loadPlaylist();

    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  useEffect(() => {
    setQueue(songs);
  }, [songs, setQueue]);

  const topGenres = useMemo(() => {
    const counts = new Map<string, number>();

    songs.forEach((song) => {
      song.genres.forEach((genre) => {
        counts.set(genre, (counts.get(genre) || 0) + 1);
      });
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([genre]) => genre);
  }, [songs]);

  function playFirstSong() {
    const firstPlayableSong = songs.find((song) => song.audioUrl);
    if (!firstPlayableSong) return;
    setQueue(songs);
    togglePlayPause(firstPlayableSong);
  }

  function playShuffle() {
    const shuffled = shuffleSongs(songs).filter((song) => song.audioUrl);
    const firstSong = shuffled[0];
    if (!firstSong) return;
    setQueue(shuffled);
    togglePlayPause(firstSong);
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <section className="ml-[var(--sidebar-width)] min-h-screen pt-14 transition-[margin-left] duration-200">
        <div className="px-5 py-6 md:px-8 lg:px-10">
          <button
            type="button"
            onClick={() => router.push("/curated-playlists")}
            className="mb-5 text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            ← Back to curated playlists
          </button>

          {loading && (
            <div className="flex min-h-[420px] items-center justify-center rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
              <LoadingSpinner />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] p-8 text-[var(--text-secondary)]">
              {error}
            </div>
          )}

          {!loading && !error && playlist && (
            <>
              <section className="grid gap-6 rounded-[24px] border border-[var(--border)] bg-[var(--bg-secondary)] p-5 md:grid-cols-[220px_minmax(0,1fr)] md:p-7">
                <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[var(--bg-tertiary)] shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                  {playlist.cover_image_url ? (
                    <Image
                      src={playlist.cover_image_url}
                      alt={playlist.name}
                      fill
                      sizes="220px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#372f4f_0%,#111111_48%,#75649a_100%)]" />
                  )}
                </div>

                <div className="flex min-w-0 flex-col justify-end">
                  <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    {playlist.kicker}
                  </div>

                  <h1 className="mt-3 font-[family-name:var(--font-instrument-sans)] text-[clamp(42px,7vw,82px)] font-medium leading-[0.88] tracking-[-0.075em]">
                    {playlist.name}
                  </h1>

                  <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <span>{playlist.playlist_group}</span>
                    <span>·</span>
                    <span>{formatSongCount(songs.length)}</span>
                    {topGenres.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{topGenres.join(" · ")}</span>
                      </>
                    )}
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={playFirstSong}
                      disabled={!songs.some((song) => song.audioUrl)}
                      className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--text-primary)] px-5 text-sm font-semibold text-[var(--bg-primary)] transition hover:opacity-85 disabled:cursor-default disabled:opacity-40"
                    >
                      <PlayIconSmall />
                      Play
                    </button>

                    <button
                      type="button"
                      onClick={playShuffle}
                      disabled={!songs.some((song) => song.audioUrl)}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--text-muted)] disabled:cursor-default disabled:opacity-40"
                    >
                      <ShuffleIconSmall />
                      Shuffle
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-6 overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
                {songs.length === 0 ? (
                  <div className="p-8 text-sm text-[var(--text-secondary)]">
                    This curated playlist does not have songs yet.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {songs.map((song, index) => (
                      <SongRow
                        key={song.id}
                        song={song}
                        isLast={index === songs.length - 1}
                        showWaveform
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          <div
            className="pt-10"
            style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
          >
            <Footer />
          </div>
        </div>
      </section>
    </main>
  );
}
