"use client";

import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";

type ShelfNavigationControlsProps = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

export default function ShelfNavigationControls({
  label,
  onPrev,
  onNext,
  canScrollPrev,
  canScrollNext,
}: ShelfNavigationControlsProps) {
  return (
    <div className="min-h-[34px]">
      <div className="hidden items-center gap-2 sm:flex">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canScrollPrev}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
          aria-label={`Scroll ${label} left`}
        >
          <ChevronLeftIcon size={16} />
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canScrollNext}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
          aria-label={`Scroll ${label} right`}
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </div>
  );
}
