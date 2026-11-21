"use client";

import Link from "next/link";
import { useMemo } from "react";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import { useSongs } from "@/hooks/useSongs";
import { HomeOriginalSongGrid, HomeOriginalsSkeleton } from "../HomePageContent";

export default function Discover2StorytellingTracks() {
  const { songs, loading } = useSongs();
  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)),
    [songs],
  );

  return (
    <div className="audioflume-home-mockup discover2-storytelling-tracks">
      <section className="audioflume-home-reference-tools audioflume-home-mockup-originals-tools">
        <section className="audioflume-home-reference-playlists">
          <div className="audioflume-home-reference-width audioflume-home-reference-section-heading filmwave-section-heading-row audioflume-home-mockup-section-label">
            <span>Tracks made for storytelling</span>
            <Link href="/music" className="audioflume-arrow-text-link inline-flex items-center gap-[5px]">
              More like this
              <ArrowUpRightIcon size={16} strokeWidth={1.5} className="translate-y-[2px]" />
            </Link>
          </div>
          {loading ? (
            <HomeOriginalsSkeleton />
          ) : playableSongs.length > 0 ? (
            <HomeOriginalSongGrid songs={playableSongs} discoverPlaybackIcon />
          ) : null}
        </section>
      </section>
    </div>
  );
}
