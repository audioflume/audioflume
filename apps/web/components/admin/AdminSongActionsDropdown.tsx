"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import AdminAddToPlaylistModal from "@/components/admin/AdminAddToPlaylistModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { Song } from "@/lib/types";
import { songHasMissingEditPoints } from "@/lib/songHealth";
import DropdownShell from "@/components/DropdownShell";
import type { Padding, Placement, Strategy } from "@floating-ui/react";

type AdminSongActionsDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songId: string;
  songTitle?: string;
  audioUrl?: string | null;
  song?: Song | null;
  trigger: (props: { open: boolean }) => ReactNode;
  placement?: Placement;
  className?: string;
  strategy?: Strategy;
  usePortal?: boolean;
  offsetAmount?: number;
  flippedOffsetAmount?: number;
  collisionPadding?: Padding;
  onDeleted?: (songId: string) => void;
  onClosePlayer?: () => void;
  showDelete?: boolean;
};

const DEFAULT_COLLISION_PADDING: Padding = {
  top: 112,
  right: 16,
  bottom: 96,
  left: 16,
};

function dispatchAnalyzingState(songId: string, analyzing: boolean) {
  window.dispatchEvent(
    new CustomEvent("admin-song-edit-point-analyzing", {
      detail: { songId, analyzing },
    }),
  );
}

export default function AdminSongActionsDropdown({
  open,
  onOpenChange,
  songId,
  songTitle = "this song",
  audioUrl,
  song,
  trigger,
  placement = "bottom-end",
  className = "song-more-dropdown",
  strategy = "fixed",
  usePortal = true,
  offsetAmount = 6,
  flippedOffsetAmount = 6,
  collisionPadding = DEFAULT_COLLISION_PADDING,
  onDeleted,
  showDelete = true,
}: AdminSongActionsDropdownProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);

  const hasEditPoints = song ? !songHasMissingEditPoints(song) : false;
  const editPointsHref = `/admin/songs/${songId}/edit-points?from=music-library`;

  const copyAudioUrl = async () => {
    if (!audioUrl) return;

    await navigator.clipboard.writeText(audioUrl);
    onOpenChange(false);
  };

  const analyzeEditPoints = async () => {
    if (!audioUrl || isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      dispatchAnalyzingState(songId, true);

      const res = await fetch(`/api/admin/songs/${songId}/analyze-edit-points`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to analyze cue points");
      }

      window.dispatchEvent(
        new CustomEvent("admin-song-edit-points-updated", {
          detail: { songId, saved: data.saved ?? 0 },
        }),
      );

      onOpenChange(false);
      window.alert(`Saved ${data.saved ?? 0} cue points for "${songTitle}".`);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to analyze cue points",
      );
    } finally {
      setIsAnalyzing(false);
      dispatchAnalyzingState(songId, false);
    }
  };

  const deleteSong = async () => {
    const confirmed = window.confirm(
      `Delete "${songTitle}"? This will remove the song from Airtable and delete its uploaded files from Cloudflare.`,
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);

      const res = await fetch(`/api/admin/songs/${songId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete song");
      }

      onOpenChange(false);
      onDeleted?.(songId);

      window.dispatchEvent(
        new CustomEvent("admin-song-deleted", {
          detail: { songId },
        }),
      );
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to delete song",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownShell
        open={open}
        onOpenChange={onOpenChange}
        placement={placement}
        strategy={strategy}
        usePortal={usePortal}
        className={className}
        offsetAmount={offsetAmount}
        flippedOffsetAmount={flippedOffsetAmount}
        collisionPadding={collisionPadding}
        trigger={trigger}
      >
        <Link
          href={`/admin/songs/${songId}/edit`}
          onClick={() => onOpenChange(false)}
        >
          Edit Details
        </Link>

        {audioUrl ? (
          <a
            href={audioUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => onOpenChange(false)}
          >
            Open Audio
          </a>
        ) : (
          <button type="button" disabled>
            Open Audio
          </button>
        )}

        <button type="button" onClick={copyAudioUrl} disabled={!audioUrl}>
          Copy Audio URL
        </button>

        {hasEditPoints ? (
          <Link href={editPointsHref} onClick={() => onOpenChange(false)}>
            Cue Point Manager
          </Link>
        ) : (
          <button
            type="button"
            onClick={analyzeEditPoints}
            disabled={!audioUrl || isAnalyzing}
          >
            <span className="inline-flex items-center gap-2">
              {isAnalyzing && (
                <LoadingSpinner size={12} stroke={12} color="currentColor" />
              )}
              {isAnalyzing ? "Analyzing..." : "Analyze Cue Points"}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            setPlaylistModalOpen(true);
          }}
          disabled={!song}
        >
          Add to Playlist
        </button>

        {showDelete && (
          <button
            type="button"
            onClick={deleteSong}
            disabled={isDeleting}
            className="danger-hover"
          >
            {isDeleting ? "Deleting..." : "Delete Song"}
          </button>
        )}
      </DropdownShell>

      <AdminAddToPlaylistModal
        isOpen={playlistModalOpen}
        song={song || null}
        onClose={() => setPlaylistModalOpen(false)}
      />
    </>
  );
}
