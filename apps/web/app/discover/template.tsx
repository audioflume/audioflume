import type { ReactNode } from "react";
import DiscoverReferenceLayout from "./DiscoverReferenceLayout";
import "./discover-reference-layout.css";

export default function DiscoverTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DiscoverReferenceLayout />
    </>
  );
}
