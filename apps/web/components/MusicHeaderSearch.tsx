"use client";

import {
  CollapsibleSearchPill,
  getMusicLibrarySearchPlaceholder,
} from "@filmwave/shared";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import SearchIcon from "@/components/icons/SearchIcon";

const MUSIC_HEADER_SEARCH_CHANNEL = "filmwave-music-header-search";

const musicHeaderSearchStyle: CSSProperties = {
  position: "fixed",
  top: "10.5px",
  left: "50%",
  zIndex: 40,
  width: "clamp(320px, 42vw, 640px)",
  maxWidth: "calc(100vw - 420px)",
  marginRight: 0,
  transform: "translateX(-50%)",
};

const musicHeaderSearchPillStyle: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
};

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
    <form
      className="filmwave-music-header-search-form"
      style={musicHeaderSearchStyle}
      onSubmit={handleSubmit}
    >
      <CollapsibleSearchPill
        searchIcon={<SearchIcon />}
        value={search}
        placeholder={placeholder}
        style={musicHeaderSearchPillStyle}
        onChange={handleSearchChange}
      />

      <style jsx global>{`
        .filmwave-music-header-search-form .filmwave-search-pill,
        .filmwave-music-header-search-form .filmwave-search-pill-expanded,
        .filmwave-music-header-search-form .filmwave-search-pill-collapsed {
          width: 100% !important;
          max-width: 100% !important;
        }

        .filmwave-music-header-search-form .filmwave-search-pill-input {
          width: 100% !important;
        }

        @media (max-width: 900px) {
          .filmwave-music-header-search-form {
            left: calc(50% + 32px) !important;
            width: min(420px, calc(100vw - 300px)) !important;
            max-width: calc(100vw - 300px) !important;
          }
        }
      `}</style>
    </form>
  );
}
