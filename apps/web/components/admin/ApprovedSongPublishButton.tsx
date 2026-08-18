"use client";

import { useState } from "react";

type ApprovedSongPublishButtonProps = {
  songId: string;
  songTitle: string;
  disabled?: boolean;
  onPublished: (songId: string) => void;
  onError: (message: string) => void;
};

export default function ApprovedSongPublishButton({
  songId,
  songTitle,
  disabled = false,
  onPublished,
  onError,
}: ApprovedSongPublishButtonProps) {
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    if (disabled || publishing) return;

    if (!window.confirm(`Publish ${songTitle} to the public music library?`)) {
      return;
    }

    try {
      setPublishing(true);

      const response = await fetch(`/api/admin/song-reviews/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", notes: "" }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        song?: { id: string; status: string };
        error?: string;
      };

      if (!response.ok || !body.song) {
        throw new Error(body.error || "Failed to publish track");
      }

      onPublished(songId);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to publish track");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || publishing}
      onClick={() => void handlePublish()}
      className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[7px] bg-[var(--text-primary)] px-3 text-[11px] font-medium text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {publishing ? "Publishing..." : "Publish"}
    </button>
  );
}
