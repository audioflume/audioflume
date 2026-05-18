"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";
import TrashIcon from "@/components/icons/TrashIcon";
import type { CuratedPlaylist, CuratedPlaylistSong } from "@/lib/curatedPlaylists";
import {
  CURATED_PLAYLIST_GROUPS,
  DEFAULT_CURATED_PLAYLIST_GROUP,
  DISCOVER_SECTION_NONE,
  DISCOVER_SECTION_OPTIONS,
} from "@/lib/curatedPlaylists";
import { primaryPillButtonClass, secondaryPillButtonClass, smallIconButtonClass } from "@/components/uiClasses";

type Props = {
  mode: "create" | "edit";
  playlistId?: string;
};

export default function AdminCuratedPlaylistForm({ mode, playlistId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDiscoverSection = searchParams.get("discoverSection") || DISCOVER_SECTION_NONE;
  const [name, setName] = useState("");
  const [kicker, setKicker] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [playlistGroup, setPlaylistGroup] = useState(DEFAULT_CURATED_PLAYLIST_GROUP);
  const [discoverSection, setDiscoverSection] = useState(
    DISCOVER_SECTION_OPTIONS.some((option) => option.value === initialDiscoverSection)
      ? initialDiscoverSection
      : DISCOVER_SECTION_NONE,
  );
  const [showOnDiscover, setShowOnDiscover] = useState(false);
  const [songs, setSongs] = useState<CuratedPlaylistSong[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !playlistId) return;

    let cancelled = false;

    async function loadPlaylist() {
      try {
        setLoading(true);
        const [playlistRes, songsRes] = await Promise.all([
          fetch(`/api/curated-playlists/${playlistId}`),
          fetch(`/api/admin/curated-playlists/${playlistId}/songs`),
        ]);
        const playlistData = (await playlistRes.json()) as CuratedPlaylist;
        const songsData = await songsRes.json();

        if (!playlistRes.ok) throw new Error("Failed to load playlist");
        if (!songsRes.ok) throw new Error("Failed to load playlist songs");

        if (!cancelled) {
          setName(playlistData.name);
          setKicker(playlistData.kicker);
          setCoverImageUrl(playlistData.cover_image_url || "");
          setDescription(playlistData.description || "");
          setPlaylistGroup(playlistData.playlist_group || DEFAULT_CURATED_PLAYLIST_GROUP);
          setDiscoverSection(playlistData.discover_section || DISCOVER_SECTION_NONE);
          setShowOnDiscover(Boolean(playlistData.show_on_discover));
          setSongs(Array.isArray(songsData) ? songsData : []);
        }
      } catch (err) {
        if (!cancelled) {
          setToastMessage(err instanceof Error ? err.message : "Failed to load playlist");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlaylist();

    return () => {
      cancelled = true;
    };
  }, [mode, playlistId]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      const endpoint =
        mode === "edit" && playlistId
          ? `/api/admin/curated-playlists/${playlistId}`
          : "/api/admin/curated-playlists";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          kicker,
          cover_image_url: coverImageUrl,
          playlist_group: playlistGroup,
          description,
          discover_section: discoverSection || null,
          show_on_discover: showOnDiscover,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to save playlist");

      setToastMessage(mode === "edit" ? "Playlist updated" : "Playlist created");

      if (mode === "create") {
        router.push(`/admin/playlist-manager/${data.id}/edit`);
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Failed to save playlist");
    } finally {
      setSaving(false);
    }
  }

  async function removeSong(songId: string) {
    if (!playlistId) return;

    try {
      const res = await fetch(
        `/api/admin/curated-playlists/${playlistId}/songs/${encodeURIComponent(songId)}`,
        { method: "DELETE" },
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to remove song");

      setSongs((current) => current.filter((song) => song.id !== songId));
      setToastMessage("Song removed");
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Failed to remove song");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="mb-5">
            <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
              Playlist details
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Add the public metadata used on Curated Playlists cards and rows.
            </p>
          </div>

          {loading ? (
            <div className="h-72 animate-pulse rounded-xl bg-[var(--bg-tertiary)]" />
          ) : (
            <div className="grid gap-4">
              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Playlist name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="Docu beds"
                  required
                />
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Kicker text
                <input
                  value={kicker}
                  onChange={(event) => setKicker(event.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="Human stories"
                />
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Description text
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="Describe what this playlist or discover block is for."
                />
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Unsplash photo link
                <input
                  value={coverImageUrl}
                  onChange={(event) => setCoverImageUrl(event.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="https://images.unsplash.com/..."
                />
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Playlist group
                <select
                  value={playlistGroup}
                  onChange={(event) => setPlaylistGroup(event.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                >
                  {CURATED_PLAYLIST_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Discover page placement
                <select
                  value={discoverSection}
                  onChange={(event) => setDiscoverSection(event.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                >
                  <option value={DISCOVER_SECTION_NONE}>Not placed on a main block</option>
                  {Array.from(new Set(DISCOVER_SECTION_OPTIONS.map((option) => option.category))).map((category) => (
                    <optgroup key={category} label={category}>
                      {DISCOVER_SECTION_OPTIONS.filter((option) => option.category === category).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={showOnDiscover}
                  onChange={(event) => setShowOnDiscover(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--text-primary)]"
                />
                <span>
                  <span className="block font-medium text-[var(--text-primary)]">Show in Discover curated playlists</span>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">Adds this playlist to the Curated Playlists shelf on the main Discover page.</span>
                </span>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="submit" className={primaryPillButtonClass} disabled={saving}>
                  {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create playlist"}
                </button>
                <button
                  type="button"
                  className={secondaryPillButtonClass}
                  onClick={() => router.push("/admin/playlist-manager")}
                >
                  Back to manager
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <h3 className="font-[family-name:var(--font-instrument-sans)] text-xl font-medium tracking-[-0.05em]">
            Card preview
          </h3>

          <div className="relative mt-4 min-h-[260px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-tertiary)]">
            {coverImageUrl && (
              <Image src={coverImageUrl} alt={name || "Playlist preview"} fill sizes="360px" className="object-cover" unoptimized />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative z-10 flex min-h-[260px] flex-col justify-end p-4 text-white">
              <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/55">
                {kicker || "Kicker text"}
              </div>
              <div className="mt-2 font-[family-name:var(--font-instrument-sans)] text-3xl font-medium leading-none tracking-[-0.055em]">
                {name || "Playlist name"}
              </div>
              <div className="mt-3 text-[11px] font-medium text-white/58">
                {discoverSection ? DISCOVER_SECTION_OPTIONS.find((option) => option.value === discoverSection)?.label : playlistGroup}
              </div>
              {description && (
                <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/68">
                  {description}
                </p>
              )}
            </div>
          </div>
        </aside>
      </form>

      {mode === "edit" && (
        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
                Songs
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Add songs from the admin music player dropdown. Remove songs here while editing.
              </p>
            </div>
            <span className="text-xs font-medium text-[var(--text-muted)]">{songs.length} songs</span>
          </div>

          {songs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-secondary)]">
              No songs yet. Open a song in the admin music player and choose Add to Playlist.
            </div>
          ) : (
            <div className="grid gap-2">
              {songs.map((song) => (
                <div key={song.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-2">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-tertiary)]">
                    {song.coverArt && <Image src={song.coverArt} alt={song.title} fill sizes="40px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{song.title}</div>
                    <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{song.artist}</div>
                  </div>
                  <button type="button" className={smallIconButtonClass} onClick={() => removeSong(song.id)} aria-label={`Remove ${song.title}`}>
                    <TrashIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Toast message={toastMessage} bottomOffset="24px" />
    </>
  );
}
