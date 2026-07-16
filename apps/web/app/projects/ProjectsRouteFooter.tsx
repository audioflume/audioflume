"use client";

import Footer from "@/components/Footer";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ProjectsRouteFooter() {
  const pathname = usePathname();
  const isProjectDetail = /^\/projects\/[^/]+/.test(pathname);
  const [detailTarget, setDetailTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isProjectDetail) {
      setDetailTarget(null);
      return;
    }

    let observer: MutationObserver | null = null;

    function findDetailTarget() {
      const nextTarget = document.querySelector<HTMLElement>(
        "main.project-detail-page > .project-detail-shell",
      );

      setDetailTarget(nextTarget);
      return Boolean(nextTarget);
    }

    if (!findDetailTarget()) {
      observer = new MutationObserver(() => {
        if (!findDetailTarget()) return;
        observer?.disconnect();
        observer = null;
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
    };
  }, [isProjectDetail, pathname]);

  const footer = (
    <div
      className={
        isProjectDetail
          ? "project-detail-content-footer"
          : "projects-route-footer"
      }
    >
      <Footer />
    </div>
  );

  if (isProjectDetail) {
    return detailTarget ? createPortal(footer, detailTarget) : null;
  }

  return footer;
}
