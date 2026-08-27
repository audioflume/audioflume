"use client";

type ShelfNavigationControlsProps = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
};

export default function ShelfNavigationControls(
  _props: ShelfNavigationControlsProps,
) {
  return <div className="h-[34px] w-0" aria-hidden="true" />;
}
