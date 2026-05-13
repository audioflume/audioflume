import type { Song } from "@/lib/types";

export type SongHealthStatus = "success" | "warning" | "error";

export type SongIssueKey =
  | "audio"
  | "coverArt"
  | "songInfo"
  | "waveformPeaks"
  | "tags"
  | "editPoints";

export type SongIssueSeverity = "error" | "warning" | "neutral";

export type SongIssue = {
  key: SongIssueKey;
  label: string;
  severity: SongIssueSeverity;
};

export function songHasMissingInfo(song: Song) {
  return (
    !song.title || !song.artist || !song.duration || !song.bpm || !song.key
  );
}

export function songHasMissingTags(song: Song) {
  return (
    song.genres.length === 0 ||
    song.moods.length === 0 ||
    song.instruments.length === 0 ||
    song.builds.length === 0 ||
    (!song.instrumental && song.vocals.length === 0)
  );
}

export function songHasMissingEditPoints(song: Song) {
  return (
    !song.editPoints ||
    song.editPoints === '{"markers":[],"ranges":[]}' ||
    song.editPoints ===
      `{
"markers": [],
"ranges": []
}`
  );
}

export function getSongIssues(song: Song): SongIssue[] {
  const issues: SongIssue[] = [];

  if (!song.audioUrl) {
    issues.push({
      key: "audio",
      label: "Missing audio",
      severity: "error",
    });
  }

  if (!song.coverArt) {
    issues.push({
      key: "coverArt",
      label: "Missing cover",
      severity: "error",
    });
  }

  if (songHasMissingInfo(song)) {
    issues.push({
      key: "songInfo",
      label: "Missing info",
      severity: "error",
    });
  }

  if (!song.waveformPeaks || song.waveformPeaks === "[]") {
    issues.push({
      key: "waveformPeaks",
      label: "Missing peaks",
      severity: "error",
    });
  }

  if (songHasMissingTags(song)) {
    issues.push({
      key: "tags",
      label: "Missing tags",
      severity: "warning",
    });
  }

  if (songHasMissingEditPoints(song)) {
    issues.push({
      key: "editPoints",
      label: "Missing edit points",
      severity: "neutral",
    });
  }

  return issues;
}

export function getSongHealthStatus(song: Song): SongHealthStatus {
  const issues = getSongIssues(song);

  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }

  if (issues.some((issue) => issue.severity === "warning")) {
    return "warning";
  }

  return "success";
}

export function songHasIssue(song: Song, key: SongIssueKey) {
  return getSongIssues(song).some((issue) => issue.key === key);
}
