"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function DiscoverBottomGraphic() {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const outro = document.querySelector<HTMLElement>(".discover-reference-outro");
    if (!outro) return;

    const graphicMount = document.createElement("div");
    graphicMount.className = "discover-bottom-graphic-mount";
    outro.appendChild(graphicMount);
    setMount(graphicMount);

    return () => {
      graphicMount.remove();
    };
  }, []);

  return (
    <>
      <style>{`
        .discover-reference-outro .discover-reference-line-graphic,
        .discover-reference-outro > div:nth-child(2) > svg {
          display: none !important;
        }

        .discover-bottom-graphic-mount {
          grid-column: 1 / -1;
          width: 100%;
          margin-top: clamp(48px, 5vw, 76px);
        }

        .discover-bottom-graphic {
          display: block;
          width: 100%;
          height: auto;
        }
      `}</style>

      {mount &&
        createPortal(
          <img
            className="discover-bottom-graphic"
            src="/images/discover/audioflume-bottom-mark.svg"
            alt=""
            aria-hidden="true"
          />,
          mount,
        )}
    </>
  );
}
