"use client";

import {
  CollapsibleSearchPill,
  getMusicLibrarySearchPlaceholder,
} from "@filmwave/shared";
import { useEffect, useState, type FormEvent } from "react";
import SearchIcon from "@/components/icons/SearchIcon";

const MUSIC_HEADER_SEARCH_CHANNEL = "filmwave-music-header-search";

function getMusicToolbarSearchInput() {
  return document.querySelector<HTMLInputElement>("main .fw-toolbar-search input");
}

function sendMusicSearch(nextSearch: string) {
  const channel = new BroadcastChannel(MUSIC_HEADER_SEARCH_CHANNEL);
  channel.postMessage({ search: nextSearch });
  channel.close();
}

export default function MusicHeaderSearch() {
  const [search, setSearch] = useState("");
  const [placeholder, setPlaceholder] = useState(
    getMusicLibrarySearchPlaceholder(),
  );

  useEffect(() => {
    function syncFromToolbarSearch() {
      const input = getMusicToolbarSearchInput();
      if (!input) return;

      setSearch((current) => (current === input.value ? current : input.value));
      setPlaceholder((current) =>
        current === input.placeholder ? current : input.placeholder,
      );
    }

    syncFromToolbarSearch();
    const interval = window.setInterval(syncFromToolbarSearch, 120);

    return () => window.clearInterval(interval);
  }, []);

  function handleSearchChange(nextSearch: string) {
    setSearch(nextSearch);
    sendMusicSearch(nextSearch);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedSearch = search.trim();
    setSearch(trimmedSearch);
    sendMusicSearch(trimmedSearch);
  }

  return (
    <form onSubmit={handleSubmit}>
      <CollapsibleSearchPill
        searchIcon={<SearchIcon />}
        value={search}
        placeholder={placeholder}
        onChange={handleSearchChange}
      />
    </form>
  );
}
