export type PlaybackShortcutAction = "toggle-play-pause" | "next-track" | "previous-track";
export type TrackNavigationDirection = "prev" | "next";

export function clampPlaybackProgress(progress: number) {
  return Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
}

export function getSeekTimeFromProgress(progress: number, duration: number) {
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  return safeDuration * clampPlaybackProgress(progress);
}

export function getProgressFromTime(currentTime: number, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return clampPlaybackProgress(currentTime / duration);
}

export function shouldIgnorePlaybackShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();

  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

export function getPlaybackShortcutAction(event: Pick<KeyboardEvent, "code" | "key">): PlaybackShortcutAction | null {
  if (event.code === "Space") return "toggle-play-pause";
  if (event.code === "ArrowDown" || event.key === "ArrowDown") return "next-track";
  if (event.code === "ArrowUp" || event.key === "ArrowUp") return "previous-track";
  return null;
}

export function getAdjacentTrackIndex({
  currentIndex,
  queueLength,
  direction,
}: {
  currentIndex: number;
  queueLength: number;
  direction: TrackNavigationDirection;
}) {
  if (queueLength <= 0 || currentIndex < 0 || currentIndex >= queueLength) return null;

  const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

  if (nextIndex < 0 || nextIndex >= queueLength) return null;
  return nextIndex;
}

export function shouldClearPendingSeekProgress({
  playbackProgress,
  pendingProgress,
  tolerance = 0.015,
}: {
  playbackProgress: number;
  pendingProgress: number;
  tolerance?: number;
}) {
  return Math.abs(clampPlaybackProgress(playbackProgress) - clampPlaybackProgress(pendingProgress)) <= tolerance;
}
