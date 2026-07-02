"use client";

import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

type AdminSongAiGeneratedFieldInjectorProps = {
  songId?: string;
};

type EmbeddedAiGeneratedRoot = {
  root: Root;
  target: HTMLDivElement;
  ownerId: string;
};

declare global {
  interface Window {
    __filmwaveEmbeddedAiGeneratedRoot?: EmbeddedAiGeneratedRoot | null;
  }
}

function cleanupExistingEmbeddedAiGeneratedRoot(ownerId?: string) {
  const existing = window.__filmwaveEmbeddedAiGeneratedRoot;

  if (!existing) return;
  if (ownerId && existing.ownerId !== ownerId) return;

  window.__filmwaveEmbeddedAiGeneratedRoot = null;

  window.setTimeout(() => {
    existing.root.unmount();
    existing.target.remove();
  }, 0);
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

function AiGeneratedField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        AI
      </label>
      <label
        className={`group flex h-9 cursor-pointer items-center gap-2.5 self-end border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs transition hover:text-[var(--text-primary)] ${
          checked ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />

        <span className="flex h-3.5 w-3.5 items-center justify-center border border-[var(--border)] bg-[var(--bg-secondary)] transition group-hover:border-[var(--text-secondary)] peer-checked:border-[var(--text-primary)] peer-checked:bg-[var(--text-primary)] peer-checked:[&>svg]:opacity-100">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="opacity-0 text-[var(--bg-primary)] transition">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        Made with AI
      </label>
    </div>
  );
}

export default function AdminSongAiGeneratedFieldInjector({
  songId,
}: AdminSongAiGeneratedFieldInjectorProps) {
  const [aiGenerated, setAiGenerated] = useState(false);
  const aiGeneratedRef = useRef(aiGenerated);

  useEffect(() => {
    aiGeneratedRef.current = aiGenerated;
  }, [aiGenerated]);

  useEffect(() => {
    if (!songId) return;

    let cancelled = false;

    async function loadAiGenerated() {
      try {
        const res = await fetch(`/api/admin/songs/${songId}`);
        const data = await res.json();

        if (cancelled || !res.ok) return;

        setAiGenerated(Boolean(data.aiGenerated));
      } catch {
        // AI metadata is optional on older records.
      }
    }

    void loadAiGenerated();

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
            aiGenerated: aiGeneratedRef.current,
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
    const ownerId = `ai-generated-${songId || "new"}`;
    let mounted = true;

    const findSongInfoSection = () => {
      const headers = Array.from(
        document.querySelectorAll<HTMLElement>(".admin-song-form-card-header"),
      );
      const header = headers.find((item) =>
        item.textContent?.trim().toLowerCase().includes("song info"),
      );

      return header?.closest("section") ?? null;
    };

    const inject = () => {
      if (!mounted) return false;

      const songInfoSection = findSongInfoSection();
      if (!songInfoSection) return false;

      const body = songInfoSection.querySelector<HTMLElement>(
        ".admin-song-form-card-header + div",
      );

      if (!body) return false;

      let target = body.querySelector<HTMLDivElement>("[data-ai-generated-field-embedded]");
      const existing = window.__filmwaveEmbeddedAiGeneratedRoot;

      if (existing?.ownerId === ownerId && target === existing.target) {
        return true;
      }

      cleanupExistingEmbeddedAiGeneratedRoot();

      target = document.createElement("div");
      target.dataset.aiGeneratedFieldEmbedded = "true";
      body.append(target);

      const root = createRoot(target);
      window.__filmwaveEmbeddedAiGeneratedRoot = {
        root,
        target,
        ownerId,
      };

      root.render(
        <AiGeneratedField
          checked={aiGeneratedRef.current}
          onChange={setAiGenerated}
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
      cleanupExistingEmbeddedAiGeneratedRoot(ownerId);
    };
  }, [songId]);

  useEffect(() => {
    const existing = window.__filmwaveEmbeddedAiGeneratedRoot;
    if (!existing) return;

    existing.root.render(
      <AiGeneratedField
        checked={aiGenerated}
        onChange={setAiGenerated}
      />,
    );
  }, [aiGenerated]);

  return null;
}
