"use client";

import Link from "next/link";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import SlidingShelfShell from "@/components/SlidingShelfShell";

type Step = { number: string; title: string; copy: string };

export default function FoundingStepsShelf({ steps }: { steps: Step[] }) {
  return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer.disconnect();
    };
  }, [steps.length]);

  return (
    <SlidingShelfShell label="application steps" itemCount={steps.length + 1}>
        {steps.map(({ number, title, copy }) => (
          <article className="af-founding-step-card" key={number}>
            <div className="af-founding-step-number">{number}</div>
            <div className="af-founding-step-content"><h3>{title}</h3><p>{copy}</p></div>
          </article>
        ))}
        <Link className="af-founding-step-card af-founding-step-apply" href="/artists/apply">
          <span>READY TO JOIN?</span>
          <span className="af-founding-step-apply-bottom"><strong>Apply to become a Founding Artist</strong><ArrowUpRightIcon size={36} strokeWidth={1.5} /></span>
        </Link>
    </SlidingShelfShell>
  );
}
