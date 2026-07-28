"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type DiscoverCover = {
  id: number;
  name: string;
  cover_image_url?: string | null;
};

const DISCOVER_FEATURE_IMAGE =
  "https://images.filmwave.io/images/discover/140cb058-7569-435a-b76b-da1b744142e6.png";

export default function DiscoverDescriptorPills() {
  const pathname = usePathname();
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);
  const [covers, setCovers] = useState<DiscoverCover[]>([]);

  useEffect(() => {
    if (pathname !== "/discover") {
      setMountNode(null);
      return;
    }

    let frame = 0;
    let node: HTMLDivElement | null = null;

    function mountSection() {
      const content = document.querySelector<HTMLElement>(
        ".discover-page-root .discover-content",
      );

      if (!content) {
        frame = window.requestAnimationFrame(mountSection);
        return;
      }

      node = document.createElement("div");
      node.className = "discover-editorial-feature-mount";
      content.insertBefore(node, content.firstChild);
      setMountNode(node);
    }

    mountSection();

    return () => {
      window.cancelAnimationFrame(frame);
      node?.remove();
      setMountNode(null);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/discover") return;

    let cancelled = false;

    fetch("/api/curated-playlists")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;

        setCovers(
          data
            .filter((playlist) => Boolean(playlist?.cover_image_url))
            .slice(0, 3),
        );
      })
      .catch(() => {
        if (!cancelled) setCovers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!mountNode) return null;

  const coverSlots = Array.from(
    { length: 3 },
    (_, index) => covers[index] ?? null,
  );

  return createPortal(
    <>
      <style>{`
        .discover-editorial-feature-mount {
          width: min(100%, var(--discover-editorial-width, 1120px));
          margin: 0 auto clamp(130px, 13vw, 210px);
        }

        .discover-editorial-feature {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
          align-items: center;
          gap: clamp(48px, 6vw, 100px);
        }

        .discover-editorial-feature-visual {
          position: relative;
          min-width: 0;
          padding: clamp(12px, 1.5vw, 22px) clamp(34px, 4.5vw, 72px)
            clamp(38px, 4.5vw, 68px) 0;
        }

        .discover-editorial-feature-image {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          background: #111;
        }

        .discover-editorial-feature-image img {
          object-fit: cover;
        }

        .discover-editorial-feature-image::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(0, 0, 0, 0.04),
            transparent 52%,
            rgba(0, 0, 0, 0.28)
          );
          pointer-events: none;
        }

        .discover-editorial-feature-cover {
          position: absolute;
          z-index: 2;
          overflow: hidden;
          aspect-ratio: 1;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: #1a1a1a;
          box-shadow: 0 22px 58px rgba(0, 0, 0, 0.42);
        }

        .discover-editorial-feature-cover img {
          object-fit: cover;
        }

        .discover-editorial-feature-cover:nth-of-type(2) {
          top: 5%;
          right: 0;
          width: 27%;
        }

        .discover-editorial-feature-cover:nth-of-type(3) {
          bottom: 0;
          left: 8%;
          width: 23%;
        }

        .discover-editorial-feature-cover:nth-of-type(4) {
          right: 9%;
          bottom: 4%;
          width: 20%;
        }

        .discover-editorial-feature-cover-placeholder {
          width: 100%;
          height: 100%;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.14), transparent 44%),
            linear-gradient(135deg, #302a3d, #111 55%, #6b4f76);
        }

        .discover-editorial-feature-cover:nth-of-type(3)
          .discover-editorial-feature-cover-placeholder {
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), transparent 44%),
            linear-gradient(135deg, #25413e, #111 55%, #3d7b6c);
        }

        .discover-editorial-feature-cover:nth-of-type(4)
          .discover-editorial-feature-cover-placeholder {
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.12), transparent 44%),
            linear-gradient(135deg, #5a3024, #111 55%, #a65c3c);
        }

        .discover-editorial-feature-copy {
          min-width: 0;
        }

        .discover-editorial-feature-copy h2 {
          margin: 0;
          color: #fff;
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(42px, 4.8vw, 68px);
          font-weight: 400;
          letter-spacing: -0.055em;
          line-height: 0.92;
          text-transform: uppercase;
        }

        .discover-editorial-feature-copy h2 span {
          display: block;
        }

        .discover-editorial-feature-copy p {
          max-width: 470px;
          margin: clamp(28px, 3vw, 46px) 0 0;
          color: rgba(255, 255, 255, 0.9);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(17px, 1.35vw, 21px);
          font-weight: 400;
          letter-spacing: -0.025em;
          line-height: 1.42;
        }

        @media (max-width: 900px) {
          .discover-editorial-feature {
            grid-template-columns: 1fr;
            gap: 54px;
          }

          .discover-editorial-feature-visual {
            width: min(100%, 720px);
          }

          .discover-editorial-feature-copy {
            width: min(100%, 620px);
          }
        }

        @media (max-width: 620px) {
          .discover-editorial-feature-mount {
            margin-bottom: 110px;
          }

          .discover-editorial-feature {
            gap: 42px;
          }

          .discover-editorial-feature-visual {
            padding-right: 28px;
            padding-bottom: 42px;
          }

          .discover-editorial-feature-copy h2 {
            font-size: clamp(40px, 13vw, 58px);
          }

          .discover-editorial-feature-copy p {
            margin-top: 24px;
            font-size: 17px;
          }
        }
      `}</style>

      <section
        className="discover-editorial-feature"
        aria-label="New music and sound effects"
      >
        <div className="discover-editorial-feature-visual">
          <div className="discover-editorial-feature-image">
            <Image
              src={DISCOVER_FEATURE_IMAGE}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 901px) 58vw, 100vw"
            />
          </div>

          {coverSlots.map((cover, index) => (
            <div
              key={cover?.id ?? `cover-placeholder-${index}`}
              className="discover-editorial-feature-cover"
              aria-hidden="true"
            >
              {cover?.cover_image_url ? (
                <Image
                  src={cover.cover_image_url}
                  alt=""
                  fill
                  unoptimized
                  sizes="240px"
                />
              ) : (
                <div className="discover-editorial-feature-cover-placeholder" />
              )}
            </div>
          ))}
        </div>

        <div className="discover-editorial-feature-copy">
          <h2>
            <span>New music.</span>
            <span>New sounds.</span>
          </h2>
          <p>
            Fresh additions selected for editors, with more music and sound
            effects arriving regularly.
          </p>
        </div>
      </section>
    </>,
    mountNode,
  );
}
