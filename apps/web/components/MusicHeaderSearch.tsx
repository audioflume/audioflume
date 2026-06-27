"use client";

import { getMusicLibrarySearchPlaceholder } from "@filmwave/shared";
import { useState, type FormEvent } from "react";
import SearchIcon from "@/components/icons/SearchIcon";

const MUSIC_HEADER_SEARCH_CHANNEL = "filmwave-music-header-search";

type MusicHeaderSearchProps = {
  value?: string;
  placeholder?: string;
  syncWithToolbar?: boolean;
  onChange?: (nextSearch: string) => void;
  onSubmitSearch?: (nextSearch: string) => void;
};

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
  const search = isControlled ? value : internalSearch;
  const placeholder = placeholderOverride ?? getMusicLibrarySearchPlaceholder();

  function updateSearch(nextSearch: string) {
    if (!isControlled) setInternalSearch(nextSearch);
    onChange?.(nextSearch);

    if (syncWithToolbar) {
      sendMusicSearch(nextSearch);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedSearch = search.trim();
    updateSearch(trimmedSearch);
    onSubmitSearch?.(trimmedSearch);
  }

  return (
    <form className="filmwave-header-search-form filmwave-music-header-search-form" onSubmit={handleSubmit}>
      <div className="filmwave-music-header-search">
        <span className="filmwave-music-header-search-icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={search}
          placeholder={placeholder}
          onChange={(event) => updateSearch(event.target.value)}
          className="filmwave-music-header-search-input"
        />
      </div>
    </form>
  );
}
