"use client";

import { useEffect, useRef, useState } from "react";
import { SongFormSection } from "@/components/backend/SongFormSection";
import BackendSearchBar from "@/components/backend/BackendSearchBar";
import type { SimilarSongReference } from "@/lib/similarSongReferences";
import { MAX_SIMILAR_SONG_REFERENCES } from "@/lib/similarSongReferences";

type CatalogResult = SimilarSongReference & {
  kind: "track" | "artist";
};

type RelatedArtist = { id: number; name: string; imageUrl: string | null };

function SpotifyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 8.2c5.6-1.7 11.8-1.1 17 2" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M4.8 12.6c4.8-1.4 10.1-.9 14.5 1.8" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M6 16.8c4-1.1 8.1-.6 11.7 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function spotifySearchUrl(track: Pick<SimilarSongReference, "name" | "artist">) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${track.name} ${track.artist}`)}`;
}

type Props = {
  value: SimilarSongReference[];
  onChange: (next: SimilarSongReference[]) => void;
  disabled?: boolean;
};

export default function BackendSimilarSongs({ value, onChange, disabled = false }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [suggestions, setSuggestions] = useState<SimilarSongReference[]>([]);
  const [relatedArtists, setRelatedArtists] = useState<RelatedArtist[]>([]);
  const [referenceTrackId, setReferenceTrackId] = useState("");
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [error, setError] = useState("");
  const artistRequestRef = useRef<AbortController | null>(null);

  function closeSimilarArtists() {
    artistRequestRef.current?.abort();
    artistRequestRef.current = null;
    setReferenceTrackId("");
    setRelatedArtists([]);
    setSuggestions([]);
    setSelectedArtistId(null);
    setSuggestionsBusy(false);
    setError("");
  }

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setBusy(true);
        const response = await fetch(
          `/api/music/reference-catalog?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Search unavailable");
        setResults((body.results || []).filter((item: CatalogResult) => item.kind === "track"));
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Search unavailable");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  function add(reference: SimilarSongReference) {
    if (disabled || value.some((item) => item.id === reference.id) || value.length >= MAX_SIMILAR_SONG_REFERENCES) return;
    onChange([...value, reference]);
  }

  function select(reference: CatalogResult) {
    add(reference);
    setQuery("");
    setResults([]);
  }

  async function showSimilarArtists(reference: SimilarSongReference) {
    if (referenceTrackId === reference.id.replace(/^deezer:track:/, "")) {
      closeSimilarArtists();
      return;
    }
    artistRequestRef.current?.abort();
    const controller = new AbortController();
    artistRequestRef.current = controller;
    setQuery("");
    setResults([]);
    const trackId = reference.id.replace(/^deezer:track:/, "");
    setSuggestionsBusy(true);
    setSuggestions([]);
    setRelatedArtists([]);
    setSelectedArtistId(null);
    setReferenceTrackId(trackId);
    try {
      const response = await fetch(`/api/music/similar-song-suggestions?trackId=${trackId}&mode=artists`, { signal: controller.signal });
      const body = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(body.error || "Related artists unavailable");
      setRelatedArtists(body.artists || []);
      if (!(body.artists || []).length) {
        setError("No related artists were returned for this recording.");
      } else {
        setError("");
        // "All artists" is the default active filter, so load its tracks too.
        const tracksResponse = await fetch(`/api/music/similar-song-suggestions?trackId=${trackId}`, { signal: controller.signal });
        const tracksBody = await tracksResponse.json();
        if (controller.signal.aborted) return;
        if (!tracksResponse.ok) throw new Error(tracksBody.error || "Suggestions unavailable");
        setSuggestions(tracksBody.results || []);
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Related artists unavailable");
    } finally {
      if (artistRequestRef.current === controller) {
        artistRequestRef.current = null;
        setSuggestionsBusy(false);
      }
    }
  }

  async function showArtistTracks(artistId: number | null) {
    if (!referenceTrackId) return;
    artistRequestRef.current?.abort();
    const controller = new AbortController();
    artistRequestRef.current = controller;
    setSelectedArtistId(artistId);
    setSuggestionsBusy(true);
    try {
      const url = `/api/music/similar-song-suggestions?trackId=${referenceTrackId}${artistId ? `&artistId=${artistId}` : ""}`;
      const response = await fetch(url, { signal: controller.signal });
      const body = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(body.error || "Suggestions unavailable");
      setSuggestions(body.results || []);
      setError("");
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Suggestions unavailable");
    } finally {
      if (artistRequestRef.current === controller) {
        artistRequestRef.current = null;
        setSuggestionsBusy(false);
      }
    }
  }

  return (
    <SongFormSection title="Similar Songs" bodyClassName="flex min-h-0 flex-col gap-3 px-5 pb-5">
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Optional. Add up to 10 commercial songs that sound like yours. Exact matches are prioritized in Search by Song, so choosing a popular or trending reference may help your music rank higher when people search for it.
      </p>
      <div onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}>
        <BackendSearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search for a song or artist..."
          clearLabel="Clear similar-song search"
        />
      </div>
      {busy && <p className="text-xs text-[var(--text-muted)]">Searching Deezer...</p>}
      {results.length > 0 && (
        <div className="grid gap-1 border-[1.25px] border-[var(--border)] p-2">
          {results.map((result) => (
            <div key={result.id} className="flex items-center gap-3 px-2 py-1.5">
              {result.imageUrl ? <img src={result.imageUrl} alt="" className="h-10 w-10 shrink-0 object-cover" /> : <div className="h-10 w-10 bg-[var(--bg-tertiary)]" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{result.name}</div>
                <div className="truncate text-[11px] text-[var(--text-secondary)]">{result.artist}</div>
              </div>
              <a href={spotifySearchUrl(result)} target="_blank" rel="noopener noreferrer" className="filmwave-backend-button filmwave-backend-button-secondary" onClick={(event) => event.stopPropagation()}><SpotifyIcon /><span>Spotify ↗</span></a>
              <button type="button" className="filmwave-backend-button filmwave-backend-button-secondary" onClick={() => void select(result)} disabled={disabled}>Select</button>
            </div>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <div className="grid gap-2">
          <div className="text-[11px] font-medium text-[var(--text-secondary)]">Selected references ({value.length}/{MAX_SIMILAR_SONG_REFERENCES})</div>
          {value.map((item) => (
            <div key={item.id} className="grid gap-2">
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 object-cover" /> : <div className="h-10 w-10 shrink-0 bg-[var(--bg-tertiary)]" />}
                  <div className="min-w-0 truncate text-xs">{item.name} <span className="text-[var(--text-secondary)]">— {item.artist}</span></div>
                </div>
                <a href={spotifySearchUrl(item)} target="_blank" rel="noopener noreferrer" className="filmwave-backend-button filmwave-backend-button-secondary"><SpotifyIcon /><span>Spotify ↗</span></a>
                <button type="button" onClick={() => void showSimilarArtists(item)} className="filmwave-backend-button filmwave-backend-button-secondary w-[138px] shrink-0 whitespace-nowrap">{referenceTrackId === item.id.replace(/^deezer:track:/, "") ? "Hide similar artists" : "Show similar artists"}</button>
                <button type="button" aria-label={`Remove ${item.name}`} disabled={disabled} onClick={() => onChange(value.filter((track) => track.id !== item.id))} className="filmwave-backend-button filmwave-backend-button-secondary">Remove</button>
              </div>
              {referenceTrackId === item.id.replace(/^deezer:track:/, "") && (
                <div className="grid gap-2 pl-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-medium text-[var(--text-secondary)]">Similar artists</div>
                  </div>
                  {relatedArtists.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex min-h-6 items-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-normal leading-none text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-[var(--text-primary)] aria-pressed:text-[var(--bg-primary)]"
                        onClick={() => void showArtistTracks(null)}
                        disabled={suggestionsBusy}
                        aria-pressed={selectedArtistId === null}
                      >
                        All artists
                      </button>
                      {relatedArtists.map((artist) => (
                        <button
                          key={artist.id}
                          type="button"
                          className="inline-flex min-h-6 items-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10px] font-normal leading-none text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40 aria-pressed:bg-[var(--text-primary)] aria-pressed:text-[var(--bg-primary)]"
                          onClick={() => void showArtistTracks(artist.id)}
                          disabled={suggestionsBusy}
                          aria-pressed={selectedArtistId === artist.id}
                        >
                          {artist.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">
                      {suggestionsBusy ? "Finding similar artists..." : "No similar artists found."}
                    </p>
                  )}
                  {suggestionsBusy && relatedArtists.length > 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">Finding songs by related artists...</p>
                  ) : null}
                  {suggestions.length > 0 && (
                    <div className="grid gap-2">
                      <div className="text-[11px] font-medium text-[var(--text-secondary)]">You might also consider</div>
                      {suggestions.map((suggestion) => (
                        <div key={suggestion.id} className="flex items-center gap-2">
                          {suggestion.imageUrl ? <img src={suggestion.imageUrl} alt="" className="h-9 w-9 shrink-0 object-cover" /> : null}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs">{suggestion.name}</div>
                            <div className="truncate text-[11px] text-[var(--text-secondary)]">{suggestion.artist}</div>
                          </div>
                          <a href={spotifySearchUrl(suggestion)} target="_blank" rel="noopener noreferrer" className="filmwave-backend-button filmwave-backend-button-secondary"><SpotifyIcon /><span>Spotify ↗</span></a>
                          <button type="button" className="filmwave-backend-button filmwave-backend-button-secondary" disabled={disabled || value.length >= MAX_SIMILAR_SONG_REFERENCES || value.some((reference) => reference.id === suggestion.id)} onClick={() => add(suggestion)}>{value.some((reference) => reference.id === suggestion.id) ? "Added" : "Add"}</button>
                        </div>
                      ))}
                    </div>
                  )}
                  {error && <p role="alert" className="text-xs text-[var(--status-error)]">{error}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SongFormSection>
  );
}
