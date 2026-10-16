"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import GlobalMusicSearchField from "@/components/GlobalMusicSearchField";

type GlobalMusicSearchProps = {
  fieldClassName?: string;
  clearButtonClassName?: string;
};

export default function GlobalMusicSearch({
  fieldClassName,
  clearButtonClassName,
}: GlobalMusicSearchProps = {}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <GlobalMusicSearchField
      value={query}
      onChange={setQuery}
      onClear={() => setQuery("")}
      className={fieldClassName}
      clearButtonClassName={clearButtonClassName}
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
