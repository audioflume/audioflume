import type { ReactNode } from "react";
import CommunityPlaylistDetailChrome from "./CommunityPlaylistDetailChrome";

export default function CommunityPlaylistDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <style>{`
        .community-detail-page {
          margin-left: var(--filmwave-page-sidebar-offset) !important;
          margin-top: var(--filmwave-header-height, 75px) !important;
        }

        .community-detail-page .community-detail-more-button svg {
          width: 14px !important;
          height: 14px !important;
        }

        .community-detail-page .community-detail-favorite-button {
          transform: translateX(10px);
        }

        @media (max-width: 640px) {
          .community-detail-page .community-detail-favorite-button {
            transform: none;
          }
        }
      `}</style>
      <CommunityPlaylistDetailChrome />
      {children}
    </>
  );
}
