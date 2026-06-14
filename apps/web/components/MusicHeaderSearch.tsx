"use client";

import {
  CollapsibleSearchPill,
  getMusicLibrarySearchPlaceholder,
  MUSIC_FILTER_STORAGE_KEY_PREFIX,
} from "@filmwave/shared";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState, type FormEvent } from "react";
import SearchIcon from "@/components/icons/SearchIcon";
import {
  MUSIC_FILTER_STATE_CHANGE_EVENT,
  MUSIC_HEADER_SEARCH_EVENT,
} from "@/hooks/useFilterPersistence";

type MusicFilterSnapshot = {
  search?: unknown;
  selectedPlaylist?: {
    name?: unknown;
  } | null;
};

function getPlaylistName(filters: MusicFilterSnapshot) {
  const selectedPlaylist = filters.selectedPlaylist;

  if (
    selectedPlaylist &&
    typeof selectedPlaylist === "object" &&
    typeof selectedPlaylist.name === "string"
  ) {
    return selectedPlaylist.name;
  }

  return null;
}

export default function MusicHeaderSearch() {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [placeholder, setPlaceholder] = useState(
    getMusicLibrarySearchPlaceholder(),
  );

  useEffect(() => {
    function syncFromFilters(filters: unknown) {
      const filterSnapshot =
        typeof filters === "object" && filters !== null
          ? (filters as MusicFilterSnapshot)
          : {};

      setSearch(typeof filterSnapshot.search === "string" ? filterSnapshot.search : "");
      setPlaceholder(
        getMusicLibrarySearchPlaceholder(getPlaylistName(filterSnapshot)),
      );
    }

    const storageKey = user?.id
      ? `${MUSIC_FILTER_STORAGE_KEY_PREFIX}:${user.id}`
      : null;

    if (storageKey) {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) syncFromFilters(JSON.parse(stored));
      } catch {
        syncFromFilters(null);
      }
    }

    function handleMusicFilterStateChange(event: Event) {
      const customEvent = event as CustomEvent<{ filters?: unknown }>;
      syncFromFilters(customEvent.detail?.filters);
    }

    window.addEventListener(
      MUSIC_FILTER_STATE_CHANGE_EVENT,
      handleMusicFilterStateChange,
    );

    return () => {
      window.removeEventListener(
        MUSIC_FILTER_STATE_CHANGE_EVENT,
        handleMusicFilterStateChange,
      );
    };
  }, [user?.id]);

  function dispatchSearch(nextSearch: string) {
    window.dispatchEvent(
      new CustomEvent(MUSIC_HEADER_SEARCH_EVENT, {
        detail: { search: nextSearch },
      }),
    );
  }

  function handleSearchChange(nextSearch: string) {
    setSearch(nextSearch);
    dispatchSearch(nextSearch);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatchSearch(search.trim());
  }

  return (
    <div className="filmwave-music-header-search-slot">
      <form onSubmit={handleSubmit}>
        <CollapsibleSearchPill
          searchIcon={<SearchIcon />}
          value={search}
          placeholder={placeholder}
          onChange={handleSearchChange}
        />
      </form>
    </div>
  );
}
