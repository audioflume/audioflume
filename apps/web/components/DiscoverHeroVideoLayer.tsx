"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";

const VIDEO_URL =
  "https://pub-cd585d75522a44bb9dad78b6f9974d03.r2.dev/Audioflume%20Banner.mov";

export default function DiscoverHeroVideoLayer() {
  const [hero, setHero] = useState<HTMLElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const syncHero = () => {
      const nextHero = document.querySelector<HTMLElement>(".discover-hero");
      setHero((current) => (current === nextHero ? current : nextHero));
    };

    syncHero();

    const observer = new MutationObserver(syncHero);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  if (!hero) return null;

  return createPortal(
    <>
      <video
        ref={videoRef}
        className="discover-hero-video"
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        onPlay={() => setIsPaused(false)}
        onPause={() => setIsPaused(true)}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
        }}
      />
      <button
        type="button"
        className="discover-hero-playback-toggle"
        onClick={togglePlayback}
        aria-label={isPaused ? "Play banner video" : "Pause banner video"}
      >
        {isPaused ? <PlayIconSmall size={17} /> : <PauseIcon size={17} />}
      </button>
    </>,
    hero,
  );
}
