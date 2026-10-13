"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import GlobalMusicSearchField from "@/components/GlobalMusicSearchField";

export default function GlobalMusicSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <GlobalMusicSearchField
      value={query}
      onChange={setQuery}
      onClear={() => setQuery("")}
      onSubmit={(event) => {
        event.preventDefault();

        const cleanQuery = query.trim();
        router.push(
          cleanQuery
            ? `/music?search=${encodeURIComponent(cleanQuery)}`
            : "/music",
        );
      }}
    />
  );
}
