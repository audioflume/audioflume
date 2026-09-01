"use client";

import type { ReactNode } from "react";

import GridViewIcon from "@/components/icons/GridViewIcon";
import ListViewIcon from "@/components/icons/ListViewIcon";

export type ArtistCollectionViewMode = "list" | "grid";

export function ArtistCollectionViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ArtistCollectionViewMode;
  onChange: (viewMode: ArtistCollectionViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-1" aria-label="Collection view">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={viewMode === "list"}
        title="List view"
        className={`filmwave-backend-button filmwave-backend-button-compact ${
          viewMode === "list"
            ? "filmwave-backend-button-primary"
            : "filmwave-backend-button-secondary"
        }`}
      >
        <ListViewIcon size={14} />
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={viewMode === "grid"}
        title="Grid view"
        className={`filmwave-backend-button filmwave-backend-button-compact ${
          viewMode === "grid"
            ? "filmwave-backend-button-primary"
            : "filmwave-backend-button-secondary"
        }`}
      >
        <GridViewIcon size={14} />
      </button>
    </div>
  );
}

export function ArtistCollectionGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-[22px] gap-y-8 min-[480px]:grid-cols-2 min-[760px]:grid-cols-3 min-[1100px]:grid-cols-4">
      {children}
    </div>
  );
}

export function ArtistCollectionGridCard({
  artworkUrl,
  artworkShape,
  title,
  meta,
  status,
  onClick,
}: {
  artworkUrl: string | null;
  artworkShape: "square" | "wide";
  title: string;
  meta: string;
  status?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block min-w-0 border-0 bg-transparent p-0 text-left text-[var(--text-primary)]"
    >
      <span
        className={`relative block w-full overflow-hidden bg-[var(--bg-secondary)] ${
          artworkShape === "wide" ? "aspect-[16/9]" : "aspect-square"
        }`}
      >
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt=""
            className="block h-full w-full object-cover transition-opacity group-hover:opacity-80"
          />
        ) : (
          <span
            className="block h-full w-full bg-[var(--bg-secondary)] transition-opacity group-hover:opacity-80"
            aria-hidden="true"
          />
        )}
      </span>
      <span className="block pt-2.5">
        <span className="block truncate text-[13px] font-medium leading-[1.35]">
          {title}
        </span>
        <span className="mt-1 block truncate text-[11px] leading-[1.45] text-[var(--text-muted)]">
          {meta}
        </span>
        {status ? <span className="mt-2 block">{status}</span> : null}
      </span>
    </button>
  );
}
