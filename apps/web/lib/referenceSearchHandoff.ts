export type ReferenceSearchHandoff = {
  referenceId: string;
  query: string;
  name: string;
  artist: string;
  imageUrl: string | null;
  songIds: string[];
};

const REFERENCE_SEARCH_HANDOFF_KEY =
  "audioflume:reference-search-handoff";

export function getReferenceSearchMatchSongIds(data: unknown) {
  if (!data || typeof data !== "object") return [];

  const matches = (data as { matches?: unknown }).matches;
  if (!Array.isArray(matches)) return [];

  return matches.flatMap((match) => {
    if (!match || typeof match !== "object") return [];

    const songId = (match as Record<string, unknown>).songId;
    return typeof songId === "string" && songId ? [songId] : [];
  });
}

export function writeReferenceSearchHandoff(
  handoff: ReferenceSearchHandoff,
) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    REFERENCE_SEARCH_HANDOFF_KEY,
    JSON.stringify(handoff),
  );
}

export function takeReferenceSearchHandoff(
  referenceId: string,
  query: string,
) {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(
      REFERENCE_SEARCH_HANDOFF_KEY,
    );
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<ReferenceSearchHandoff>;

    if (
      parsed.referenceId !== referenceId ||
      parsed.query !== query ||
      !Array.isArray(parsed.songIds)
    ) {
      return null;
    }

    window.sessionStorage.removeItem(REFERENCE_SEARCH_HANDOFF_KEY);

    return {
      referenceId,
      query,
      name: typeof parsed.name === "string" ? parsed.name : query,
      artist: typeof parsed.artist === "string" ? parsed.artist : "",
      imageUrl:
        typeof parsed.imageUrl === "string" || parsed.imageUrl === null
          ? parsed.imageUrl
          : null,
      songIds: parsed.songIds.filter(
        (songId): songId is string =>
          typeof songId === "string" && songId.length > 0,
      ),
    };
  } catch {
    return null;
  }
}
