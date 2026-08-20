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
import {
  BackendButton,
  BackendCheckbox,
} from "@/components/backend/BackendControls";
import BackendDragHandle from "@/components/backend/BackendDragHandle";
import DragIconSmall from "@/components/icons/DragIconSmall";
import AdminBrowseFilterSubcategoryGroup from "@/components/admin/AdminBrowseFilterSubcategoryGroup";
import AdminImageUpload from "@/components/admin/AdminImageUpload";
import AdminVideoUpload from "@/components/admin/AdminVideoUpload";
import type {
  CuratedBrowseTag,
  CuratedPlaylist,
  CuratedPlaylistSong,
} from "@/lib/curatedPlaylists";
import { CURATED_BROWSE_FILTERS } from "@/lib/curatedPlaylists";
import type {
  CuratedBrowseAssignment,
  CuratedBrowseTaxonomy,
} from "@/lib/curatedBrowseTaxonomy";

type Props = {
  mode: "create" | "edit";
  playlistId?: string;
};

type PlaylistWithBrowseAssignments = CuratedPlaylist & {
  browse_assignments?: CuratedBrowseAssignment[];
};

type BrowseAssignmentState = Partial<Record<CuratedBrowseTag, number[]>>;

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
      <BackendDragHandle
        aria-label={`Drag to reorder ${song.title}`}
        {...attributes}
        {...listeners}
      />
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
        onClick={() => onRemove(song.id)}
        className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary-danger"
        aria-label={`Remove ${song.title}`}
      >
        Remove
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
  const [browseAssignments, setBrowseAssignments] =
    useState<BrowseAssignmentState>({});
  const [browseTaxonomy, setBrowseTaxonomy] =
    useState<CuratedBrowseTaxonomy | null>(null);
  const [showOnCuratedFeature, setShowOnCuratedFeature] = useState(false);
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
    let cancelled = false;

    async function loadBrowseTaxonomy() {
      try {
        const res = await fetch("/api/curated-browse-taxonomy");
        const data = (await res.json()) as CuratedBrowseTaxonomy & {
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load browse subcategories");
        }

        if (!cancelled) setBrowseTaxonomy(data);
      } catch (err) {
        if (!cancelled) {
          setToastMessage(
            err instanceof Error
              ? err.message
              : "Failed to load browse subcategories",
          );
        }
      }
    }

    void loadBrowseTaxonomy();

    return () => {
      cancelled = true;
    };
  }, []);

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
        const playlistData =
          (await playlistRes.json()) as PlaylistWithBrowseAssignments;
        const songsData = await songsRes.json();

        if (!playlistRes.ok) throw new Error("Failed to load playlist");
        if (!songsRes.ok) throw new Error("Failed to load playlist songs");

        if (!cancelled) {
          const nextBrowseAssignments: BrowseAssignmentState = {};
          for (const assignment of playlistData.browse_assignments ?? []) {
            const current = nextBrowseAssignments[assignment.browse_filter] ?? [];
            if (!current.includes(assignment.subcategory_id)) {
              nextBrowseAssignments[assignment.browse_filter] = [
                ...current,
                assignment.subcategory_id,
              ];
            }
          }

          setName(playlistData.name);
          setKicker(playlistData.kicker);
          setCoverImageUrl(playlistData.cover_image_url || "");
          setCoverVideoUrl(playlistData.cover_video_url || "");
          setCoverVideoTouched(false);
          setBrowseTags(playlistData.browse_tags || []);
          setBrowseAssignments(nextBrowseAssignments);
          setShowOnCuratedFeature(
            Boolean(playlistData.show_on_curated_feature),
          );
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
      setBrowseAssignments((current) => {
        const next = { ...current };
        delete next[tag];
        return next;
      });
      return;
    }

    setBrowseTags((current) =>
      current.includes(tag) ? current : [...current, tag],
    );
  }

  function toggleBrowseSubcategory(
    browseFilter: CuratedBrowseTag,
    subcategoryId: number,
  ) {
    setBrowseAssignments((current) => {
      const selected = current[browseFilter] ?? [];
      return {
        ...current,
        [browseFilter]: selected.includes(subcategoryId)
          ? selected.filter((id) => id !== subcategoryId)
          : [...selected, subcategoryId],
      };
    });
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
      const payload: Record<string, unknown> = {
        name,
        kicker,
        cover_image_url: coverImageUrl,
        browse_tags: browseTags,
        browse_assignments: browseTags.flatMap((browseFilter) =>
          (browseAssignments[browseFilter] ?? []).map((subcategoryId) => ({
            browse_filter: browseFilter,
            subcategory_id: subcategoryId,
          })),
        ),
        show_on_curated_feature: showOnCuratedFeature,
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
        <div className="admin-playlist-main-stack grid min-w-0 gap-4">
          <section className="admin-playlist-section-card admin-playlist-details-card">
            <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-2xl font-medium tracking-[-0.05em]">
              Playlist details
            </h2>

            {loading ? (
              <div className="h-28 animate-pulse rounded-xl bg-[var(--bg-tertiary)]" />
            ) : (
              <div className="admin-playlist-fields grid gap-4">
                <input
                  aria-label="Playlist name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="Playlist Name"
                  required
                />

                <input
                  aria-label="Kicker text"
                  value={kicker}
                  onChange={(e) => setKicker(e.target.value)}
                  className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                  placeholder="Kicker Text"
                />
              </div>
            )}
          </section>

          {!loading && (
            <>
              <section className="admin-playlist-section-card admin-playlist-browse-card">
                <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-2xl font-medium tracking-[-0.05em]">
                  Browse filters
                </h2>

                <div className="admin-playlist-browse-grid grid gap-2 sm:grid-cols-2">
                  {CURATED_BROWSE_FILTERS.map((filter) => (
                    <BackendCheckbox
                      key={filter.value}
                      checked={browseTags.includes(filter.value)}
                      onChange={() => toggleBrowseTag(filter.value)}
                      label={filter.label}
                      size="sm"
                      className="w-full rounded-lg border border-[var(--border)] px-3 text-[var(--text-secondary)]"
                    />
                  ))}
                </div>
              </section>

              {browseTaxonomy &&
                browseTaxonomy.filters
                  .filter((filter) => browseTags.includes(filter.value))
                  .map((filter) => (
                    <AdminBrowseFilterSubcategoryGroup
                      key={`${filter.value}-subcategories`}
                      filter={filter}
                      taxonomy={browseTaxonomy}
                      selectedIds={browseAssignments[filter.value] ?? []}
                      onToggleAssignment={(subcategoryId) =>
                        toggleBrowseSubcategory(filter.value, subcategoryId)
                      }
                      onTaxonomyChange={setBrowseTaxonomy}
                      onDeletedSubcategories={(subcategoryIds) => {
                        const deletedIds = new Set(subcategoryIds);
                        setBrowseAssignments((current) => {
                          const next = { ...current };
                          for (const browseFilter of CURATED_BROWSE_FILTERS) {
                            const selected = next[browseFilter.value];
                            if (!selected) continue;
                            next[browseFilter.value] = selected.filter(
                              (subcategoryId) => !deletedIds.has(subcategoryId),
                            );
                          }
                          return next;
                        });
                      }}
                      onToast={setToastMessage}
                    />
                  ))}

              <div className="admin-playlist-actions flex flex-wrap justify-between gap-3 pt-2">
                <BackendButton
                  type="button"
                  onClick={() => router.push(managerHref)}
                >
                  Back to manager
                </BackendButton>
                <BackendButton
                  type="submit"
                  variant="primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : mode === "edit"
                      ? "Save changes"
                      : "Create playlist"}
                </BackendButton>
              </div>
            </>
          )}
        </div>

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
        </aside>
      </form>

      {mode === "edit" && (
        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-2xl font-medium tracking-[-0.05em]">
                Songs
              </h2>
            </div>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {songs.length} songs
            </span>
          </div>

          {songs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm font-normal leading-5 text-[var(--text-secondary)]">
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