"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import BackendDragHandle from "@/components/backend/BackendDragHandle";

export type ArtistCollectionViewMode = "list" | "grid";

function ArtistCollectionViewModeIcon({
  mode,
}: {
  mode: ArtistCollectionViewMode;
}) {
  if (mode === "list") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ width: 17, height: 17, flex: "0 0 17px" }}
      >
        <path
          d="M8 7H20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 12H20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 17H20"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M4 7H4.01"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M4 12H4.01"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M4 17H4.01"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ width: 17, height: 17, flex: "0 0 17px" }}
    >
      <rect
        x="4"
        y="4"
        width="6.5"
        height="6.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="13.5"
        y="4"
        width="6.5"
        height="6.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="4"
        y="13.5"
        width="6.5"
        height="6.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="13.5"
        y="13.5"
        width="6.5"
        height="6.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ArtistCollectionViewToggle({
  viewMode,
  onChange,
}: {
  viewMode: ArtistCollectionViewMode;
  onChange: (viewMode: ArtistCollectionViewMode) => void;
}) {
  const nextViewMode = viewMode === "grid" ? "list" : "grid";

  return (
    <>
      <style>{`
        main:has(> aside[class*="admin-sidebar-width"])
          > section
          div:has(
            > div:first-child
              > .artist-collection-view-toggle[aria-label="Switch to list view"]
          )
          > div:nth-child(2) {
          position: relative;
        }

        main:has(> aside[class*="admin-sidebar-width"])
          > section
          div:has(
            > div:first-child
              > .artist-collection-view-toggle[aria-label="Switch to list view"]
          )
          > div:nth-child(2)
          > div:first-child:has(> .filmwave-backend-section-title) {
          position: absolute;
          top: -56px;
          left: 0;
          z-index: 1;
          height: 40px;
          margin-bottom: 0;
          align-items: center;
        }
      `}</style>
      <button
        type="button"
        onClick={() => onChange(nextViewMode)}
        aria-label={`Switch to ${nextViewMode} view`}
        title={`Switch to ${nextViewMode} view`}
        className="artist-collection-view-toggle filmwave-backend-button filmwave-backend-button-secondary w-10 px-0"
      >
        <ArtistCollectionViewModeIcon mode={nextViewMode} />
      </button>
    </>
  );
}

export function ArtistCollectionGrid({ children }: { children: ReactNode }) {
  return (
    <div className="artist-collection-grid grid grid-cols-1 gap-x-[22px] gap-y-8 min-[480px]:grid-cols-2 min-[760px]:grid-cols-3 min-[1100px]:grid-cols-4">
      {children}
    </div>
  );
}

export function ArtistCollectionGridCard({
  sortableId,
  artworkUrl,
  artworkShape,
  title,
  meta,
  status,
  canDrag,
  dragDisabled,
  actionLabel = "Edit",
  onClick,
}: {
  sortableId: string;
  artworkUrl: string | null;
  artworkShape: "square" | "wide";
  title: string;
  meta: string;
  status?: ReactNode;
  canDrag: boolean;
  dragDisabled: boolean;
  actionLabel?: string;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId, disabled: !canDrag || dragDisabled });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 2 : "auto",
      }}
      className="group min-w-0 text-[var(--text-primary)]"
    >
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

        {canDrag ? (
          <div className="absolute left-2 top-2 z-20">
            <BackendDragHandle
              variant="overlay"
              disabled={dragDisabled}
              aria-label={`Drag ${title} to reorder`}
              {...attributes}
              {...listeners}
            />
          </div>
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
