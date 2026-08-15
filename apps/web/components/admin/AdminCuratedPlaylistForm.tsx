"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Toast from "@/components/Toast";
import DragIconSmall from "@/components/icons/DragIconSmall";
import TrashIcon from "@/components/icons/TrashIcon";
import AdminImageUpload from "@/components/admin/AdminImageUpload";
import AdminVideoUpload from "@/components/admin/AdminVideoUpload";
import type {
  CuratedBrowseSubcategory,
  CuratedBrowseTag,
  CuratedPlaylist,
  CuratedPlaylistSong,
} from "@/lib/curatedPlaylists";
import { CURATED_BROWSE_FILTERS } from "@/lib/curatedPlaylists";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
  smallIconButtonClass,
} from "@/components/uiClasses";

type Props = {
  mode: "create" | "edit";
  playlistId?: string;
};

function SortableSongRow({
  song,
  onRemove,
}: {
  song: CuratedPlaylistSong;
  onRemove: (songId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.curated_playlist_song_id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        position: "relative",
        zIndex: isDragging ? 1 : "auto",
      }}
      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-2"
    >
      <button
        type="button"
        className="flex h-10 w-7 shrink-0 cursor-grab items-center justify-center text-[var(--text-muted)] opacity-40 active:cursor-grabbing"
        aria-label={`Drag to reorder ${song.title}`}
        {...attributes}
        {...listeners}
      >
        <DragIconSmall />
      </button>
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-tertiary)]">
        {song.coverArt && (
          <Image
            src={song.coverArt}
            alt={song.title}
            fill
            sizes="40px"
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{song.title}</div>
        <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          {song.artist}
        </div>
      </div>
      <button
        type="button"
        className={smallIconButtonClass}
        onClick={() => onRemove(song.id)}
        aria-label={`Remove ${song.title}`}
      >
        <TrashIcon size={14} />
      </button>
    </div>
  );
}

function DragOverlaySongRow({ song }: { song: CuratedPlaylistSong }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-2 shadow-xl">
      <div className="flex h-10 w-7 shrink-0 items-center justify-center text-[var(--text-muted)] opacity-40">
        <DragIconSmall />
      </div>
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--bg-tertiary)]">
        {song.coverArt && (
          <Image
            src={song.coverArt}
            alt={song.title}
            fill
            sizes="40px"
            className="object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1 pr-4">
        <div className="truncate text-sm font-medium">{song.title}</div>
        <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          {song.artist}
        </div>
      </div>
    </div>
  );
}

export default function AdminCuratedPlaylistForm({ mode, playlistId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kicker, setKicker] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverVideoUrl, setCoverVideoUrl] = useState("");
  const [coverVideoTouched, setCoverVideoTouched] = useState(false);
  const [browseTags, setBrowseTags] = useState<CuratedBrowseTag[]>([]);
  const [browseSubcategories, setBrowseSubcategories] = useState<
    CuratedBrowseSubcategory[]
  >([]);
  const [showOnCuratedFeature, setShowOnCuratedFeature] = useState(false);
  const [showOnDiscover, setShowOnDiscover] = useState(false);
  const [songs, setSongs] = useState<CuratedPlaylistSong[]>([]);
  const [activeSongRowId, setActiveSongRowId] = useState<number | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const managerHref = "/admin/playlist-manager";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const activeSong = activeSongRowId
    ? (songs.find(
        (song) => song.curated_playlist_song_id === activeSongRowId,
      ) ?? null)
    : null;

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
          setCoverVideoUrl(playlistData.cover_video_url || "");
          setCoverVideoTouched(false);
          setBrowseTags(playlistData.browse_tags || []);
          setBrowseSubcategories(playlistData.browse_subcategories || []);
          setShowOnCuratedFeature(
            Boolean(playlistData.show_on_curated_feature),
          );
          setShowOnDiscover(Boolean(playlistData.show_on_discover));
          setSongs(Array.isArray(songsData) ? songsData : []);
        }
      } catch (err) {
        if (!cancelled) {
          setToastMessage(
            err instanceof Error ? err.message : "Failed to load playlist",
          );
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

    const t = window.setTimeout(() => setToastMessage(""), 2400);

    return () => window.clearTimeout(t);
  }, [toastMessage]);

  function toggleBrowseTag(tag: CuratedBrowseTag) {
    const isSelected = browseTags.includes(tag);

    if (isSelected) {
      setBrowseTags((current) => current.filter((value) => value !== tag));

      const filter = CURATED_BROWSE_FILTERS.find((item) => item.value === tag);
      if (filter) {
        const childValues = new Set<CuratedBrowseSubcategory>(
          filter.subcategories.map((subcategory) => subcategory.value),
        );
        setBrowseSubcategories((current) =>
          current.filter((value) => !childValues.has(value)),
        );
      }
      return;
    }

    setBrowseTags((current) =>
      current.includes(tag) ? current : [...current, tag],
    );
  }

  function toggleBrowseSubcategory(subcategory: CuratedBrowseSubcategory) {
    setBrowseSubcategories((current) =>
      current.includes(subcategory)
        ? current.filter((value) => value !== subcategory)
        : [...current, subcategory],
    );
  }

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
      const payload: Record<string, string | boolean | string[]> = {
        name,
        kicker,
        cover_image_url: coverImageUrl,
        browse_tags: browseTags,
        browse_subcategories: browseSubcategories,
        show_on_curated_feature: showOnCuratedFeature,
        show_on_discover: showOnDiscover,
      };

      if (coverVideoUrl || coverVideoTouched) {
        payload.cover_video_url = coverVideoUrl;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to save playlist");

      setCoverVideoTouched(false);
      setToastMessage(
        mode === "edit" ? "Playlist updated" : "Playlist created",
      );

      if (mode === "create") {
        router.push(`/admin/playlist-manager/${data.id}/edit`);
      }
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to save playlist",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSongDragStart(event: DragStartEvent) {
    setActiveSongRowId(Number(event.active.id));
  }

  async function handleSongDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveSongRowId(null);

    if (!playlistId || !over || active.id === over.id) return;

    const oldIndex = songs.findIndex(
      (song) => song.curated_playlist_song_id === Number(active.id),
    );
    const newIndex = songs.findIndex(
      (song) => song.curated_playlist_song_id === Number(over.id),
    );

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const previousSongs = songs;
    const reordered = arrayMove(songs, oldIndex, newIndex).map(
      (song, index) => ({ ...song, position: index }),
    );

    setSongs(reordered);

    try {
      const res = await fetch(
        `/api/admin/curated-playlists/${playlistId}/songs`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates: reordered.map((song, position) => ({
              id: song.curated_playlist_song_id,
              position,
            })),
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to reorder songs");
    } catch (err) {
      setSongs(previousSongs);
      setToastMessage(
        err instanceof Error ? err.message : "Failed to reorder songs",
      );
    }
  }

  async function removeSong(songId: string) {
    if (!playlistId) return;

    try {
      const res = await fetch(
        `/api/admin/curated-playlists/${playlistId}/songs/${encodeURIComponent(
          songId,
        )}`,
        { method: "DELETE" },
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to remove song");

      setSongs((current) => current.filter((song) => song.id !== songId));
      setToastMessage("Song removed");
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : "Failed to remove song",
      );
    }
  }

  const nameSlug =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled";

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="mb-5">
            <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-2xl font-medium tracking-[-0.05em]">
              Playlist details
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Add the public metadata and cover media used on Curated Playlists
              cards and rows.
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
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="Docu beds"
                  required
                />
              </label>

              <label className="grid gap-2 text-xs font-medium text-[var(--text-secondary)]">
                Kicker text
                <input
                  value={kicker}
                  onChange={(e) => setKicker(e.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="Human stories"
                />
              </label>

              <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    Browse filters
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Choose every filter this playlist should appear under. Each
                    selected filter reveals the shelf categories used after
                    filtering.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {CURATED_BROWSE_FILTERS.map((filter) => (
                    <label
                      key={filter.value}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                    >
                      <input
                        type="checkbox"
                        checked={browseTags.includes(filter.value)}
                        onChange={() => toggleBrowseTag(filter.value)}
                        className="h-4 w-4 accent-[var(--text-primary)]"
                      />
                      <span>{filter.label}</span>
                    </label>
                  ))}
                </div>

                {CURATED_BROWSE_FILTERS.filter((filter) =>
                  browseTags.includes(filter.value),
                ).map((filter) => (
                  <div
                    key={`${filter.value}-subcategories`}
                    className="grid gap-2 border-t border-[var(--border)] pt-3"
                  >
                    <div>
                      <div className="text-xs font-medium text-[var(--text-primary)]">
                        {filter.label} shelves
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        Assign this playlist to every shelf where it should
                        appear when {filter.label} is selected.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {filter.subcategories.map((subcategory) => (
                        <label
                          key={subcategory.value}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                        >
                          <input
                            type="checkbox"
                            checked={browseSubcategories.includes(
                              subcategory.value,
                            )}
                            onChange={() =>
                              toggleBrowseSubcategory(subcategory.value)
                            }
                            className="h-3.5 w-3.5 accent-[var(--text-primary)]"
                          />
                          <span>{subcategory.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={showOnCuratedFeature}
                  onChange={(e) => setShowOnCuratedFeature(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--text-primary)]"
                />
                <span>
                  <span className="block font-medium text-[var(--text-primary)]">
                    Feature on Curated Playlists
                  </span>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Adds this playlist to the featured banner on the Curated
                    Playlists page.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={showOnDiscover}
                  onChange={(e) => setShowOnDiscover(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--text-primary)]"
                />
                <span>
                  <span className="block font-medium text-[var(--text-primary)]">
                    Show in Discover curated playlists
                  </span>
                  <span className="mt-1 block text-xs text-[var(--text-muted)]">
                    Adds this playlist to the Curated Playlists shelf on the
                    main Discover page.
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  className={primaryPillButtonClass}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : mode === "edit"
                      ? "Save changes"
                      : "Create playlist"}
                </button>
                <button
                  type="button"
                  className={secondaryPillButtonClass}
                  onClick={() => router.push(managerHref)}
                >
                  Back to manager
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="grid gap-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
            <AdminImageUpload
              currentUrl={coverImageUrl}
              onUploaded={setCoverImageUrl}
              target="playlist"
              slug={nameSlug}
              variant="card"
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
            <AdminVideoUpload
              currentUrl={coverVideoUrl}
              onUploaded={(url) => {
                setCoverVideoUrl(url);
                setCoverVideoTouched(true);
              }}
              onThumbnailUploaded={(url) => {
                setCoverImageUrl(url);
              }}
              slug={nameSlug}
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
            <h3 className="font-[family-name:var(--font-aktiv-grotesk)] text-xl font-medium tracking-[-0.05em]">
              Card preview
            </h3>
            <div className="relative mt-4 min-h-[260px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-tertiary)]">
              {coverVideoUrl ? (
                <video
                  src={coverVideoUrl}
                  poster={coverImageUrl || undefined}
                  className="absolute inset-0 h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={name || "Playlist video preview"}
                />
              ) : (
                coverImageUrl && (
                  <Image
                    src={coverImageUrl}
                    alt={name || "Playlist preview"}
                    fill
                    sizes="360px"
                    className="object-cover"
                    unoptimized
                  />
                )
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative z-10 flex min-h-[260px] flex-col justify-end p-4 text-white">
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/55">
                  {kicker || "Kicker text"}
                </div>
                <div className="mt-2 font-[family-name:var(--font-aktiv-grotesk)] text-3xl font-medium leading-none tracking-[-0.055em]">
                  {name || "Playlist name"}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </form>

      {mode === "edit" && (
        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-2xl font-medium tracking-[-0.05em]">
                Songs
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Add songs from the admin music player dropdown. Drag to reorder
                or remove songs here while editing.
              </p>
            </div>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {songs.length} songs
            </span>
          </div>

          {songs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-secondary)]">
              No songs yet. Open a song in the admin music player and choose Add
              to Playlist.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleSongDragStart}
              onDragEnd={handleSongDragEnd}
            >
              <SortableContext
                items={songs.map((song) => song.curated_playlist_song_id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-2">
                  {songs.map((song) => (
                    <SortableSongRow
                      key={song.curated_playlist_song_id}
                      song={song}
                      onRemove={removeSong}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay dropAnimation={null}>
                {activeSong ? <DragOverlaySongRow song={activeSong} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </section>
      )}

      <Toast message={toastMessage} bottomOffset="24px" />
    </>
  );
}
