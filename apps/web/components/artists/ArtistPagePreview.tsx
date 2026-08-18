"use client";

import { useEffect, useState } from "react";

import PublicArtistPageView from "@/components/artists/PublicArtistPageView";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";
import type { PublicArtistPageData } from "@/lib/publicArtist";

type PreviewResponse = {
  data?: PublicArtistPageData;
  error?: string;
};

export default function ArtistPagePreview({
  artist,
}: {
  artist: ArtistDashboardProfile;
}) {
  const [data, setData] = useState<PublicArtistPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/artists/${artist.id}/page-preview`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as
          | PreviewResponse
          | null;

        if (!response.ok || !body?.data) {
          throw new Error(body?.error || "Failed to load artist page preview");
        }

        if (!cancelled) setData(body.data);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load artist page preview",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [artist.id]);

  if (loading) {
    return (
      <div className="filmwave-backend-section flex min-h-[320px] items-center justify-center text-xs text-[var(--text-muted)]">
        Loading page preview...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="filmwave-backend-section flex min-h-[320px] items-center justify-center px-6 text-center text-xs text-[var(--text-secondary)]">
        {error || "Artist page preview is unavailable."}
      </div>
    );
  }

  return <PublicArtistPageView data={data} embedded />;
}
