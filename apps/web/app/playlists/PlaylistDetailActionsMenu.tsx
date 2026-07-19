"use client";

import DropdownShell from "@/components/DropdownShell";
import EditPlaylistModal from "@/components/EditPlaylistModal";
import MoreIcon from "@/components/icons/MoreIcon";
import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PLAYLIST_GRADIENTS = [
  "linear-gradient(135deg,#372f4f 0%,#111111 48%,#75649a 100%)",
  "linear-gradient(135deg,#1f3d3a 0%,#111111 52%,#4d8c7b 100%)",
  "linear-gradient(135deg,#4f3529 0%,#111111 50%,#b66c45 100%)",
  "linear-gradient(135deg,#25364f 0%,#111111 52%,#6287c4 100%)",
  "linear-gradient(135deg,#45233d 0%,#111111 52%,#b75d91 100%)",
  "linear-gradient(135deg,#0f172a 0%,#111111 52%,#1e3a5f 100%)",
  "linear-gradient(135deg,#003344 0%,#111111 52%,#00516b 100%)",
  "linear-gradient(135deg,#3d2800 0%,#111111 52%,#6b4500 100%)",
  "linear-gradient(135deg,#1a0a2e 0%,#111111 52%,#2d1554 100%)",
  "linear-gradient(135deg,#0a2e0a 0%,#111111 52%,#145214 100%)",
];

function parseResponse(text: string) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function PlaylistDetailActionsMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentSong } = usePlayer();
  const { playlists, setPlaylists } = usePlaylists();
  const playlistId = pathname.match(/^\/playlists\/([^/]+)$/)?.[1] ?? null;
  const isPlaylistDetail = playlistId !== null;

  const [actionsTarget, setActionsTarget] = useState<HTMLElement | null>(null);
  const [renameTarget, setRenameTarget] = useState<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editOriginalCover, setEditOriginalCover] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const cancelRenameRef = useRef(false);

  const playlist = useMemo(
    () => playlists.find((item) => String(item.id) === playlistId) ?? null,
    [playlists, playlistId],
  );

  const playlistIndex = useMemo(() => {
    const index = playlists.findIndex((item) => String(item.id) === playlistId);
    return index >= 0 ? index : 0;
  }, [playlists, playlistId]);

  const placeholderGradient =
    PLAYLIST_GRADIENTS[playlistIndex % PLAYLIST_GRADIENTS.length];

  useEffect(() => {
    if (!isPlaylistDetail) {
      setActionsTarget(null);
      setRenameTarget(null);
      return;
    }

    const updateTargets = () => {
      const nextActionsTarget = document.querySelector<HTMLElement>(
        ".playlist-detail-page .playlist-detail-top-actions",
      );
      const nextRenameTarget = document.querySelector<HTMLElement>(
        ".playlist-detail-page .playlist-detail-hero > .min-w-0",
      );

      setActionsTarget((current) =>
        current === nextActionsTarget ? current : nextActionsTarget,
      );
      setRenameTarget((current) =>
        current === nextRenameTarget ? current : nextRenameTarget,
      );
    };

    updateTargets();

    const observer = new MutationObserver(updateTargets);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isPlaylistDetail]);

  useEffect(() => {
    setMenuOpen(false);
    setRenaming(false);
    setRenameName("");
    setSaving(false);
    setEditOpen(false);
    setEditName("");
    setEditCoverPreview(null);
    setEditOriginalCover(null);
    setEditSaving(false);
  }, [playlistId]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  function startRename() {
    if (!playlist) return;
    setMenuOpen(false);
    setRenameName(playlist.name);
    setRenaming(true);
  }

  function cancelRename() {
    setRenaming(false);
    setRenameName("");
  }

  async function saveRename() {
    if (!playlist || !renaming || saving) return;

    const cleanName = renameName.trim();

    if (!cleanName || cleanName === playlist.name) {
      cancelRename();
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName }),
      });
      const data = parseResponse(await response.text());

      if (!response.ok) {
        console.warn("Playlist rename failed", {
          status: response.status,
          statusText: response.statusText,
          response: data,
        });
        showToast(data?.error || "Couldn't rename playlist");
        return;
      }

      setPlaylists((current) =>
        current.map((item) =>
          item.id === playlist.id
            ? {
                ...item,
                ...(data || {}),
                name: data?.name || cleanName,
              }
            : item,
        ),
      );
      cancelRename();
      showToast("Playlist renamed");
    } catch (error) {
      console.warn("Playlist rename request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      showToast("Couldn't reach the playlist service");
    } finally {
      setSaving(false);
    }
  }

  function openEditModal() {
    if (!playlist) return;

    const currentCover = playlist.cover_image_url ?? null;
    setMenuOpen(false);
    setEditName(playlist.name);
    setEditCoverPreview(currentCover);
    setEditOriginalCover(currentCover);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!playlist || editSaving) return;

    const cleanName = editName.trim();
    if (!cleanName) return;

    const payload: {
      name: string;
      cover_image_url?: string | null;
    } = {
      name: cleanName,
    };

    if (editCoverPreview !== editOriginalCover) {
      payload.cover_image_url = editCoverPreview;
    }

    const diagnostics = {
      playlistId: playlist.id,
      nameChanged: cleanName !== playlist.name,
      coverChanged: editCoverPreview !== editOriginalCover,
      coverPayloadLength:
        typeof payload.cover_image_url === "string"
          ? payload.cover_image_url.length
          : 0,
    };

    setEditSaving(true);

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = parseResponse(await response.text());

      if (!response.ok) {
        console.warn("Playlist save failed", {
          ...diagnostics,
          status: response.status,
          statusText: response.statusText,
          response: data,
        });
        showToast(
          data?.stage
            ? `${data?.error || "Couldn't save playlist"} (${data.stage})`
            : data?.error || "Couldn't save playlist",
        );
        return;
      }

      setPlaylists((current) =>
        current.map((item) =>
          item.id === playlist.id
            ? {
                ...item,
                ...(data || {}),
                name: data?.name || cleanName,
                cover_image_url:
                  data?.cover_image_url !== undefined
                    ? data.cover_image_url
                    : payload.cover_image_url !== undefined
                      ? payload.cover_image_url
                      : item.cover_image_url,
              }
            : item,
        ),
      );
      setEditOpen(false);
      showToast("Changes saved");
    } catch (error) {
      console.warn("Playlist save request failed", {
        ...diagnostics,
        error: error instanceof Error ? error.message : String(error),
      });
      showToast("Couldn't reach the playlist service");
    } finally {
      setEditSaving(false);
    }
  }

  async function deletePlaylist() {
    if (!playlist || editSaving) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${playlist.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setEditSaving(true);

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: "DELETE",
      });
      const data = parseResponse(await response.text());

      if (!response.ok) {
        console.warn("Playlist delete failed", {
          status: response.status,
          statusText: response.statusText,
          response: data,
        });
        showToast(data?.error || "Couldn't delete playlist");
        return;
      }

      setPlaylists((current) =>
        current.filter((item) => item.id !== playlist.id),
      );
      setEditOpen(false);
      router.push("/playlists");
    } catch (error) {
      console.warn("Playlist delete request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      showToast("Couldn't reach the playlist service");
    } finally {
      setEditSaving(false);
    }
  }

  if (!isPlaylistDetail) return null;

  const menu =
    actionsTarget && playlist
      ? createPortal(
          <div className="playlist-detail-more-menu">
            <DropdownShell
              open={menuOpen}
              onOpenChange={setMenuOpen}
              placement="bottom-end"
              className="playlist-detail-more-dropdown"
              offsetAmount={8}
              collisionPadding={{ top: 72, right: 16, bottom: 88, left: 16 }}
              trigger={({ open }) => (
                <button
                  type="button"
                  className={`playlist-detail-more-button${open ? " is-active" : ""}`}
                  aria-label={`More actions for ${playlist.name}`}
                  aria-expanded={open}
                  title="More"
                >
                  <MoreIcon />
                </button>
              )}
            >
              <button type="button" role="menuitem" onClick={startRename}>
                Rename
              </button>
              <button type="button" role="menuitem" onClick={openEditModal}>
                Edit
              </button>
              <button type="button" role="menuitem" disabled aria-disabled="true">
                Make Public
              </button>
            </DropdownShell>
          </div>,
          actionsTarget,
        )
      : null;

  const renameField =
    renaming && renameTarget && playlist
      ? createPortal(
          <div className="playlist-detail-rename-shell">
            <input
              type="text"
              className="playlist-detail-rename-input"
              value={renameName}
              autoFocus
              disabled={saving}
              aria-label={`Rename ${playlist.name}`}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setRenameName(event.target.value)}
              onBlur={() => {
                if (cancelRenameRef.current) {
                  cancelRenameRef.current = false;
                  cancelRename();
                  return;
                }

                void saveRename();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelRenameRef.current = true;
                  event.currentTarget.blur();
                }
              }}
            />
          </div>,
          renameTarget,
        )
      : null;

  return (
    <>
      <style>{`
        .playlist-detail-page .playlist-detail-cover:not(:has(img)) {
          background: ${placeholderGradient} !important;
        }

        .playlist-detail-page .playlist-detail-top-actions > button:not(:first-child) {
          display: none !important;
        }

        .playlist-detail-page .playlist-detail-more-menu {
          grid-column: 3 !important;
          grid-row: 1 !important;
          justify-self: end;
        }

        .playlist-detail-page .playlist-detail-more-button {
          box-sizing: border-box;
          display: inline-flex;
          width: 42px;
          min-width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: 0;
          background: var(--bg-secondary);
          padding: 0;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .playlist-detail-page .playlist-detail-more-button:hover,
        .playlist-detail-page .playlist-detail-more-button.is-active {
          border-color: var(--border-hover);
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .playlist-detail-page .playlist-detail-more-button svg {
          display: block;
          width: 16px;
          height: 16px;
        }

        .playlist-detail-more-dropdown {
          min-width: 154px;
        }

        .playlist-detail-more-dropdown button:disabled {
          cursor: default;
          opacity: 0.42;
        }

        .playlist-detail-more-dropdown button:disabled:hover {
          background: transparent;
          color: inherit;
        }

        .playlist-detail-page:has(.playlist-detail-rename-shell) .playlist-detail-title {
          display: none !important;
        }

        .playlist-detail-page .playlist-detail-rename-shell {
          order: -1;
          width: min(480px, 100%);
          max-width: 480px;
        }

        .playlist-detail-page .playlist-detail-rename-input {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          height: auto;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0;
          color: var(--text-primary);
          font-family: var(--font-instrument-sans), var(--font-satoshi), sans-serif;
          font-size: clamp(22px, 2vw, 32px);
          font-weight: 400;
          letter-spacing: -0.055em;
          line-height: 0.98;
          outline: none;
        }
      `}</style>
      {menu}
      {renameField}
      <EditPlaylistModal
        isOpen={editOpen && !!playlist}
        playlist={playlist}
        name={editName}
        coverPreview={editCoverPreview}
        isSaving={editSaving}
        onNameChange={setEditName}
        onCoverPreviewChange={setEditCoverPreview}
        onSave={saveEdit}
        onDelete={deletePlaylist}
        onClose={() => {
          if (!editSaving) setEditOpen(false);
        }}
      />
      <Toast
        message={toastMessage}
        bottomOffset={currentSong ? "88px" : "24px"}
      />
    </>
  );
}
