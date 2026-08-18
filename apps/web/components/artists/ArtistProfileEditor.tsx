"use client";

import { FormEvent, useEffect, useState } from "react";

import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type ArtistProfileEditorProps = {
  artist: ArtistDashboardProfile;
  onSaved: (artist: Partial<ArtistDashboardProfile> & { id: string }) => void;
};

type ProfileResponse = {
  artist?: Partial<ArtistDashboardProfile> & { id: string };
  error?: string;
};

const inputClassName =
  "h-10 w-full rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60";

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
      {children}
    </span>
  );
}

function normalizeSlugInput(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/g, "")
    .slice(0, 80);
}

export default function ArtistProfileEditor({
  artist,
  onSaved,
}: ArtistProfileEditorProps) {
  const canEdit = artist.permissions.includes("artist:edit_profile");
  const [name, setName] = useState(artist.name);
  const [slug, setSlug] = useState(artist.slug);
  const [bio, setBio] = useState(artist.bio ?? "");
  const [location, setLocation] = useState(artist.location ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(artist.website_url ?? "");
  const [instagramUrl, setInstagramUrl] = useState(artist.instagram_url ?? "");
  const [spotifyUrl, setSpotifyUrl] = useState(artist.spotify_url ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(artist.youtube_url ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(artist.name);
    setSlug(artist.slug);
    setBio(artist.bio ?? "");
    setLocation(artist.location ?? "");
    setWebsiteUrl(artist.website_url ?? "");
    setInstagramUrl(artist.instagram_url ?? "");
    setSpotifyUrl(artist.spotify_url ?? "");
    setYoutubeUrl(artist.youtube_url ?? "");
    setMessage("");
    setError("");
  }, [artist]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit || saving) return;

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response = await fetch(`/api/artists/${artist.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          bio,
          location,
          website_url: websiteUrl,
          instagram_url: instagramUrl,
          spotify_url: spotifyUrl,
          youtube_url: youtubeUrl,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ProfileResponse;

      if (!response.ok || !body.artist) {
        throw new Error(body.error || "Failed to save artist profile");
      }

      onSaved(body.artist);
      setMessage("Profile saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save artist profile",
      );
    } finally {
      setSaving(false);
    }
  }

  const slugChanged = slug.replace(/-+$/g, "") !== artist.slug;
  const displayedSlug = slug.replace(/-+$/g, "");

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]"
    >
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
          Artist profile
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          Manage the information that will appear on your public artist profile.
        </p>
      </div>

      <div className="grid gap-5 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel>Artist name</FieldLabel>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={160}
              disabled={!canEdit || saving}
              className={inputClassName}
            />
          </label>

          <label className="block">
            <FieldLabel>Location</FieldLabel>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={160}
              disabled={!canEdit || saving}
              placeholder="City, Province / State"
              className={inputClassName}
            />
          </label>
        </div>

        <label className="block">
          <FieldLabel>Artist URL</FieldLabel>
          <input
            type="text"
            value={slug}
            onChange={(event) => setSlug(normalizeSlugInput(event.target.value))}
            onBlur={() => setSlug((current) => current.replace(/-+$/g, ""))}
            maxLength={80}
            disabled={!canEdit || saving}
            className={inputClassName}
          />
          <div className="mt-1.5 text-[11px] leading-5 text-[var(--text-muted)]">
            /artists/{displayedSlug || "artist"}
          </div>
          {slugChanged ? (
            <div className="mt-1 text-[11px] leading-5 text-[var(--status-warning)]">
              Changing this will change your public artist URL. The previous URL will be kept so old links can redirect when public artist pages launch.
            </div>
          ) : null}
        </label>

        <label className="block">
          <FieldLabel>Bio</FieldLabel>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={1200}
            disabled={!canEdit || saving}
            rows={6}
            className="w-full resize-y rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel>Website</FieldLabel>
            <input
              type="url"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              disabled={!canEdit || saving}
              placeholder="https://"
              className={inputClassName}
            />
          </label>

          <label className="block">
            <FieldLabel>Instagram</FieldLabel>
            <input
              type="url"
              value={instagramUrl}
              onChange={(event) => setInstagramUrl(event.target.value)}
              disabled={!canEdit || saving}
              placeholder="https://"
              className={inputClassName}
            />
          </label>

          <label className="block">
            <FieldLabel>Spotify</FieldLabel>
            <input
              type="url"
              value={spotifyUrl}
              onChange={(event) => setSpotifyUrl(event.target.value)}
              disabled={!canEdit || saving}
              placeholder="https://"
              className={inputClassName}
            />
          </label>

          <label className="block">
            <FieldLabel>YouTube</FieldLabel>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              disabled={!canEdit || saving}
              placeholder="https://"
              className={inputClassName}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
        <div className="min-h-5 text-xs">
          {error ? (
            <span className="text-[var(--status-error)]">{error}</span>
          ) : message ? (
            <span className="text-[var(--status-success)]">{message}</span>
          ) : !canEdit ? (
            <span className="text-[var(--text-muted)]">
              Your artist role has read-only profile access.
            </span>
          ) : null}
        </div>

        {canEdit ? (
          <button
            type="submit"
            disabled={saving || !name.trim() || !displayedSlug}
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[7px] bg-[var(--text-primary)] px-4 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
