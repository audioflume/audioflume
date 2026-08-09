"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function HomeVideoPlaybackControl() {
  const [heroElement, setHeroElement] = useState<HTMLElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".audioflume-home-hero-media");
    const video = document.querySelector<HTMLVideoElement>(".audioflume-home-hero-video");

    if (!hero || !video) return;

    setHeroElement(hero);
    setVideoElement(video);
    setIsPaused(video.paused);

    const handlePlay = () => setIsPaused(false);
    const handlePause = () => setIsPaused(true);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  if (!heroElement || !videoElement) return null;

  function togglePlayback() {
    if (videoElement.paused) {
      void videoElement.play();
    } else {
      videoElement.pause();
    }
  }

  return createPortal(
    <button
      type="button"
      className="absolute bottom-4 right-4 z-[3] inline-flex h-8 w-8 items-center justify-center border-0 bg-transparent p-0 text-white transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-white/70"
      onClick={togglePlayback}
      aria-label={isPaused ? "Play banner video" : "Pause banner video"}
    >
      {isPaused ? (
        <svg
          width="11"
          height="12"
          viewBox="0 0 11 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M1 1L10 6L1 11V1Z" fill="currentColor" />
        </svg>
      ) : (
        <svg
          width="10"
          height="12"
          viewBox="0 0 10 12"
          fill="none"
          aria-hidden="true"
        >
          <rect x="1" y="1" width="2.5" height="10" fill="currentColor" />
          <rect x="6.5" y="1" width="2.5" height="10" fill="currentColor" />
        </svg>
      )}
    </button>,
    heroElement,
  );
}
