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

export default function MembershipSection() {
  const { membership, display, usage, loadState } = useMembershipData();

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
          <div className="border-b border-[var(--border)] p-4">
            <div className="text-xs font-medium text-[var(--text-muted)]">Current plan</div>
            <div className="mt-2 text-2xl font-medium tracking-[-0.02em] text-[var(--text-primary)]">
              {display?.plan_label || "Loading membership..."}
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              {membership?.license_label || "Your Filmwave membership controls library access, playlist tools, and commercial licensing."}
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <Info label="Renewal" value={display?.renewal_label || "Loading"} />
            <Info label="Downloads" value={display?.downloads_label || "Loading"} />
            <Info label="License" value={membership?.license_label || "Loading"} />
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
