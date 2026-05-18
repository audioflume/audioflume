"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";
import TrashIcon from "@/components/icons/TrashIcon";
import type { CuratedPlaylist, CuratedPlaylistSong } from "@/lib/curatedPlaylists";
import {
  DEFAULT_CURATED_PLAYLIST_GROUP,
  DEFAULT_DISCOVER_BUTTON_TEXT,
  DISCOVER_SECTION_OPTIONS,
} from "@/lib/curatedPlaylists";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
  smallIconButtonClass,
} from "@/components/uiClasses";

const DEFAULT_DISCOVER_SECTION = DISCOVER_SECTION_OPTIONS[0].value;

type Props = {
  mode: "create" | "edit";
  playlistId?: string;
};

function getSafeDiscoverSection(value: string | null): string {
  if (!value) return DEFAULT_DISCOVER_SECTION;

  return DISCOVER_SECTION_OPTIONS.some((option) => option.value === value)
    ? value
    : DEFAULT_DISCOVER_SECTION;
}

export default function AdminDiscoverPlaylistForm({ mode, playlistId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [kicker, setKicker] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [discoverSection, setDiscoverSection] = useState(
    getSafeDiscoverSection(searchParams.get("discoverSection")),
  );
  const [buttonEnabled, setButtonEnabled] = useState(true);
  const [buttonText, setButtonText] = useState(DEFAULT_DISCOVER_BUTTON_TEXT);
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

        if (!playlistRes.ok) throw new Error("Failed to load Discover block");
        if (!songsRes.ok) throw new Error("Failed to load Discover block songs");

        if (!cancelled) {
          setName(playlistData.name);
          setKicker(playlistData.kicker);
          setCoverImageUrl(playlistData.cover_image_url || "");
          setDescription(playlistData.description || "");
          setDiscoverSection(getSafeDiscoverSection(playlistData.discover_section));
          setButtonEnabled(playlistData.discover_button_enabled !== false);
          setButtonText(playlistData.discover_button_text || DEFAULT_DISCOVER_BUTTON_TEXT);
          setSongs(Array.isArray(songsData) ? songsData : []);
        }
      } catch (err) {
        if (!cancelled) {
          setToastMessage(err instanceof Error ? err.message : "Failed to load Discover block");
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
          playlist_group: DEFAULT_CURATED_PLAYLIST_GROUP,
          description,
          discover_section: discoverSection,
          show_on_discover: false,
          discover_button_enabled: buttonEnabled,
          discover_button_text: buttonText,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to save Discover block");

      setToastMessage(mode === "edit" ? "Discover block updated" : "Discover block created");

      if (mode === "create") {
        router.push(`/admin/playlist-manager/discover/${data.id}/edit`);
      }
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : "Failed to save Discover block");
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
              Discover block details
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage the title, copy, artwork, playlist link, and optional button used on Discover.
            </p>
          </div>

          {loading ? (
            <div className="h-96 animate-pulse rounded-xl bg-[var(--bg-tertiary)]" />
          ) : (
            <div className="grid gap-4">
              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Title
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="Quiet documentary beds"
                  required
                />
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Kicker text
                <input
                  value={kicker}
                  onChange={(event) => setKicker(event.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="Human / Minimal / Warm"
                />
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Description text
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="Describe what this Discover block is for."
                />
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Image link
                <input
                  value={coverImageUrl}
                  onChange={(event) => setCoverImageUrl(event.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="https://images.unsplash.com/..."
                />
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Discover page placement
                <select
                  value={discoverSection}
                  onChange={(event) => setDiscoverSection(event.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                >
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
                  checked={buttonEnabled}
                  onChange={(event) => setButtonEnabled(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--text-primary)]"
                />
                <span>
                  <span className="block font-medium text-[var(--text-primary)]">Show white pill button</span>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">Controls the hero-style CTA button for this Discover block.</span>
                </span>
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                White pill button text
                <input
                  value={buttonText}
                  onChange={(event) => setButtonText(event.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)] disabled:opacity-50"
                  placeholder={DEFAULT_DISCOVER_BUTTON_TEXT}
                  disabled={!buttonEnabled}
                />
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="submit" className={primaryPillButtonClass} disabled={saving}>
                  {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create Discover block"}
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

          <div className="relative mt-4 min-h-[320px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-tertiary)]">
            {coverImageUrl && (
              <Image src={coverImageUrl} alt={name || "Discover preview"} fill sizes="360px" className="object-cover" unoptimized />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/28 to-black/8" />
            <div className="relative z-10 flex min-h-[320px] flex-col justify-end p-5 text-white">
              <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/55">
                {kicker || "Kicker text"}
              </div>
              <div className="mt-2 font-[family-name:var(--font-instrument-sans)] text-3xl font-medium leading-none tracking-[-0.055em]">
                {name || "Discover block title"}
              </div>
              {description && (
                <p className="mt-3 line-clamp-3 text-xs leading-5 text-white/68">
                  {description}
                </p>
              )}
              {buttonEnabled && (
                <div className="mt-5 inline-flex h-10 w-fit items-center rounded-full bg-white px-4 text-xs font-medium text-black">
                  {buttonText || DEFAULT_DISCOVER_BUTTON_TEXT}
                </div>
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
