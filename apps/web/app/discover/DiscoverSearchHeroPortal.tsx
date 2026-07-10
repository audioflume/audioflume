"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import SearchIcon from "@/components/icons/SearchIcon";

const DISCOVER_SEARCH_HERO_PORTAL_ID = "discover-search-hero-portal";

const SEARCH_PROMPTS = [
  "Cinematic",
  "Documentary",
  "Ambient",
  "Piano",
  "Travel",
  "Dark",
];

function DiscoverHeroSearchBar() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanSearch = search.trim();

    if (!cleanSearch) {
      router.push("/music");
      return;
    }

    router.push(`/music?search=${encodeURIComponent(cleanSearch)}`);
  }

  function searchPrompt(prompt: string) {
    router.push(`/music?search=${encodeURIComponent(prompt)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      onClick={() => searchInputRef.current?.focus()}
      className="group flex min-h-[58px] w-full cursor-text items-center gap-3 rounded-full border border-white/18 bg-white/90 px-[11px] text-black shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur transition hover:bg-white focus-within:bg-white"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/8 text-black/54 transition group-focus-within:text-black">
        <SearchIcon size={15} />
      </div>

      <input
        ref={searchInputRef}
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by scene, mood, artist, genre, instrument, or title..."
        className="h-full min-w-0 flex-1 bg-transparent text-sm font-light text-black outline-none placeholder:text-black/48"
      />

      <div className="hidden items-center gap-1.5 lg:flex">
        {SEARCH_PROMPTS.slice(0, 4).map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              searchPrompt(prompt);
            }}
            className="h-7 cursor-pointer rounded-full border border-black/10 bg-black/[0.04] px-3 text-[11px] font-medium text-black/64 transition hover:border-black/24 hover:text-black"
          >
            {prompt}
          </button>
        ))}
      </div>

      <button
        type="submit"
        onClick={(event) => event.stopPropagation()}
        className="hidden h-9 shrink-0 cursor-pointer items-center rounded-full bg-black px-10 text-xs font-medium text-white transition hover:opacity-80 sm:flex"
      >
        Search
      </button>
    </form>
  );
}

function DiscoverSearchHero({ imageSrc }: { imageSrc: string | null }) {
  return (
    <section className="discover-search-hero-block relative mt-2 min-h-[360px] overflow-hidden border border-[var(--border)] bg-[var(--bg-secondary)]">
      <style>{`
        .discover-header-search-row {
          display: none !important;
        }
      `}</style>

      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(255,255,255,0.22),transparent_32%),linear-gradient(135deg,#27243c_0%,#111111_48%,#5d567a_100%)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/48 to-black/16" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/72 to-transparent" />

      <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-6 md:p-8">
        <div className="max-w-[760px]">
          <div className="mb-3 inline-flex items-center text-[11px] font-medium uppercase tracking-[0.08em] text-white/68">
            Search the library
          </div>

          <h2 className="font-[family-name:var(--font-instrument-sans)] text-[clamp(38px,5vw,68px)] font-medium leading-[0.9] tracking-[-0.07em] text-white">
            Discover the sound your scene is asking for.
          </h2>

          <p className="mt-4 max-w-[560px] text-sm leading-6 text-white/72">
            Search by feeling, scene, genre, instrument, or reference point and move straight into tracks that fit the cut.
          </p>
        </div>

        <div className="mt-7 max-w-[1040px]">
          <DiscoverHeroSearchBar />
        </div>
      </div>
    </section>
  );
}

export default function DiscoverSearchHeroPortal() {
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let createdNode: HTMLElement | null = null;
    let timeoutId: number | null = null;
    const hiddenElements = new Map<HTMLElement, string>();

    function hideElement(element: HTMLElement | null) {
      if (!element || hiddenElements.has(element)) return;
      hiddenElements.set(element, element.style.display);
      element.style.display = "none";
    }

    function restoreHiddenElements() {
      hiddenElements.forEach((display, element) => {
        element.style.display = display;
      });
      hiddenElements.clear();
    }

    function mountPortal() {
      const existingNode = document.getElementById(DISCOVER_SEARCH_HERO_PORTAL_ID);

      if (existingNode) {
        setPortalNode(existingNode);
        return true;
      }

      const visualSearchInput = Array.from(
        document.querySelectorAll<HTMLInputElement>("input[placeholder]"),
      ).find((input) =>
        input.placeholder.includes("Search by scene, mood, artist"),
      );
      const visualSearchSection = visualSearchInput?.closest("section") as HTMLElement | null;
      const visualGrid = visualSearchSection?.nextElementSibling as HTMLElement | null;
      const parent = visualSearchSection?.parentElement;

      if (!visualSearchSection || !visualGrid || !parent) return false;

      const firstGridImage = visualGrid.querySelector<HTMLImageElement>("img");
      setImageSrc(firstGridImage?.currentSrc || firstGridImage?.src || null);

      hideElement(document.querySelector<HTMLElement>(".discover-header-search-row"));
      hideElement(visualSearchSection);

      createdNode = document.createElement("div");
      createdNode.id = DISCOVER_SEARCH_HERO_PORTAL_ID;
      parent.insertBefore(createdNode, visualGrid);
      setPortalNode(createdNode);
      return true;
    }

    if (mountPortal()) {
      return () => {
        createdNode?.remove();
        restoreHiddenElements();
        setPortalNode(null);
      };
    }

    const observer = new MutationObserver(() => {
      if (mountPortal()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    timeoutId = window.setTimeout(() => observer.disconnect(), 10000);

    return () => {
      observer.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
      createdNode?.remove();
      restoreHiddenElements();
      setPortalNode(null);
    };
  }, []);

  if (!portalNode) return null;

  return createPortal(<DiscoverSearchHero imageSrc={imageSrc} />, portalNode);
}
