"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import PublicArtistPageView from "@/components/artists/PublicArtistPageView";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";
import type { PublicArtistPageData } from "@/lib/publicArtist";

type PreviewResponse = {
  data?: PublicArtistPageData;
  error?: string;
};

type PreviewLayout = {
  virtualWidth: number;
  scale: number;
  height: number;
};

export default function ArtistPagePreview({
  artist,
}: {
  artist: ArtistDashboardProfile;
}) {
  const [data, setData] = useState<PublicArtistPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<PreviewLayout>({
    virtualWidth: 0,
    scale: 1,
    height: 0,
  });
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);

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

        setLayout((current) => {
          if (
            Math.abs(current.virtualWidth - virtualWidth) < 0.5 &&
            Math.abs(current.scale - scale) < 0.0005 &&
            Math.abs(current.height - height) < 0.5
          ) {
            return current;
          }

          return { virtualWidth, scale, height };
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

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-xs text-[var(--text-muted)]">
        Loading page preview...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-xs text-[var(--text-secondary)]">
        {error || "Artist page preview is unavailable."}
      </div>
    );
  }

  return (
    <div
      ref={previewFrameRef}
      className="relative w-full overflow-hidden bg-[var(--bg-primary)]"
      style={layout.height > 0 ? { height: `${layout.height}px` } : undefined}
    >
      <div
        ref={previewContentRef}
        style={{
          width: layout.virtualWidth > 0 ? `${layout.virtualWidth}px` : "100%",
          transform: `scale(${layout.scale})`,
          transformOrigin: "top left",
        }}
      >
        <PublicArtistPageView data={data} embedded />
      </div>
    </div>
  );
}
