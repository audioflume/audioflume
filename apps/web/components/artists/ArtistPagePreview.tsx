"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import PublicArtistPageView, {
  type PublicArtistEditableField,
} from "@/components/artists/PublicArtistPageView";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";
import type {
  PublicArtistPageData,
  PublicArtistProfile,
} from "@/lib/publicArtist";

type PreviewResponse = {
  data?: PublicArtistPageData;
  error?: string;
};

type ProfileResponse = {
  artist?: Partial<ArtistDashboardProfile> & { id: string };
  error?: string;
};

type ImageResponse = {
  artist?: Partial<ArtistDashboardProfile> & { id: string };
  error?: string;
};

type PreviewLayout = {
  virtualWidth: number;
  scale: number;
  height: number;
  topInset: number;
};

const EDITABLE_FIELDS: PublicArtistEditableField[] = [
  "name",
  "slug",
  "designation",
  "intro_text",
  "bio",
  "location",
  "website_url",
  "instagram_url",
  "spotify_url",
  "youtube_url",
];

function normalizeSlugInput(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/g, "")
    .slice(0, 80);
}

function fieldValue(
  artist: PublicArtistProfile,
  field: PublicArtistEditableField,
) {
  return String(artist[field] ?? "");
}

export default function ArtistPagePreview({
  artist,
  onSaved,
}: {
  artist: ArtistDashboardProfile;
  onSaved?: (artist: Partial<ArtistDashboardProfile> & { id: string }) => void;
}) {
  const canEdit = artist.permissions.includes("artist:edit_profile");
  const [data, setData] = useState<PublicArtistPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftArtist, setDraftArtist] = useState<PublicArtistProfile | null>(null);
  const [pendingFeatureImage, setPendingFeatureImage] = useState<File | null>(null);
  const [featureImagePreviewUrl, setFeatureImagePreviewUrl] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [message, setMessage] = useState("");
  const [layout, setLayout] = useState<PreviewLayout>({
    virtualWidth: 0,
    scale: 1,
    height: 0,
    topInset: 0,
  });
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);

  const fetchPreviewData = useCallback(async () => {
    const response = await fetch(`/api/artists/${artist.id}/page-preview`, {
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as
      | PreviewResponse
      | null;

    if (!response.ok || !body?.data) {
      throw new Error(body?.error || "Failed to load artist page preview");
    }

    return body.data;
  }, [artist.id]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setLoadError("");
    setEditing(false);
    setDraftArtist(null);
    setPendingFeatureImage(null);
    setFeatureImagePreviewUrl(null);
    setEditError("");
    setMessage("");

    void fetchPreviewData()
      .then((nextData) => {
        if (!cancelled) setData(nextData);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setLoadError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load artist page preview",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchPreviewData]);

  useEffect(() => {
    return () => {
      if (featureImagePreviewUrl) URL.revokeObjectURL(featureImagePreviewUrl);
    };
  }, [featureImagePreviewUrl]);

  useLayoutEffect(() => {
    if (!data) return;

    const frame = previewFrameRef.current;
    const content = previewContentRef.current;
    if (!frame || !content) return;

    let frameId = 0;

    function updateLayout() {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const virtualWidth = Math.max(window.innerWidth, 1);
        const availableWidth = Math.max(frame.clientWidth, 1);
        const scale = Math.min(1, availableWidth / virtualWidth);
        const height = content.scrollHeight * scale;
        const rootStyles = getComputedStyle(document.documentElement);
        const headerHeight =
          Number.parseFloat(
            rootStyles.getPropertyValue("--filmwave-header-height"),
          ) || 0;
        const frameDocumentTop = frame.getBoundingClientRect().top + window.scrollY;
        const topInset = Math.max(0, headerHeight - frameDocumentTop);

        setLayout((current) => {
          if (
            Math.abs(current.virtualWidth - virtualWidth) < 0.5 &&
            Math.abs(current.scale - scale) < 0.0005 &&
            Math.abs(current.height - height) < 0.5 &&
            Math.abs(current.topInset - topInset) < 0.5
          ) {
            return current;
          }

          return { virtualWidth, scale, height, topInset };
        });
      });
    }

    updateLayout();

    const observer = new ResizeObserver(updateLayout);
    observer.observe(frame);
    observer.observe(content);
    window.addEventListener("resize", updateLayout);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, [data]);

  const hasChanges = Boolean(
    pendingFeatureImage ||
      (data &&
        draftArtist &&
        EDITABLE_FIELDS.some(
          (field) => fieldValue(draftArtist, field) !== fieldValue(data.artist, field),
        )),
  );

  function startEditing() {
    if (!canEdit || !data) return;
    setDraftArtist({ ...data.artist });
    setEditing(true);
    setEditError("");
    setMessage("");
  }

  function clearPendingImage() {
    setPendingFeatureImage(null);
    setFeatureImagePreviewUrl(null);
  }

  function finishEditing() {
    setEditing(false);
    setDraftArtist(null);
    clearPendingImage();
    setEditError("");
  }

  function cancelEditing() {
    finishEditing();
    setMessage("");
  }

  function handleFieldChange(field: PublicArtistEditableField, value: string) {
    setDraftArtist((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]: field === "slug" ? normalizeSlugInput(value) : value,
      };
    });
    setEditError("");
    setMessage("");
  }

  function handleFeatureImageChange(file: File) {
    const previewUrl = URL.createObjectURL(file);
    setPendingFeatureImage(file);
    setFeatureImagePreviewUrl(previewUrl);
    setEditError("");
    setMessage("");
  }

  async function saveChanges() {
    if (!draftArtist || !data || saving || !hasChanges) return;

    const normalizedSlug = draftArtist.slug.replace(/-+$/g, "");
    if (
      !draftArtist.name.trim() ||
      !normalizedSlug ||
      !draftArtist.intro_text?.trim() ||
      !draftArtist.bio?.trim()
    ) {
      setEditError("Name, Artist URL, Intro Text, and Bio are required.");
      return;
    }

    setSaving(true);
    setEditError("");
    setMessage("");

    try {
      const profileResponse = await fetch(`/api/artists/${artist.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftArtist.name,
          slug: normalizedSlug,
          designation: draftArtist.designation ?? "",
          intro_text: draftArtist.intro_text ?? "",
          bio: draftArtist.bio ?? "",
          location: draftArtist.location ?? "",
          website_url: draftArtist.website_url ?? "",
          instagram_url: draftArtist.instagram_url ?? "",
          spotify_url: draftArtist.spotify_url ?? "",
          youtube_url: draftArtist.youtube_url ?? "",
        }),
      });
      const profileBody = (await profileResponse.json().catch(() => null)) as
        | ProfileResponse
        | null;

      if (!profileResponse.ok || !profileBody?.artist) {
        throw new Error(profileBody?.error || "Failed to save artist profile");
      }

      let savedArtist = profileBody.artist;

      if (pendingFeatureImage) {
        const formData = new FormData();
        formData.append("file", pendingFeatureImage);
        formData.append("kind", "hero");

        const imageResponse = await fetch(`/api/artists/${artist.id}/images`, {
          method: "POST",
          body: formData,
        });
        const imageBody = (await imageResponse.json().catch(() => null)) as
          | ImageResponse
          | null;

        if (!imageResponse.ok || !imageBody?.artist) {
          throw new Error(imageBody?.error || "Failed to upload Feature Image");
        }

        savedArtist = { ...savedArtist, ...imageBody.artist };
      }

      onSaved?.(savedArtist);
      const nextData = await fetchPreviewData();
      setData(nextData);
      setEditing(false);
      setDraftArtist(null);
      clearPendingImage();
      setMessage("Page saved.");
    } catch (saveError) {
      setEditError(
        saveError instanceof Error ? saveError.message : "Failed to save artist page",
      );
    } finally {
      setSaving(false);
    }
  }

  function handlePrimaryAction() {
    if (!editing) {
      startEditing();
      return;
    }

    if (hasChanges) {
      void saveChanges();
      return;
    }

    finishEditing();
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-xs text-[var(--text-muted)]">
        Loading page preview...
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-xs text-[var(--text-secondary)]">
        {loadError || "Artist page preview is unavailable."}
      </div>
    );
  }

  return (
    <div
      ref={previewFrameRef}
      className="relative w-full overflow-hidden bg-[var(--bg-primary)]"
      style={{
        boxSizing: "border-box",
        height:
          layout.height > 0
            ? `${layout.height + layout.topInset}px`
            : undefined,
        paddingTop: layout.topInset > 0 ? `${layout.topInset}px` : undefined,
      }}
    >
      {canEdit ? (
        <div
          className="absolute right-5 z-50 flex max-w-[calc(100%-40px)] items-center gap-2"
          style={{ top: `${layout.topInset + 18}px` }}
        >
          {editError ? (
            <span className="max-w-[320px] text-right text-[11px] leading-4 text-[var(--status-error)]">
              {editError}
            </span>
          ) : message ? (
            <span className="text-[11px] text-[var(--status-success)]">{message}</span>
          ) : null}

          {editing && hasChanges ? (
            <button
              type="button"
              disabled={saving}
              onClick={cancelEditing}
              className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary"
            >
              Cancel
            </button>
          ) : null}

          <button
            type="button"
            disabled={saving}
            onClick={handlePrimaryAction}
            className={`filmwave-backend-button filmwave-backend-button-compact ${
              editing && hasChanges
                ? "filmwave-backend-button-primary"
                : "filmwave-backend-button-secondary"
            }`}
          >
            {saving
              ? "Saving..."
              : editing
                ? hasChanges
                  ? "Save"
                  : "Done"
                : "Edit"}
          </button>
        </div>
      ) : null}

      <div
        ref={previewContentRef}
        style={{
          width: layout.virtualWidth > 0 ? `${layout.virtualWidth}px` : "100%",
          transform: `scale(${layout.scale})`,
          transformOrigin: "top left",
        }}
      >
        <PublicArtistPageView
          data={data}
          embedded
          editMode={editing}
          editArtist={draftArtist}
          featureImagePreviewUrl={featureImagePreviewUrl}
          onEditFieldChange={handleFieldChange}
          onFeatureImageChange={handleFeatureImageChange}
        />
      </div>
    </div>
  );
}
