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

        body .community-detail-page .community-detail-shell {
          --playlist-detail-control-inset-left: 32px;
          --playlist-detail-control-inset-right: 32px;
          grid-template-columns: 82px minmax(0, 1fr) 42px 42px !important;
          column-gap: 13px !important;
        }

        body .community-detail-page .community-detail-hero,
        body .community-detail-page .community-detail-quick-row,
        body .community-detail-page .community-detail-section,
        body .community-detail-page .community-detail-shell > .community-detail-empty {
          box-sizing: border-box;
          width: min(100%, 1280px);
          justify-self: center;
          margin-right: auto !important;
          margin-left: auto !important;
        }

        body .community-detail-page .community-detail-more-button svg {
          width: 14px !important;
          height: 14px !important;
        }

        .community-detail-page .community-detail-favorite-button {
          grid-column: 3 !important;
          transform: translateX(5px);
        }

        .community-detail-page .community-detail-more-menu {
          grid-column: 4 !important;
        }

        @media (max-width: 720px) {
          body .community-detail-page .community-detail-shell {
            --playlist-detail-control-inset-left: 20px;
            --playlist-detail-control-inset-right: 20px;
          }
        }

        @media (max-width: 640px) {
          body .community-detail-page .community-detail-shell {
            grid-template-columns: 82px minmax(0, 1fr) 42px !important;
            column-gap: 18px !important;
          }

          .community-detail-page .community-detail-favorite-button {
            grid-column: 3 !important;
            transform: none;
          }
        }
      `}</style>
      <CommunityPlaylistDetailChrome />
      {children}
    </>
  );
}
