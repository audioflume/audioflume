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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3">
      <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-medium leading-5 text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

export default function MembershipSection() {
  const { membership, display, usage, loadState } = useMembershipData();

  const licenseLabel = membership?.license_label || "Royalty-free commercial use";

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
          <div className="p-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-[var(--text-muted)]">Current plan</div>
                  <div className="mt-1 text-2xl font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                    {display?.plan_label || "Loading membership..."}
                  </div>
                </div>
                <div className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  {display?.status_label || "Active"}
                </div>
              </div>

              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <div className="text-xs font-medium text-[var(--text-muted)]">License</div>
                <div className="mt-1 text-sm font-medium leading-5 text-[var(--text-primary)]">
                  {licenseLabel}
                </div>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--text-muted)]">
                  Covers eligible Filmwave downloads for client, commercial, and creator projects under your active account license.
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <PlanDetail label="Renewal" value={display?.renewal_label || "Loading"} />
              <PlanDetail label="Downloads" value={display?.downloads_label || "Loading"} />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle title="Usage snapshot" description="Live account signals from your Filmwave workspace." />
          <div className="grid gap-3 p-4">
            <Info label="Songs downloaded" value={formatCount(usage?.downloads ?? 0, "download")} />
            <Info label="Projects created" value={formatCount(usage?.projects ?? 0, "project")} />
            <Info label="Favorite tracks" value={formatCount(usage?.favorites ?? 0, "saved track")} />
            <Info label="Playlists" value={formatCount(usage?.playlists ?? 0, "playlist")} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {plans.map(([name, price, description], index) => (
          <Card key={name} className="group">
            <VisualPanel image={membershipPlanImages[index]} />
            <div className="p-4">
              <div className="flex min-h-[190px] flex-col">
                <div className="text-sm font-medium text-[var(--text-primary)]">{name}</div>
                <div className="mt-2 text-2xl font-medium tracking-[-0.05em] text-[var(--text-primary)]">{price}</div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{description}</p>
                <div className="mt-auto pt-5">
                  <Button dark>
                    {name === "Enterprise" ? "Contact sales" : "Coming soon"} <DiagonalArrowIcon />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
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
