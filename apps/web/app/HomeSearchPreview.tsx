"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import GlobalMusicSearchField from "@/components/GlobalMusicSearchField";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import { AudioflumeMark } from "@/components/LifetimeAccessCard";

export default function HomeSearchPreview() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <div className="audioflume-home-landing-search-preview-anchor">
      <div className="audioflume-home-landing-search">
        <div className="audioflume-home-landing-search-field">
          <Link href="/discover" className="audioflume-home-landing-search-brand" aria-label="Explore Discover">
            <AudioflumeMark ariaHidden className="audioflume-home-landing-search-mark" />
          </Link>
          <GlobalMusicSearchField
            value={query}
            onChange={setQuery}
            onClear={() => setQuery("")}
            showSubmitArrow
            onSubmit={(event) => {
              event.preventDefault();
              const term = query.trim();
              router.push(term ? `/music?search=${encodeURIComponent(term)}` : "/music");
            }}
          />
        </div>
        <GlobalReferenceSearch className="audioflume-home-landing-search-song" />
      </div>
    </div>
  );
}
