"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { REGION_OPTIONS } from "@/lib/constants";

type AdminSongRegionFieldInjectorProps = {
  songId?: string;
};

type EmbeddedRegionRoot = {
  root: Root;
  target: HTMLDivElement;
  ownerId: string;
};

declare global {
  interface Window {
    __filmwaveEmbeddedRegionRoot?: EmbeddedRegionRoot | null;
  }
}

function cleanupExistingEmbeddedRegionRoot(ownerId?: string) {
  const existing = window.__filmwaveEmbeddedRegionRoot;

  if (!existing) return;
  if (ownerId && existing.ownerId !== ownerId) return;

  window.__filmwaveEmbeddedRegionRoot = null;

  window.setTimeout(() => {
    existing.root.unmount();
    existing.target.remove();
  }, 0);
}

function RegionField({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Region
        </label>
        <span className="text-[11px] text-[var(--text-muted)]">
          {selected.length} selected
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REGION_OPTIONS.map((option) => {
          const active = selected.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`h-7 rounded-full border px-2.5 text-[11px] font-medium transition ${
                active
                  ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getFetchUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isAdminSongSaveRequest(input: RequestInfo | URL, init?: RequestInit) {
  const url = getFetchUrl(input);
  const method = String(
    init?.method || (input instanceof Request ? input.method : "GET"),
  ).toUpperCase();

  if (method !== "POST" && method !== "PATCH") return false;

  return /\/api\/admin\/songs(?:\/[^/]+)?$/.test(url);
}

function renameMoodWarningText() {
  document.querySelectorAll<HTMLElement>("div, span").forEach((element) => {
    if (element.childElementCount > 0) return;
    if (element.textContent?.trim() === "Mood tags empty") {
      element.textContent = "Scene tags empty";
    }
  });
}

export default function AdminSongRegionFieldInjector({
  songId,
}: AdminSongRegionFieldInjectorProps) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const selectedRegionsRef = useRef(selectedRegions);

  useEffect(() => {
    selectedRegionsRef.current = selectedRegions;
  }, [selectedRegions]);

  useEffect(() => {
    if (!songId) return;

    let cancelled = false;

    async function loadRegions() {
      try {
        const res = await fetch(`/api/admin/songs/${songId}`);
        const data = await res.json();

        if (cancelled || !res.ok) return;

        setSelectedRegions(Array.isArray(data.regions) ? data.regions : []);
      } catch {
        // Region tags are optional on older records.
      }
    }

    void loadRegions();

    return () => {
      cancelled = true;
    };
  }, [songId]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!isAdminSongSaveRequest(input, init)) {
        return originalFetch(input, init);
      }

      const body = init?.body;

      if (typeof body !== "string") {
        return originalFetch(input, init);
      }

      try {
        const payload = JSON.parse(body) as Record<string, unknown>;

        return originalFetch(input, {
          ...init,
          body: JSON.stringify({
            ...payload,
            regions: selectedRegionsRef.current,
          }),
        });
      } catch {
        return originalFetch(input, init);
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    const ownerId = `regions-${songId || "new"}`;
    let mounted = true;

    const findTagsSection = () => {
      const headers = Array.from(
        document.querySelectorAll<HTMLElement>(".admin-song-form-card-header"),
      );
      const header = headers.find((item) =>
        item.textContent?.trim().toLowerCase().includes("tags"),
      );

      return header?.closest("section") ?? null;
    };

    const renameMoodLabel = (section: Element) => {
      const labels = Array.from(section.querySelectorAll("label"));
      const moodLabel = labels.find(
        (label) => label.textContent?.trim().toLowerCase() === "mood",
      );

      if (moodLabel) moodLabel.textContent = "Scene";
    };

    const inject = () => {
      if (!mounted) return false;

      const tagsSection = findTagsSection();
      renameMoodWarningText();
      if (!tagsSection) return false;

      renameMoodLabel(tagsSection);

      const body = tagsSection.querySelector<HTMLElement>(
        ".admin-song-form-card-header + div",
      );

      if (!body) return false;

      const firstField = body.firstElementChild;
      let target = body.querySelector<HTMLDivElement>("[data-region-field-embedded]");
      const existing = window.__filmwaveEmbeddedRegionRoot;

      if (existing?.ownerId === ownerId && target === existing.target) {
        return true;
      }

      cleanupExistingEmbeddedRegionRoot();

      target = document.createElement("div");
      target.dataset.regionFieldEmbedded = "true";

      if (firstField?.nextSibling) {
        body.insertBefore(target, firstField.nextSibling);
      } else {
        body.append(target);
      }

      const root = createRoot(target);
      window.__filmwaveEmbeddedRegionRoot = {
        root,
        target,
        ownerId,
      };

      root.render(
        <RegionField
          selected={selectedRegionsRef.current}
          onToggle={(option) => {
            setSelectedRegions((current) =>
              current.includes(option)
                ? current.filter((item) => item !== option)
                : [...current, option],
            );
          }}
        />,
      );

      return true;
    };

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => inject());
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    inject();

    return () => {
      mounted = false;
      observer.disconnect();
      cleanupExistingEmbeddedRegionRoot(ownerId);
    };
  }, [songId]);

  useEffect(() => {
    const existing = window.__filmwaveEmbeddedRegionRoot;
    if (!existing) return;

    existing.root.render(
      <RegionField
        selected={selectedRegions}
        onToggle={(option) => {
          setSelectedRegions((current) =>
            current.includes(option)
              ? current.filter((item) => item !== option)
              : [...current, option],
          );
        }}
      />,
    );
  }, [selectedRegions]);

  return null;
}
