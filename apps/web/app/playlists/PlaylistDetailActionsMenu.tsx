"use client";

import DropdownShell from "@/components/DropdownShell";
import EditPlaylistModal from "@/components/EditPlaylistModal";
import PublishPlaylistModal from "@/components/PublishPlaylistModal";
import MoreIcon from "@/components/icons/MoreIcon";
import Toast from "@/components/Toast";
import { usePlayer } from "@/context/PlayerContext";
import { usePlaylists } from "@/hooks/usePlaylists";
import type { CommunityPlaylistCategory } from "@/lib/communityPlaylistCategories";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [heroTarget, setHeroTarget] = useState<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [saving, setSaving] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editOriginalCover, setEditOriginalCover] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const cancelRenameRef = useRef(false);
  const renameEditorRef = useRef<HTMLDivElement>(null);

  const playlist = useMemo(
    () => playlists.find((item) => String(item.id) === playlistId) ?? null,
    [playlists, playlistId],
  );

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  useEffect(() => {
    if (!isPlaylistDetail) {
      setActionsTarget(null);
      setHeroTarget(null);
      return;
    }

    const updateTargets = () => {
      const nextActionsTarget = document.querySelector<HTMLElement>(
        ".playlist-detail-page .playlist-detail-actions",
      );
      const nextHeroTarget = document.querySelector<HTMLElement>(
        ".playlist-detail-page .playlist-detail-hero > .min-w-0",
      );

      setActionsTarget((current) =>
        current === nextActionsTarget ? current : nextActionsTarget,
      );
      setHeroTarget((current) =>
        current === nextHeroTarget ? current : nextHeroTarget,
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
    setVisibilitySaving(false);
    setPublishOpen(false);
    setEditOpen(false);
    setEditName("");
    setEditCoverPreview(null);
    setEditOriginalCover(null);
    setEditSaving(false);
  }, [playlistId]);

  useEffect(() => {
    if (!renaming || !heroTarget || !playlist) return;
    const editor = renameEditorRef.current;
    if (!editor) return;

    editor.textContent = playlist.name;
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editor);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [heroTarget, playlist, renaming]);

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
        showToast(data?.error || "Couldn't rename playlist");
        return;
      }
      setPlaylists((current) =>
        current.map((item) =>
          item.id === playlist.id ? { ...item, ...data } : item,
        ),
      );
      cancelRename();
      showToast("Playlist renamed");
    } catch {
      showToast("Couldn't reach the playlist service");
    } finally {
      setSaving(false);
    }
  }

  function openEditModal() {
    if (!playlist) return;
    setMenuOpen(false);
    setEditName(playlist.name);
    setEditCoverPreview(playlist.cover_image_url ?? null);
    setEditOriginalCover(playlist.cover_image_url ?? null);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!playlist || editSaving) return;
    const cleanName = editName.trim();
    if (!cleanName) return;

    const payload: { name: string; cover_image_url?: string | null } = {
      name: cleanName,
    };
    if (editCoverPreview !== editOriginalCover) {
      payload.cover_image_url = editCoverPreview;
    }

    setEditSaving(true);
    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = parseResponse(await response.text());
      if (!response.ok) {
        showToast(data?.error || "Couldn't save playlist");
        return;
      }
      setPlaylists((current) =>
        current.map((item) =>
          item.id === playlist.id ? { ...item, ...data } : item,
        ),
      );
      setEditOpen(false);
      showToast("Changes saved");
    } catch {
      showToast("Couldn't reach the playlist service");
    } finally {
      setEditSaving(false);
    }
  }

  function togglePublic() {
    if (!playlist || visibilitySaving) return;
    setMenuOpen(false);

    if (!playlist.is_public) {
      setPublishOpen(true);
      return;
    }

    void updateVisibility(false);
  }

  async function publishPlaylist(
    primaryCategory: CommunityPlaylistCategory,
    secondaryCategories: CommunityPlaylistCategory[],
  ) {
    await updateVisibility(true, primaryCategory, secondaryCategories);
  }

  async function updateVisibility(
    nextPublic: boolean,
    primaryCategory?: CommunityPlaylistCategory,
    secondaryCategories: CommunityPlaylistCategory[] = [],
  ) {
    if (!playlist || visibilitySaving) return;
    setVisibilitySaving(true);

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          nextPublic
            ? {
                is_public: true,
                primary_category: primaryCategory,
                secondary_categories: secondaryCategories,
              }
            : { is_public: false },
        ),
      });
      const data = parseResponse(await response.text());
      if (!response.ok) {
        showToast(data?.error || "Couldn't update playlist visibility");
        return;
      }
      setPlaylists((current) =>
        current.map((item) =>
          item.id === playlist.id ? { ...item, ...data } : item,
        ),
      );
      setPublishOpen(false);
      showToast(nextPublic ? "Playlist is now public" : "Playlist is now private");
    } catch {
      showToast("Couldn't reach the playlist service");
    } finally {
      setVisibilitySaving(false);
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
        showToast(data?.error || "Couldn't delete playlist");
        return;
      }
      setPlaylists((current) =>
        current.filter((item) => item.id !== playlist.id),
      );
      setEditOpen(false);
      router.push("/playlists");
    } catch {
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
              <button type="button" role="menuitem" onClick={openEditModal}>
                Edit
              </button>
              <button type="button" role="menuitem" onClick={startRename}>
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={visibilitySaving}
                onClick={togglePublic}
              >
                {playlist.is_public ? "Make Private" : "Make Public"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => void deletePlaylist()}
              >
                Delete
              </button>
            </DropdownShell>
          </div>,
          actionsTarget,
        )
      : null;

  const visibilityAction =
    heroTarget && playlist
      ? createPortal(
          <div className="playlist-detail-hero-secondary-actions">
            <button
              type="button"
              className="playlist-detail-hero-secondary-action"
              disabled={visibilitySaving}
              onClick={togglePublic}
            >
              {visibilitySaving
                ? "Saving…"
                : playlist.is_public
                  ? "Make Private"
                  : "Make Public"}
            </button>
          </div>,
          heroTarget,
        )
      : null;

  const renameField =
    renaming && heroTarget && playlist
      ? createPortal(
          <div className="playlist-detail-rename-shell">
            <div
              ref={renameEditorRef}
              className="playlist-detail-rename-input"
              contentEditable={!saving}
              suppressContentEditableWarning
              role="textbox"
              tabIndex={0}
              spellCheck={false}
              aria-label={`Rename ${playlist.name}`}
              aria-disabled={saving}
              onInput={(event) =>
                setRenameName(event.currentTarget.textContent ?? "")
              }
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
          heroTarget,
        )
      : null;

  return (
    <>
      {menu}
      {visibilityAction}
      {renameField}
      {playlist && (
        <PublishPlaylistModal
          isOpen={publishOpen}
          playlistId={playlist.id}
          playlistName={playlist.name}
          initialPrimaryCategory={playlist.primary_category}
          initialSecondaryCategories={playlist.secondary_categories}
          isSaving={visibilitySaving}
          onClose={() => {
            if (!visibilitySaving) setPublishOpen(false);
          }}
          onPublish={(primaryCategory, secondaryCategories) =>
            void publishPlaylist(primaryCategory, secondaryCategories)
          }
        />
      )}
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
