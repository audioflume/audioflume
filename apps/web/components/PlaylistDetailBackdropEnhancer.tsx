"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import useAverageImageColor from "@/hooks/useAverageImageColor";
import PlaylistSimilarSounds from "@/components/PlaylistSimilarSounds";

export default function PlaylistDetailBackdropEnhancer() {
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [showSimilarSounds, setShowSimilarSounds] = useState(false);
  const averageColor = useAverageImageColor(coverImageUrl);

  useEffect(() => {
    let frame = 0;

    function syncPlaylistDetail() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextStage = document.querySelector<HTMLElement>(
          ".playlist-detail-page .playlist-detail-stage",
        );
        const coverImage = nextStage?.querySelector<HTMLImageElement>(
          ".playlist-detail-cover img",
        );
        const coverVideo = nextStage?.querySelector<HTMLVideoElement>(
          ".playlist-detail-cover video",
        );
        const nextCoverImageUrl =
          coverImage?.currentSrc ||
          coverImage?.src ||
          coverVideo?.poster ||
          null;

        setStage((currentStage) =>
          currentStage === nextStage ? currentStage : nextStage,
        );
        setCoverImageUrl((currentUrl) =>
          currentUrl === nextCoverImageUrl ? currentUrl : nextCoverImageUrl,
        );
        setShowSimilarSounds(
          Boolean(nextStage?.querySelector(".playlist-detail-title")),
        );
      });
    }

    syncPlaylistDetail();
    const observer = new MutationObserver(syncPlaylistDetail);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["src", "poster"],
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!stage) return;

    stage.style.setProperty("--playlist-detail-average-color", averageColor);
    stage.style.setProperty(
      "--playlist-detail-cover-image",
      coverImageUrl ? `url(${JSON.stringify(coverImageUrl)})` : "none",
    );
  }, [averageColor, coverImageUrl, stage]);

  if (!stage || !showSimilarSounds) return null;

  return createPortal(<PlaylistSimilarSounds />, stage);
}
