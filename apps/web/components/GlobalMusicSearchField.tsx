"use client";

import type {
  FormEventHandler,
  Ref,
} from "react";

import XIcon from "@/components/icons/XIcon";

export const GLOBAL_MUSIC_SEARCH_PLACEHOLDER =
  "Search by mood, genre, or scene.";

type GlobalMusicSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
  clearButtonClassName?: string;
};

function SearchFieldContent({
  value,
  onChange,
  onClear,
  inputRef,
  clearButtonClassName = "audioflume-home-reference-searchbar-clear",
}: Omit<GlobalMusicSearchFieldProps, "onSubmit" | "className">) {
  return (
    <>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={GLOBAL_MUSIC_SEARCH_PLACEHOLDER}
        aria-label={GLOBAL_MUSIC_SEARCH_PLACEHOLDER}
      />
      {value.length > 0 ? (
        <button
          type="button"
          className={clearButtonClassName}
          onClick={onClear}
          aria-label="Clear search"
        >
          <XIcon size={8} />
        </button>
      ) : null}
    </>
  );
}

export default function GlobalMusicSearchField({
  value,
  onChange,
  onClear,
  onSubmit,
  inputRef,
  className = "audioflume-home-reference-searchbar-field",
  clearButtonClassName = "audioflume-home-reference-searchbar-clear",
}: GlobalMusicSearchFieldProps) {
  if (onSubmit) {
    return (
      <form
        className={className}
        onSubmit={onSubmit}
      >
        <SearchFieldContent
          value={value}
          onChange={onChange}
          onClear={onClear}
          inputRef={inputRef}
          clearButtonClassName={clearButtonClassName}
        />
      </form>
    );
  }

  return (
    <label className={className}>
      <SearchFieldContent
        value={value}
        onChange={onChange}
        onClear={onClear}
        inputRef={inputRef}
        clearButtonClassName={clearButtonClassName}
      />
    </label>
  );
}
