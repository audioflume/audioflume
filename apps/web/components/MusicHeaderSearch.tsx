"use client";

import {
  CollapsibleSearchPill,
  getMusicLibrarySearchPlaceholder,
} from "@filmwave/shared";
import { useEffect, useState, type FormEvent } from "react";
import SearchIcon from "@/components/icons/SearchIcon";

const MUSIC_HEADER_SEARCH_CHANNEL = "filmwave-music-header-search";

type MusicHeaderSearchProps = {
  value?: string;
  placeholder?: string;
  syncWithToolbar?: boolean;
  onChange?: (nextSearch: string) => void;
  onSubmitSearch?: (nextSearch: string) => void;
};

function getMusicToolbarSearchInput() {
  return document.querySelector<HTMLInputElement>("main .fw-toolbar-search input");
}

function sendMusicSearch(nextSearch: string) {
  const channel = new BroadcastChannel(MUSIC_HEADER_SEARCH_CHANNEL);
  channel.postMessage({ search: nextSearch });
  channel.close();
}

export default function MusicHeaderSearch({
  value,
  placeholder: placeholderOverride,
  syncWithToolbar = true,
  onChange,
  onSubmitSearch,
}: MusicHeaderSearchProps = {}) {
  const isControlled = value !== undefined;
  const [internalSearch, setInternalSearch] = useState(value ?? "");
  const [placeholder, setPlaceholder] = useState(
    placeholderOverride ?? getMusicLibrarySearchPlaceholder(),
  );
  const search = isControlled ? value : internalSearch;

  useEffect(() => {
    if (placeholderOverride !== undefined) {
      setPlaceholder(placeholderOverride);
    }
  }, [placeholderOverride]);

  useEffect(() => {
    if (!syncWithToolbar) return;

    function syncFromToolbarSearch() {
      const input = getMusicToolbarSearchInput();
      if (!input) return;

      setInternalSearch((current) =>
        current === input.value ? current : input.value,
      );
      setPlaceholder((current) =>
        current === input.placeholder ? current : input.placeholder,
      );
    }

    syncFromToolbarSearch();
    const interval = window.setInterval(syncFromToolbarSearch, 120);

    return () => window.clearInterval(interval);
  }, [syncWithToolbar]);

  function updateSearch(nextSearch: string) {
    if (!isControlled) setInternalSearch(nextSearch);
    onChange?.(nextSearch);

    if (syncWithToolbar) {
      sendMusicSearch(nextSearch);
    }
  }

  function handleSearchChange(nextSearch: string) {
    updateSearch(nextSearch);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedSearch = search.trim();
    updateSearch(trimmedSearch);
    onSubmitSearch?.(trimmedSearch);
  }

  return (
    <form className="filmwave-header-search-form" onSubmit={handleSubmit}>
      <CollapsibleSearchPill
        searchIcon={<SearchIcon />}
        value={search}
        placeholder={placeholder}
        onChange={handleSearchChange}
      />
    </form>
  );
}
