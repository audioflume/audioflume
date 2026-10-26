"use client";

import { useEffect, useState } from "react";
import { SongFormSection } from "@/components/backend/SongFormSection";
import type { SimilarSongReference } from "@/lib/similarSongReferences";
import { MAX_SIMILAR_SONG_REFERENCES } from "@/lib/similarSongReferences";

type CatalogResult = SimilarSongReference & {
  kind: "track" | "artist";
};

type Props = {
  value: SimilarSongReference[];
  onChange: (next: SimilarSongReference[]) => void;
  disabled?: boolean;
};

export default function BackendSimilarSongs({ value, onChange, disabled = false }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [suggestions, setSuggestions] = useState<SimilarSongReference[]>([]);
  const [busy, setBusy] = useState(false);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [error, setError] = useState("");

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

  async function select(reference: CatalogResult) {
    add(reference);
    setQuery("");
    setResults([]);
    const trackId = reference.id.replace(/^deezer:track:/, "");
    setSuggestionsBusy(true);
    setSuggestions([]);
    try {
      const response = await fetch(`/api/music/similar-song-suggestions?trackId=${trackId}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Suggestions unavailable");
      setSuggestions(body.results || []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Suggestions unavailable");
    } finally {
      setSuggestionsBusy(false);
    }
  }

  return (
    <SongFormSection title="Similar Songs" bodyClassName="grid gap-3 px-5 pb-5">
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        Optional. Add up to 10 commercial songs that sound like yours. These references do not affect Search by Song ranking yet.
      </p>
      <input
        type="search"
        aria-label="Search similar reference songs"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for a song or artist..."
        disabled={disabled || value.length >= MAX_SIMILAR_SONG_REFERENCES}
        className="filmwave-backend-input w-full"
      />
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
              <a href={result.externalUrl} target="_blank" rel="noopener noreferrer" className="filmwave-backend-button filmwave-backend-button-secondary" onClick={(event) => event.stopPropagation()}>Listen ↗</a>
              <button type="button" className="filmwave-backend-button filmwave-backend-button-secondary" onClick={() => void select(result)} disabled={disabled}>Select</button>
            </div>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <div className="grid gap-2">
          <div className="text-[11px] font-medium text-[var(--text-secondary)]">Selected references ({value.length}/{MAX_SIMILAR_SONG_REFERENCES})</div>
          {value.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1 truncate text-xs">{item.name} <span className="text-[var(--text-secondary)]">— {item.artist}</span></div>
              <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="filmwave-backend-button filmwave-backend-button-secondary">Listen ↗</a>
              <button type="button" aria-label={`Remove ${item.name}`} disabled={disabled} onClick={() => onChange(value.filter((track) => track.id !== item.id))} className="filmwave-backend-button filmwave-backend-button-secondary">Remove</button>
            </div>
          ))}
        </div>
      )}
      {suggestionsBusy && <p className="text-xs text-[var(--text-muted)]">Finding songs by related artists...</p>}
      {suggestions.length > 0 && (
        <div className="grid gap-2">
          <div className="text-[11px] font-medium text-[var(--text-secondary)]">You might also consider</div>
          {suggestions.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-9 w-9 shrink-0 object-cover" /> : null}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs">{item.name}</div>
                <div className="truncate text-[11px] text-[var(--text-secondary)]">{item.artist}</div>
              </div>
              <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="filmwave-backend-button filmwave-backend-button-secondary">Listen ↗</a>
              <button type="button" className="filmwave-backend-button filmwave-backend-button-secondary" disabled={disabled || value.length >= MAX_SIMILAR_SONG_REFERENCES || value.some((reference) => reference.id === item.id)} onClick={() => add(item)}>{value.some((reference) => reference.id === item.id) ? "Added" : "Add"}</button>
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-xs text-[var(--status-error)]">{error}</p>}
    </SongFormSection>
  );
}
