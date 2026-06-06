"use client";

import {
  useEffect,
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

type MusicLibraryFrameProps = {
  children: ReactNode;
  className?: string;
};

function formatSearchPlaylistName(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";
  return trimmedValue.charAt(0).toUpperCase() + trimmedValue.slice(1);
}

export function getMusicLibrarySearchPlaceholder(playlistName?: string | null) {
  const