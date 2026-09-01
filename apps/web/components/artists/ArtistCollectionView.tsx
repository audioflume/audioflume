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
  const nextViewMode = viewMode === "grid" ? "list" : "grid";

  return (
    <button
      type="button"
      onClick={() => onChange(nextViewMode)}
      aria-label={`Switch to ${nextViewMode} view`}
      title={`Switch to ${nextViewMode} view`}
      className="filmwave-backend-button filmwave-backend-button-secondary w-10 px-0"
    >
      {viewMode === "grid" ? <ListViewIcon size={24} /> : <GridViewIcon size={24} />}
    </button>
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
  dragHandle,
  actionLabel = "Edit",
  onClick,
}: {
  artworkUrl: string | null;
  artworkShape: "square" | "wide";
  title: string;
  meta: string;
  status?: ReactNode;
  dragHandle?: ReactNode;
  actionLabel?: string;
  onClick: () => void;
}) {
  return (
    <article className="group min-w-0 text-[var(--text-primary)]">
      <div
        className={`relative w-full overflow-hidden bg-[var(--bg-secondary)] ${
          artworkShape === "wide" ? "aspect-[16/9]" : "aspect-square"
        }`}
      >
        <button
          type="button"
          onClick={onClick}
          className="block h-full w-full border-0 bg-transparent p-0 text-left"
          aria-label={`${actionLabel} ${title}`}
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
        </button>

        {dragHandle ? (
          <div className="absolute left-2 top-2 z-20">{dragHandle}</div>
        ) : null}

        <button
          type="button"
          onClick={onClick}
          className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        >
          {actionLabel}
        </button>
      </div>

      <div className="pt-2.5">
        <div className="truncate text-[13px] font-medium leading-[1.35]">{title}</div>
        <div className="mt-1 truncate text-[11px] leading-[1.45] text-[var(--text-muted)]">
          {meta}
        </div>
      </div>

      {status ? <div className="mt-2">{status}</div> : null}
    </article>
  );
}
