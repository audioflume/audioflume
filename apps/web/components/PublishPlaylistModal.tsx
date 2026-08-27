"use client";

import { useEffect, useMemo, useState } from "react";
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
    <div
      className="publish-playlist-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <section
        className="publish-playlist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-playlist-title"
      >
        <header className="publish-playlist-modal-header">
          <div>
            <p className="publish-playlist-modal-kicker">Community Playlist</p>
            <h2 id="publish-playlist-title">
              Choose where this playlist belongs
            </h2>
            <p>{suggestionCopy}</p>
          </div>
          <button
            type="button"
            aria-label="Close publish playlist dialog"
            disabled={isSaving}
            onClick={onClose}
          >
            <svg width="19" height="19" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="m2.25 2.25 7.5 7.5M9.75 2.25l-7.5 7.5"
                stroke="currentColor"
                strokeWidth="0.9"
              />
            </svg>
          </button>
        </header>

        <div className="publish-playlist-modal-section">
          <div className="publish-playlist-modal-label-row">
            <strong>Primary category</strong>
            <span>Required</span>
          </div>
          <div className="publish-playlist-category-grid">
            {COMMUNITY_PLAYLIST_CATEGORIES.map((category) => (
              <button
                type="button"
                key={`primary-${category}`}
                className={primaryCategory === category ? "is-selected" : ""}
                aria-pressed={primaryCategory === category}
                onClick={() => choosePrimary(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="publish-playlist-modal-section">
          <div className="publish-playlist-modal-label-row">
            <strong>Related categories</strong>
            <span>{secondaryCategories.length}/2 selected</span>
          </div>
          <div className="publish-playlist-category-grid">
            {COMMUNITY_PLAYLIST_CATEGORIES.map((category) => {
              const isPrimary = category === primaryCategory;
              const isSelected = secondaryCategories.includes(category);
              const isAtLimit = secondaryCategories.length >= 2 && !isSelected;

              return (
                <button
                  type="button"
                  key={`secondary-${category}`}
                  className={isSelected ? "is-selected" : ""}
                  aria-pressed={isSelected}
                  disabled={isPrimary || isAtLimit}
                  onClick={() => toggleSecondary(category)}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <footer className="publish-playlist-modal-footer">
          <p>Public playlists can appear in a maximum of three categories.</p>
          <div>
            <button type="button" disabled={isSaving} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="is-primary"
              disabled={!primaryCategory || isSaving}
              onClick={() => {
                if (primaryCategory) {
                  onPublish(primaryCategory, secondaryCategories);
                }
              }}
            >
              {isSaving ? "Publishing…" : "Make Public"}
            </button>
          </div>
        </footer>
      </section>

      <style>{`
        .publish-playlist-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2147483500;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--modal-backdrop);
          padding: 24px;
        }

        .publish-playlist-modal {
          position: relative;
          width: min(680px, 100%);
          max-height: min(760px, calc(100vh - 48px));
          overflow: auto;
          border: 0;
          border-radius: 10px;
          background: var(--bg-primary);
          color: var(--text-primary);
          box-shadow: var(--filmwave-menu-shadow);
        }

        .publish-playlist-modal-header {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding: 20px 52px 18px;
          text-align: center;
        }

        .publish-playlist-modal-kicker {
          margin: 0 0 8px;
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .publish-playlist-modal-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          letter-spacing: -0.03em;
          line-height: 1.2;
        }

        .publish-playlist-modal-header p:not(.publish-playlist-modal-kicker) {
          margin: 9px 0 0;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .publish-playlist-modal-header > button {
          position: absolute;
          top: 16px;
          right: 16px;
          display: inline-flex;
          width: 24px;
          height: 24px;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 150ms ease;
        }

        .publish-playlist-modal-header > button:hover {
          color: var(--text-primary);
        }

        .publish-playlist-modal-header > button:disabled {
          cursor: default;
          opacity: 0.4;
        }

        .publish-playlist-modal-section {
          border-bottom: 1px solid var(--border);
          padding: 22px 24px 24px;
        }

        .publish-playlist-modal-label-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 13px;
        }

        .publish-playlist-modal-label-row strong {
          font-size: 12px;
          font-weight: 600;
        }

        .publish-playlist-modal-label-row span,
        .publish-playlist-modal-footer p {
          color: var(--text-muted);
          font-size: 10.5px;
        }

        .publish-playlist-category-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }

        .publish-playlist-category-grid button,
        .publish-playlist-modal-footer button {
          border: 1px solid var(--border);
          border-radius: 7px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 11.5px;
          cursor: pointer;
        }

        .publish-playlist-category-grid button {
          min-height: 38px;
          padding: 8px 10px;
          color: var(--text-secondary);
        }

        .publish-playlist-category-grid button.is-selected,
        .publish-playlist-modal-footer button.is-primary {
          border-color: var(--text-primary);
          background: var(--text-primary);
          color: var(--bg-primary);
        }

        .publish-playlist-category-grid button:disabled,
        .publish-playlist-modal-footer button:disabled {
          cursor: default;
          opacity: 0.4;
        }

        .publish-playlist-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 20px 24px;
        }

        .publish-playlist-modal-footer p {
          margin: 0;
        }

        .publish-playlist-modal-footer > div {
          display: flex;
          gap: 8px;
        }

        .publish-playlist-modal-footer button {
          height: 36px;
          padding: 0 16px;
          font-weight: 400;
        }

        @media (max-width: 640px) {
          .publish-playlist-category-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .publish-playlist-modal-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .publish-playlist-modal-footer > div {
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
