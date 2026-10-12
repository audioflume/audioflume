"use client";

import { useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/ModalShell";
import {
  modalCancelButtonClass,
  modalFieldLabelClass,
  modalPrimaryButtonClass,
} from "@/components/uiClasses";
import {
  COMMUNITY_PLAYLIST_CATEGORIES,
  type CommunityPlaylistCategory,
  suggestCommunityPlaylistCategories,
} from "@/lib/communityPlaylistCategories";

type PlaylistSongCategoryData = {
  genres?: string[] | null;
  moods?: string[] | null;
};

type PublishPlaylistModalProps = {
  isOpen: boolean;
  playlistId: number;
  playlistName: string;
  initialPrimaryCategory?: string | null;
  initialSecondaryCategories?: string[] | null;
  isSaving: boolean;
  onClose: () => void;
  onPublish: (
    primaryCategory: CommunityPlaylistCategory,
    secondaryCategories: CommunityPlaylistCategory[],
  ) => void;
};

export default function PublishPlaylistModal({
  isOpen,
  playlistId,
  playlistName,
  initialPrimaryCategory = null,
  initialSecondaryCategories = [],
  isSaving,
  onClose,
  onPublish,
}: PublishPlaylistModalProps) {
  const [primaryCategory, setPrimaryCategory] =
    useState<CommunityPlaylistCategory | null>(null);
  const [secondaryCategories, setSecondaryCategories] = useState<
    CommunityPlaylistCategory[]
  >([]);
  const [suggestedCategories, setSuggestedCategories] = useState<
    CommunityPlaylistCategory[]
  >([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const validInitialPrimary = COMMUNITY_PLAYLIST_CATEGORIES.find(
      (category) => category === initialPrimaryCategory,
    );
    const safeInitialSecondary = Array.isArray(initialSecondaryCategories)
      ? initialSecondaryCategories
      : [];
    const validInitialSecondary = safeInitialSecondary
      .filter((category): category is CommunityPlaylistCategory =>
        COMMUNITY_PLAYLIST_CATEGORIES.includes(
          category as CommunityPlaylistCategory,
        ),
      )
      .filter((category) => category !== validInitialPrimary)
      .slice(0, 2);

    setPrimaryCategory(validInitialPrimary ?? null);
    setSecondaryCategories(validInitialSecondary);
    setSuggestedCategories([]);

    let cancelled = false;
    setLoadingSuggestions(true);

    fetch(`/api/playlists/${playlistId}/songs`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? (data as PlaylistSongCategoryData[]) : [];
      })
      .then((songs) => {
        if (cancelled) return;

        const suggestions = suggestCommunityPlaylistCategories(
          playlistName,
          songs,
        );
        setSuggestedCategories(suggestions);

        if (!validInitialPrimary && suggestions[0]) {
          setPrimaryCategory(suggestions[0]);
          setSecondaryCategories(suggestions.slice(1, 3));
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestedCategories([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSuggestions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    initialPrimaryCategory,
    initialSecondaryCategories,
    isOpen,
    playlistId,
    playlistName,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  const suggestionCopy = useMemo(() => {
    if (loadingSuggestions) return "Reviewing the songs in this playlist…";
    if (suggestedCategories.length === 0) {
      return "Choose the category that best describes the playlist’s intended use.";
    }
    return `Suggested from the playlist: ${suggestedCategories.join(", ")}`;
  }, [loadingSuggestions, suggestedCategories]);

  if (!isOpen) return null;

  function choosePrimary(category: CommunityPlaylistCategory) {
    setPrimaryCategory(category);
    setSecondaryCategories((current) =>
      current.filter((item) => item !== category),
    );
  }

  function toggleSecondary(category: CommunityPlaylistCategory) {
    if (category === primaryCategory) return;

    setSecondaryCategories((current) => {
      if (current.includes(category)) {
        return current.filter((item) => item !== category);
      }
      if (current.length >= 2) return current;
      return [...current, category];
    });
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title="Choose where this playlist belongs"
      onClose={isSaving ? () => {} : onClose}
      closeLabel="Close publish playlist dialog"
      maxWidth="max-w-[600px]"
      maxHeight="650px"
      bodyScroll
      bodyClassName="min-h-0 flex-1 px-5 pb-2"
      footerClassName="justify-between"
      footer={
        <div className="flex w-full items-center justify-between gap-5 max-[640px]:flex-col max-[640px]:items-stretch">
          <p className="m-0 text-[11px] text-[var(--text-muted)]">
            Public playlists can appear in a maximum of three categories.
          </p>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className={modalCancelButtonClass}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!primaryCategory || isSaving}
              onClick={() => {
                if (primaryCategory) {
                  onPublish(primaryCategory, secondaryCategories);
                }
              }}
              className={modalPrimaryButtonClass}
            >
              {isSaving ? "Publishing…" : "Make Public"}
            </button>
          </div>
        </div>
      }
    >
      <p className="mb-5 mt-0 text-center text-xs leading-5 text-[var(--text-muted)]">
        {suggestionCopy}
      </p>

      <section className="border-t border-[var(--border)] py-5">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <span className={modalFieldLabelClass}>Primary category</span>
          <span className="text-[10.5px] text-[var(--text-muted)]">Required</span>
        </div>

        <div className="grid grid-cols-4 gap-2 max-[640px]:grid-cols-2">
          {COMMUNITY_PLAYLIST_CATEGORIES.map((category) => {
            const selected = primaryCategory === category;

            return (
              <button
                type="button"
                key={`primary-${category}`}
                aria-pressed={selected}
                onClick={() => choosePrimary(category)}
                className={`min-h-[38px] border px-2.5 text-[11.5px] font-normal transition-colors ${
                  selected
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                    : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[var(--border)] py-5">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <span className={modalFieldLabelClass}>Related categories</span>
          <span className="text-[10.5px] text-[var(--text-muted)]">
            {secondaryCategories.length}/2 selected
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 max-[640px]:grid-cols-2">
          {COMMUNITY_PLAYLIST_CATEGORIES.map((category) => {
            const isPrimary = category === primaryCategory;
            const isSelected = secondaryCategories.includes(category);
            const isAtLimit = secondaryCategories.length >= 2 && !isSelected;

            return (
              <button
                type="button"
                key={`secondary-${category}`}
                aria-pressed={isSelected}
                disabled={isPrimary || isAtLimit}
                onClick={() => toggleSecondary(category)}
                className={`min-h-[38px] border px-2.5 text-[11.5px] font-normal transition-colors disabled:cursor-default disabled:opacity-40 ${
                  isSelected
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                    : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>
    </ModalShell>
  );
}
