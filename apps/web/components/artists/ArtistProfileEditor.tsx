"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import ChevronDownIcon from "@/components/icons/ChevronDownIcon";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type ArtistProfileEditorProps = {
  artist: ArtistDashboardProfile;
  onSaved: (artist: Partial<ArtistDashboardProfile> & { id: string }) => void;
};

type ProfileResponse = {
  artist?: Partial<ArtistDashboardProfile> & { id: string };
  error?: string;
};

type ArtistImageKind = "profile" | "hero";

type ArtistImageResponse = {
  artist?: Partial<ArtistDashboardProfile> & { id: string };
  error?: string;
};

const MAX_DESIGNATIONS = 3;
const ARTIST_DESIGNATION_OPTIONS = [
  "Musician",
  "Producer",
  "Composer",
  "Songwriter",
  "Vocalist",
  "Instrumentalist",
  "Beatmaker",
  "DJ",
  "Sound Designer",
  "Engineer",
] as const;

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-2 block text-[11px] font-medium text-[var(--text-secondary)]">
      {children}
    </span>
  );
}

function CharacterCount({
  value,
  maxLength,
}: {
  value: string;
  maxLength: number;
}) {
  return (
    <div className="mt-1.5 text-right text-[10px] leading-none text-[var(--text-muted)]">
      {value.length} / {maxLength}
    </div>
  );
}

function parseDesignationSelections(value: string) {
  return value
    .split(/\s*\/\s*|\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
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
  const [designation, setDesignation] = useState(artist.designation ?? "");
  const [designationQuery, setDesignationQuery] = useState("");
  const [designationDropdownOpen, setDesignationDropdownOpen] = useState(false);
  const [introText, setIntroText] = useState(artist.intro_text ?? "");
  const [bio, setBio] = useState(artist.bio ?? "");
  const [location, setLocation] = useState(artist.location ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(artist.website_url ?? "");
  const [instagramUrl, setInstagramUrl] = useState(artist.instagram_url ?? "");
  const [spotifyUrl, setSpotifyUrl] = useState(artist.spotify_url ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(artist.youtube_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<ArtistImageKind | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const preserveDraftOnNextArtistUpdateRef = useRef(false);
  const designationFieldRef = useRef<HTMLDivElement>(null);
  const selectedDesignations = parseDesignationSelections(designation).filter(
    (item) =>
      ARTIST_DESIGNATION_OPTIONS.includes(
        item as (typeof ARTIST_DESIGNATION_OPTIONS)[number],
      ),
  );
  const availableDesignations = ARTIST_DESIGNATION_OPTIONS.filter((option) => {
    const query = designationQuery.trim().toLowerCase();
    return (
      !selectedDesignations.includes(option) &&
      (!query || option.toLowerCase().includes(query))
    );
  });

  useEffect(() => {
    if (preserveDraftOnNextArtistUpdateRef.current) {
      preserveDraftOnNextArtistUpdateRef.current = false;
      return;
    }

    setName(artist.name);
    setSlug(artist.slug);
    setDesignation(artist.designation ?? "");
    setDesignationQuery("");
    setDesignationDropdownOpen(false);
    setIntroText(artist.intro_text ?? "");
    setBio(artist.bio ?? "");
    setLocation(artist.location ?? "");
    setWebsiteUrl(artist.website_url ?? "");
    setInstagramUrl(artist.instagram_url ?? "");
    setSpotifyUrl(artist.spotify_url ?? "");
    setYoutubeUrl(artist.youtube_url ?? "");
    setMessage("");
    setError("");
  }, [artist]);

  useEffect(() => {
    if (!designationDropdownOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (designationFieldRef.current?.contains(event.target as Node)) return;
      setDesignationDropdownOpen(false);
      setDesignationQuery("");
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [designationDropdownOpen]);

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
          designation,
          intro_text: introText,
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

  async function uploadArtistImage(kind: ArtistImageKind, file: File) {
    if (!canEdit || uploadingImage) return;

    try {
      setUploadingImage(kind);
      setMessage("");
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);

      const response = await fetch(`/api/artists/${artist.id}/images`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json().catch(() => ({}))) as ArtistImageResponse;

      if (!response.ok || !body.artist) {
        throw new Error(body.error || "Failed to upload artist image");
      }

      preserveDraftOnNextArtistUpdateRef.current = true;
      onSaved(body.artist);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload artist image",
      );
    } finally {
      setUploadingImage(null);
    }
  }

  function selectDesignation(value: string) {
    if (!canEdit || saving || selectedDesignations.length >= MAX_DESIGNATIONS) {
      return;
    }

    setDesignation([...selectedDesignations, value].join(" / "));
    setDesignationQuery("");
    setDesignationDropdownOpen(selectedDesignations.length + 1 < MAX_DESIGNATIONS);
  }

  function removeDesignation(value: string) {
    if (!canEdit || saving) return;

    setDesignation(
      selectedDesignations.filter((item) => item !== value).join(" / "),
    );
  }

  const slugChanged = slug.replace(/-+$/g, "") !== artist.slug;
  const displayedSlug = slug.replace(/-+$/g, "");
  const missingRequiredFieldCount = [
    !name.trim(),
    !displayedSlug,
    !introText.trim(),
    !bio.trim(),
  ].filter(Boolean).length;
  const missingImageCount = [
    !artist.profile_image_url,
    !artist.hero_image_url,
  ].filter(Boolean).length;
  const setupWarning = [
    missingRequiredFieldCount > 0
      ? `${missingRequiredFieldCount} required field${missingRequiredFieldCount === 1 ? "" : "s"} missing`
      : "",
    missingImageCount > 0
      ? `${missingImageCount} image${missingImageCount === 1 ? "" : "s"} missing`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Images</h2>
        </div>

        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
          <div className="flex min-h-[92px] min-w-0 items-center gap-4 py-2">
            <div
              className="h-14 w-14 shrink-0 overflow-hidden rounded-[7px] border border-[var(--border)] bg-[var(--bg-tertiary)] bg-cover bg-center"
              style={
                artist.profile_image_url
                  ? { backgroundImage: `url(${artist.profile_image_url})` }
                  : undefined
              }
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-[var(--text-primary)]">
                Profile image
              </div>
              {canEdit ? (
                <label className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary mt-3 inline-flex">
                  {uploadingImage === "profile" ? "Uploading..." : "Choose image"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={Boolean(uploadingImage)}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void uploadArtistImage("profile", file);
                    }}
                  />
                </label>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-[92px] min-w-0 items-center gap-4 py-2">
            <div
              className="h-14 w-24 shrink-0 overflow-hidden rounded-[7px] border border-[var(--border)] bg-[var(--bg-tertiary)] bg-cover bg-center"
              style={
                artist.hero_image_url
                  ? { backgroundImage: `url(${artist.hero_image_url})` }
                  : undefined
              }
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-[var(--text-primary)]">
                Feature image
              </div>
              {canEdit ? (
                <label className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary mt-3 inline-flex">
                  {uploadingImage === "hero" ? "Uploading..." : "Choose image"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={Boolean(uploadingImage)}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void uploadArtistImage("hero", file);
                    }}
                  />
                </label>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Artist profile</h2>
        </div>

        <div className="grid gap-5 px-5 pb-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <FieldLabel>Name (Required)</FieldLabel>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={160}
                required
                disabled={!canEdit || saving}
                className="filmwave-backend-input"
              />
              <CharacterCount value={name} maxLength={160} />
            </label>

            <div className="block">
              <div className="relative">
                <span className="block font-[family-name:var(--font-aktiv-grotesk)] text-[11px] font-normal leading-[1.2] tracking-normal text-[var(--text-secondary)]">
                  Artist Designation
                </span>
                <span className="absolute right-0 top-0 text-[10px] font-normal leading-[1.2] text-[var(--text-muted)]">
                  {selectedDesignations.length} / {MAX_DESIGNATIONS}
                </span>
              </div>

              <div ref={designationFieldRef} className="relative mt-[6px]">
                <div className="flex h-10 min-w-0 cursor-pointer items-center gap-1.5 rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] p-1">
                  {selectedDesignations.map((option) => (
                    <button
                      key={option}
                      type="button"
                      disabled={!canEdit || saving}
                      onClick={() => removeDesignation(option)}
                      className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-[5px] bg-[var(--bg-tertiary)] px-2.5 text-[11px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span>{option}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}

                  <input
                    type="text"
                    value={designationQuery}
                    onChange={(event) => {
                      setDesignationQuery(event.target.value);
                      setDesignationDropdownOpen(true);
                    }}
                    onFocus={() => setDesignationDropdownOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault();
                    }}
                    disabled={
                      !canEdit ||
                      saving ||
                      selectedDesignations.length >= MAX_DESIGNATIONS
                    }
                    placeholder={
                      selectedDesignations.length >= MAX_DESIGNATIONS
                        ? ""
                        : selectedDesignations.length > 0
                          ? "Add another"
                          : "Search designations"
                    }
                    className="h-7 min-w-[90px] flex-1 cursor-pointer bg-transparent px-1 py-0 text-xs text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDesignationDropdownOpen((current) => !current)
                    }
                    disabled={
                      !canEdit ||
                      saving ||
                      selectedDesignations.length >= MAX_DESIGNATIONS
                    }
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Show designation options"
                  >
                    <ChevronDownIcon size={14} />
                  </button>
                </div>

                {designationDropdownOpen && availableDesignations.length > 0 ? (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-1 shadow-lg">
                    {availableDesignations.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectDesignation(option)}
                        className="block w-full cursor-pointer px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <FieldLabel>Artist URL (Required)</FieldLabel>
              <input
                type="text"
                value={slug}
                onChange={(event) => setSlug(normalizeSlugInput(event.target.value))}
                onBlur={() => setSlug((current) => current.replace(/-+$/g, ""))}
                maxLength={80}
                required
                disabled={!canEdit || saving}
                className="filmwave-backend-input"
              />
              <div className="mt-1.5 text-[11px] leading-5 text-[var(--text-muted)]">
                /artists/{displayedSlug || "artist"}
              </div>
              <CharacterCount value={displayedSlug} maxLength={80} />
              {slugChanged ? (
                <div className="mt-1 text-[11px] leading-5 text-[var(--status-warning)]">
                  Changing this will change your public artist URL. The previous URL will be kept so old links can redirect when public artist pages launch.
                </div>
              ) : null}
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
                className="filmwave-backend-input"
              />
              <CharacterCount value={location} maxLength={160} />
            </label>
          </div>

          <label className="block">
            <FieldLabel>Intro text (Required)</FieldLabel>
            <textarea
              value={introText}
              onChange={(event) => setIntroText(event.target.value)}
              maxLength={114}
              required
              disabled={!canEdit || saving}
              rows={3}
              className="filmwave-backend-textarea"
            />
            <CharacterCount value={introText} maxLength={114} />
          </label>

          <label className="block">
            <FieldLabel>Bio (Required)</FieldLabel>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={383}
              required
              disabled={!canEdit || saving}
              rows={6}
              className="filmwave-backend-textarea"
            />
            <CharacterCount value={bio} maxLength={383} />
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
                className="filmwave-backend-input"
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
                className="filmwave-backend-input"
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
                className="filmwave-backend-input"
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
                className="filmwave-backend-input"
              />
            </label>
          </div>
        </div>
      </section>

      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
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
          <div className="flex flex-wrap items-center justify-end gap-3">
            {setupWarning ? (
              <span className="text-right text-[11px] leading-4 text-[var(--status-warning)]">
                {setupWarning}
              </span>
            ) : null}

            <button
              type="submit"
              disabled={saving || missingRequiredFieldCount > 0}
              className="filmwave-backend-button filmwave-backend-button-primary"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </div>
        ) : null}
      </div>
    </form>
  );
}