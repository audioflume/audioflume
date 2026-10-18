"use client";

import type { Song } from "@/lib/types";
import { useEffect, useMemo, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import {
  parseEditPoints,
  SongCardCuePointOverlay,
  SongCardWaveform,
  type SharedWaveformCanvasHandle,
} from "@filmwave/shared";

function getSongSource(song: Song) {
  return song.hlsUrl || song.playbackUrl || song.audioUrl;
}

function parseWaveformPeaks(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Waveform({
  song,
  compact = false,
  highlightedEditPointTypes = [],
  showEditPointMarkers,
}: {
  song: Song;
  compact?: boolean;
  highlightedEditPointTypes?: string[];
  showEditPointMarkers?: boolean;
}) {
  const waveformRef = useRef<SharedWaveformCanvasHandle | null>(null);
  const progressRef = useRef(0);
  const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedSourceRef = useRef("");

  const { showEditPointMarkers: globalShowEditPointMarkers } = useUserPreferences();
  const shouldShowEditPointMarkers =
    showEditPointMarkers ?? globalShowEditPointMarkers;

  const {
    registerWaveform,
    unregisterWaveform,
    seekTo: contextSeekTo,
    isPlaying,
    currentSong,
  } = usePlayer();

  const isPlayingRef = useRef(isPlaying);
  const currentSongIdRef = useRef<string | null>(currentSong?.id ?? null);

  const peaks = useMemo(
    () => parseWaveformPeaks(song.waveformPeaks),
    [song.waveformPeaks],
  );

  const editPoints = useMemo(
    () => parseEditPoints(song.editPoints),
    [song.editPoints],
  );

  const preloadSongSource = () => {
    const source = getSongSource(song);

    if (!source || preloadedSourceRef.current === source) return;

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = source;
    audio.load();

    preloadedAudioRef.current = audio;
    preloadedSourceRef.current = source;
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentSongIdRef.current = currentSong?.id ?? null;
  }, [isPlaying, currentSong?.id]);

  useEffect(() => {
    progressRef.current = 0;
    waveformRef.current?.seekTo(0);
  }, [song.waveformPeaks]);

  useEffect(() => {
    registerWaveform(song.id, {
      seekTo: (progress: number) => {
        progressRef.current = progress;
        waveformRef.current?.seekTo(progress);
      },
    });

    return () => unregisterWaveform(song.id);
  }, [song.id, registerWaveform, unregisterWaveform]);

  const seekToProgress = (progress: number) => {
    const shouldPlay = isPlayingRef.current;

    progressRef.current = progress;
    waveformRef.current?.seekTo(progress);
    contextSeekTo(song, progress, shouldPlay);
  };

  const markerOverlay = shouldShowEditPointMarkers ? (
    <SongCardCuePointOverlay
      editPoints={editPoints}
      duration={song.duration}
      highlightedEditPointTypes={highlightedEditPointTypes}
      compact={compact}
      onSeek={seekToProgress}
    />
  ) : null;

  return (
    <SongCardWaveform
      ref={waveformRef}
      peaks={peaks}
      progress={progressRef.current}
      overlay={markerOverlay}
      compact={compact}
      ariaLabel={`Seek ${song.title}`}
      onSeek={seekToProgress}
      onPointerEnter={preloadSongSource}
    />
  );
}
