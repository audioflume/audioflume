export type SimilarSongReference = {
  id: string;
  name: string;
  artist: string;
  imageUrl: string | null;
  externalUrl: string;
};

export const MAX_SIMILAR_SONG_REFERENCES = 10;

export async function loadSimilarSongReferences(
  songId: string,
  artistId?: string,
): Promise<SimilarSongReference[]> {
  const params = new URLSearchParams({ songId });
  if (artistId) params.set("artistId", artistId);
  const response = await fetch(`/api/music/song-similar-references?${params}`, {
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Unable to load similar songs");
  return payload.references || [];
}

export async function saveSimilarSongReferences(
  songId: string,
  references: SimilarSongReference[],
  artistId?: string,
): Promise<void> {
  const response = await fetch("/api/music/song-similar-references", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ songId, artistId, references }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Unable to save similar songs");
}
