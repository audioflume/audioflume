"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import { playlistDetailPrimaryActionButtonClass } from "@/components/uiClasses";
import "../../../app/pricing/pricing-page.css";
import { formatCount } from "../accountUtils";
import {
  Card,
  CardTitle,
  DangerButton,
  Feedback,
  Info,
} from "../AccountUI";
import { useMembershipData } from "../hooks/useMembershipData";

function PlanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-medium leading-5 text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

export default function MembershipSection() {
  const { membership, display, usage, loadState } = useMembershipData();
  const [pricingImages, setPricingImages] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    fetch("/api/pricing-plan-images")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { images?: string[] }) => {
        if (active) setPricingImages(data.images ?? []);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const licenseLabel = membership?.license_label || "Royalty-free commercial use";
  const currentPlanLabel = display?.plan_label || "Lifetime Membership";

  const plans = [
    {
      name: "Creative",
      price: "$15",
      description: "For solo filmmakers licensing music and SFX for their own client work.",
      features: ["Full music + SFX catalogue", "Royalty-free commercial use", "Projects, playlists + favorites", "Desktop sync workflow"],
    },
    {
      name: "Studio Pro+",
      price: "$39",
      description: "For active filmmakers and small teams handling more projects and client work.",
      features: ["Expanded project coverage", "Small-team commercial licensing", "Full music + SFX catalogue", "Desktop sync workflow"],
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For agencies, publishers, and larger teams with high-volume or custom licensing needs.",
      features: ["Higher-volume licensing", "Custom usage terms", "Larger team coverage", "Direct licensing support"],
    },
  ];

  return (
    <>
      {loadState === "error" ? (
        <div className="mb-4">
          <Feedback tone="error" message="Could not load membership details. Make sure the Supabase SQL has been run." />
        </div>
      ) : null}

      <div className="audioflume-pricing-plan-grid mb-4">
        {plans.map((plan, index) => {
          const isCurrentPlan = plan.name === "Studio Pro+";
          return (
            <article key={plan.name} className="audioflume-pricing-plan">
              <div
                className="audioflume-pricing-plan-background absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: pricingImages[index] ? `url("${pricingImages[index]}")` : undefined }}
                aria-hidden="true"
              />
              <div className="audioflume-pricing-plan-banner">
                <h3 className="audioflume-pricing-plan-name">{plan.name}</h3>
              </div>
              {isCurrentPlan ? (
                <span className="absolute right-6 top-6 z-[3] inline-flex w-max items-center bg-white px-2 py-1 text-[10px] font-medium uppercase leading-none text-[#111111]">
                  Active
                </span>
              ) : null}
              <div className="audioflume-pricing-plan-body">
                <p className="audioflume-pricing-plan-description">{plan.description}</p>
                <div className="audioflume-pricing-plan-price">
                  <strong>{plan.price}</strong>
                  {plan.name !== "Enterprise" ? <span>CAD / month</span> : null}
                </div>
                <div className="audioflume-pricing-plan-action-row">
                  {isCurrentPlan ? (
                    <div className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button pointer-events-none !h-[52px] !w-full !max-w-none !cursor-default`} style={{ fontSize: "14px", fontWeight: 400 }}>
                      Current plan
                    </div>
                  ) : (
                    <Link href="/pricing" className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`} style={{ fontSize: "14px", fontWeight: 400 }}>
                      Change Plan
                      <ArrowUpRightIcon size={16} strokeWidth={1.5} className="-ml-[3px] translate-y-[1px]" />
                    </Link>
                  )}
                </div>
                <ul className="audioflume-pricing-plan-features">
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardTitle title="Current membership" description="Your active Audioflume plan and license coverage." />
          <div className="grid gap-4 p-4 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-xs font-medium text-[var(--text-muted)]">Plan</div>
              <div className="mt-1 text-xl font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                {currentPlanLabel}
              </div>
              <div className="mt-3 inline-flex rounded-full border-[1.25px] border-[rgba(72,181,113,0.35)] bg-[rgba(72,181,113,0.08)] px-2.5 py-1 text-[11px] font-medium text-[#48b571]">
                {display?.status_label || "Active"}
              </div>
            </div>

            <div className="border-t-[1.25px] border-[var(--border)] pt-4 md:border-l-[1.25px] md:border-t-0 md:pl-4 md:pt-0">
              <div className="text-xs font-medium text-[var(--text-muted)]">License</div>
              <div className="mt-1 text-sm font-medium leading-5 text-[var(--text-primary)]">{licenseLabel}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                Covers eligible Audioflume downloads for client, commercial, and creator projects.
              </p>
            </div>
          </div>

          <div className="grid gap-4 border-t-[1.25px] border-[var(--border)] p-4 sm:grid-cols-2">
            <PlanDetail label="Renewal" value={display?.renewal_label || "Loading"} />
            <PlanDetail label="Downloads" value={display?.downloads_label || "Loading"} />
          </div>
        </Card>

        <Card>
          <CardTitle title="Usage snapshot" description="Live account signals from your Audioflume workspace." />
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1">
            <Info label="Songs downloaded" value={formatCount(usage?.downloads ?? 0, "download")} />
            <Info label="Projects created" value={formatCount(usage?.projects ?? 0, "project")} />
            <Info label="Favorite tracks" value={formatCount(usage?.favorites ?? 0, "saved track")} />
            <Info label="Playlists" value={formatCount(usage?.playlists ?? 0, "playlist")} />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">Cancel membership</div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-muted)]">
              Membership cancellation will be handled through Stripe once subscriptions are connected.
            </p>
          </div>
          <DangerButton>Cancel Membership</DangerButton>
        </div>
      </Card>
    </>
  );
}
