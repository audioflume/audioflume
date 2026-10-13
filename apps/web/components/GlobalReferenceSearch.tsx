"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import WaveformIcon from "@/components/icons/WaveformIcon";
import ReferenceSearchModal, {
  type ReferenceCatalogResult,
} from "@/components/ReferenceSearchModal";

type GlobalReferenceSearchProps = {
  className?: string;
};

export default function GlobalReferenceSearch({
  className = "audioflume-home-reference-searchbar-song",
}: GlobalReferenceSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function handleSubmit(
    value: string,
    result?: ReferenceCatalogResult,
  ) {
    const params = new URLSearchParams({
      referenceSearch: value,
    });

    if (result?.kind === "track") {
      params.set("referenceTrackId", result.id);
    }

    setQuery(value);
    setOpen(false);
    router.push(`/music?${params.toString()}`);
  }

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label="Search by song"
        aria-expanded={open}
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
      >
        <WaveformIcon size={16} />
        <span>Search by song</span>
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
