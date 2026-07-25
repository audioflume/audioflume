import type { ReactNode } from "react";
import DiscoverBottomGraphic from "./DiscoverBottomGraphic";
import DiscoverReferenceLayout from "./DiscoverReferenceLayout";
import "./discover-reference-layout.css";

export default function DiscoverTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DiscoverReferenceLayout />
      <DiscoverBottomGraphic />
    </>
  );
}
