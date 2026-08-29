"use client";

import { useEffect, useState } from "react";

type ClaimArtist = {
  id: string;
  name: string;
  slug: string;
  profile_image_url: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
};

type ClaimInvitation = {
  id: string;
  artist_id: string;
  email: string;
  ownership_transfer: boolean;
  expires_at: string;
  created_at: string;
  artist: ClaimArtist;
};

type ClaimResponse = {
  invitations?: ClaimInvitation[];
  claimed?: boolean;
  artist_id?: string;
  redirect_url?: string;
  error?: string;
};

export default function ArtistClaimPanel() {
  const [invitations, setInvitations] = useState<ClaimInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadInvitations() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/artists/claim", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as ClaimResponse;

      if (!response.ok) {
        throw new Error(body.error || "Failed to load artist invitations");
      }

      setInvitations(Array.isArray(body.invitations) ? body.invitations : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load artist invitations",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvitations();
  }, []);

  async function claimArtist(invitation: ClaimInvitation) {
    if (claimingId) return;

    try {
      setClaimingId(invitation.id);
      setError("");

      const response = await fetch("/api/artists/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitation_id: invitation.id }),
      });
      const body = (await response.json().catch(() => ({}))) as ClaimResponse;

      if (!response.ok || !body.claimed) {
        throw new Error(body.error || "Failed to claim artist profile");
      }

      window.location.assign(
        body.redirect_url ||
          `/artists/dashboard?section=overview&artist=${invitation.artist_id}`,
      );
    } catch (claimError) {
      setError(
        claimError instanceof Error
          ? claimError.message
          : "Failed to claim artist profile",
      );
      setClaimingId(null);
    }
  }

  return (
    <section className="filmwave-backend-section p-[50px]">
      <p className="m-0 max-w-[560px] text-[18px] font-[300] leading-[1.35] tracking-normal text-[var(--text-primary)]">
        Claiming connects this existing Audioflume artist profile to your account and gives you Owner access to its catalogue, profile and artist tools.
      </p>

      <div className="mt-5">
        {error ? (
          <div className="mb-5 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-[12px] text-[var(--text-primary)]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-[var(--text-muted)]">
            Loading artist invitation...
          </div>
        ) : invitations.length === 0 ? (
          <div className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-6">
            <div className="text-sm font-medium text-[var(--text-primary)]">
              No profile is waiting to be claimed.
            </div>
            <p className="mt-2 text-[12px] font-light leading-[1.5] text-[var(--text-secondary)]">
              Make sure you are signed in with the same verified email address that received the artist invitation.
            </p>
            <a
              href="/artists/dashboard"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-[7px] border border-[var(--border)] px-4 text-[12px] font-medium text-[var(--text-primary)] transition hover:border-[var(--text-muted)]"
            >
              Go to Artist Dashboard
            </a>
          </div>
        ) : (
          <div className="grid gap-3">
            {invitations.map((invitation) => {
              const claiming = claimingId === invitation.id;

              return (
                <div
                  key={invitation.id}
                  className="flex items-center gap-4 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] p-4"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[7px] bg-[var(--bg-tertiary)]">
                    {invitation.artist.profile_image_url ? (
                      <img
                        src={invitation.artist.profile_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium text-[var(--text-primary)]">
                      {invitation.artist.name}
                    </div>
                    <div className="mt-1 truncate text-[12px] font-light text-[var(--text-muted)]">
                      /artists/{invitation.artist.slug}
                    </div>
                    <div className="mt-2 truncate text-[11px] font-light text-[var(--text-secondary)]">
                      {invitation.ownership_transfer
                        ? `Ownership transfer to ${invitation.email}`
                        : `Invited as ${invitation.email}`}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(claimingId)}
                    onClick={() => void claimArtist(invitation)}
                    className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-[7px] border border-[var(--text-primary)] bg-[var(--text-primary)] px-4 text-[12px] font-medium text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {claiming
                      ? invitation.ownership_transfer
                        ? "Transferring..."
                        : "Claiming..."
                      : invitation.ownership_transfer
                        ? "Accept Transfer"
                        : "Claim Profile"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
