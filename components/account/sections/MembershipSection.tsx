"use client";

import { membershipPlanImages } from "../accountData";
import { formatCount } from "../accountUtils";
import {
  Button,
  Card,
  CardTitle,
  DangerButton,
  DiagonalArrowIcon,
  Feedback,
  Info,
  VisualPanel,
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

function ActivePill() {
  return (
    <div className="inline-flex items-center rounded-full border border-[rgba(72,181,113,0.35)] bg-[rgba(72,181,113,0.08)] px-2.5 py-1 text-[11px] font-medium text-[#48b571]">
      Active
    </div>
  );
}

function CurrentPlanButton() {
  return (
    <div className="inline-flex h-8 min-w-[122px] items-center justify-center rounded-full border border-[rgba(72,181,113,0.35)] bg-[rgba(72,181,113,0.08)] px-3.5 text-xs font-medium text-[#48b571]">
      Current plan
    </div>
  );
}

export default function MembershipSection() {
  const { membership, display, usage, loadState } = useMembershipData();

  const licenseLabel = membership?.license_label || "Royalty-free commercial use";
  const currentPlanLabel = display?.plan_label || "Lifetime Membership";

  const plans = [
    ["Starter", "$15 CAD / mo", "Solo creators building a smaller library of client projects."],
    ["Studio", "$39 CAD / mo", "For active filmmakers and small teams who need more project coverage."],
    ["Enterprise", "Custom", "For agencies, publishers, and teams with higher-volume licensing needs."],
  ];

  return (
    <>
      {loadState === "error" ? (
        <div className="mb-4">
          <Feedback tone="error" message="Could not load membership details. Make sure the Supabase SQL has been run." />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardTitle title="Current membership" description="Your active Filmwave plan and license coverage." />
          <div className="grid gap-4 p-4 md:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-xs font-medium text-[var(--text-muted)]">Plan</div>
              <div className="mt-1 text-xl font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                {currentPlanLabel}
              </div>
              <div className="mt-3 inline-flex rounded-full border border-[rgba(72,181,113,0.35)] bg-[rgba(72,181,113,0.08)] px-2.5 py-1 text-[11px] font-medium text-[#48b571]">
                {display?.status_label || "Active"}
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
              <div className="text-xs font-medium text-[var(--text-muted)]">License</div>
              <div className="mt-1 text-sm font-medium leading-5 text-[var(--text-primary)]">{licenseLabel}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                Covers eligible Filmwave downloads for client, commercial, and creator projects.
              </p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-[var(--border)] p-4 sm:grid-cols-2">
            <PlanDetail label="Renewal" value={display?.renewal_label || "Loading"} />
            <PlanDetail label="Downloads" value={display?.downloads_label || "Loading"} />
          </div>
        </Card>

        <Card>
          <CardTitle title="Usage snapshot" description="Live account signals from your Filmwave workspace." />
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1">
            <Info label="Songs downloaded" value={formatCount(usage?.downloads ?? 0, "download")} />
            <Info label="Projects created" value={formatCount(usage?.projects ?? 0, "project")} />
            <Info label="Favorite tracks" value={formatCount(usage?.favorites ?? 0, "saved track")} />
            <Info label="Playlists" value={formatCount(usage?.playlists ?? 0, "playlist")} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {plans.map(([name, price, description], index) => {
          const isCurrentPlan = name === "Studio";

          return (
            <Card key={name} className="group">
              <VisualPanel image={membershipPlanImages[index]} />
              <div className="p-4">
                <div className="flex min-h-[190px] flex-col">
                  <div className="flex min-h-7 items-start justify-between gap-3">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{name}</div>
                    {isCurrentPlan ? <ActivePill /> : null}
                  </div>
                  <div className="mt-2 text-2xl font-medium tracking-[-0.05em] text-[var(--text-primary)]">{price}</div>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{description}</p>
                  <div className="mt-auto pt-5">
                    {isCurrentPlan ? (
                      <CurrentPlanButton />
                    ) : (
                      <Button dark>
                        {name === "Enterprise" ? "Contact sales" : "Coming soon"} <DiagonalArrowIcon />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">Cancel membership</div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-muted)]">
              Membership cancellation will be handled through Stripe once subscriptions are connected.
            </p>
          </div>
          <DangerButton>Stripe coming soon</DangerButton>
        </div>
      </Card>
    </>
  );
}
