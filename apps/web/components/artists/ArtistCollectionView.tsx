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
      <span
        className="flex h-[18px] w-[18px] shrink-0 flex-col justify-between py-[2px]"
        aria-hidden="true"
      >
        <span className="block h-[2px] w-full rounded-full bg-current" />
        <span className="block h-[2px] w-full rounded-full bg-current" />
        <span className="block h-[2px] w-full rounded-full bg-current" />
      </span>
    );
  }

  return (
    <span
      className="grid h-[18px] w-[18px] shrink-0 grid-cols-2 grid-rows-2 gap-[3px]"
      aria-hidden="true"
    >
      <span className="border border-current" />
      <span className="border border-current" />
      <span className="border border-current" />
      <span className="border border-current" />
    </span>
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
    <button
      type="button"
      onClick={() => onChange(nextViewMode)}
      aria-label={`Switch to ${nextViewMode} view`}
      title={`Switch to ${nextViewMode} view`}
      className="filmwave-backend-button filmwave-backend-button-secondary w-10 px-0"
    >
      <ArtistCollectionViewModeIcon mode={nextViewMode} />
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
