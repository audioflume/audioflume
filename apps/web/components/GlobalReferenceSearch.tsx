"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import WaveformIcon from "@/components/icons/WaveformIcon";
import ReferenceSearchModal, {
  type ReferenceCatalogResult,
} from "@/components/ReferenceSearchModal";
import {
  getReferenceSearchMatchSongIds,
  writeReferenceSearchHandoff,
} from "@/lib/referenceSearchHandoff";

type GlobalReferenceSearchProps = {
  className?: string;
  embedded?: boolean;
};

export default function GlobalReferenceSearch({
  className = "audioflume-home-reference-searchbar-song",
  embedded = false,
}: GlobalReferenceSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  async function handleSubmit(
    value: string,
    result?: ReferenceCatalogResult,
    signal?: AbortSignal,
  ) {
    const params = new URLSearchParams({
      referenceSearch: value,
    });

    if (result?.kind !== "track") {
      setQuery(value);
      setOpen(false);
      router.push(`/music?${params.toString()}`);
      return;
    }

    const response = await fetch("/api/music/reference-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceId: result.id }),
      signal,
    });

    if (!response.ok) {
      throw new Error("Reference search request failed");
    }

    const data = await response.json();
    if (signal?.aborted) return;
    writeReferenceSearchHandoff({
      referenceId: result.id,
      query: value,
      name: result.name,
      artist: result.artist,
      imageUrl: result.imageUrl,
      songIds: getReferenceSearchMatchSongIds(data),
    });

    params.set("referenceTrackId", result.id);

    setQuery(value);
    setOpen(false);
    router.push(`/music?${params.toString()}`);
  }

  if (embedded) {
    return (
      <ReferenceSearchModal
        open
        embedded
        value={query}
        onChange={setQuery}
        onClose={() => undefined}
        onSubmit={handleSubmit}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label="Reference Match"
        aria-expanded={open}
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        <WaveformIcon size={16} />
        <span>Reference Match</span>
      </button>

      <ReferenceSearchModal
        open={open}
        value={query}
        onChange={setQuery}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
}
