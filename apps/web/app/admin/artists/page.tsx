"use client";

import { useEffect, useMemo, useState } from "react";

import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import Toast from "@/components/Toast";

type ArtistStatus = "pending" | "approved" | "rejected" | "suspended";
type ArtistStatusFilter = "all" | ArtistStatus;
type ClaimInvitationStatus = "pending" | "claimed" | "revoked" | "expired";

type ArtistOwner = {
  clerk_user_id: string;
  display_name: string | null;
  company_name: string | null;
};

type ArtistClaimInvitation = {
  id: string;
  artist_id: string;
  email: string;
  status: ClaimInvitationStatus;
  expires_at: string;
  claimed_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type AdminArtist = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  instagram_url: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  status: ArtistStatus;
  created_by_clerk_user_id: string | null;
  approved_at: string | null;
  approved_by_clerk_user_id: string | null;
  created_at: string;
  updated_at: string;
  owner: ArtistOwner | null;
  claim_invitation: ArtistClaimInvitation | null;
};

type ArtistsResponse = {
  artists?: AdminArtist[];
  artist?: AdminArtist;
  invitation?: ArtistClaimInvitation;
  revoked?: boolean;
  error?: string;
};

const FILTERS: { value: ArtistStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatStatus(status: ArtistStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "suspended") return "Suspended";
  return "Pending review";
}

function statusStyle(status: ArtistStatus) {
  if (status === "approved") {
    return {
      color: "var(--status-success, #48b571)",
      background: "var(--status-success-soft, rgba(72, 181, 113, 0.12))",
    };
  }

  if (status === "pending") {
    return {
      color: "var(--status-warning, #d9a441)",
      background: "var(--status-warning-soft, rgba(217, 164, 65, 0.12))",
    };
  }

  if (status === "rejected") {
    return {
      color: "var(--status-error, #dc584f)",
      background: "var(--status-error-soft, rgba(220, 88, 79, 0.12))",
    };
  }

  return {
    color: "var(--text-secondary)",
    background: "var(--bg-tertiary)",
  };
}

function StatusBadge({ status }: { status: ArtistStatus }) {
  return (
    <span
      className="inline-flex h-6 items-center rounded-full px-2.5 text-[10px] uppercase tracking-[0.05em] font-[320]"
      style={statusStyle(status)}
    >
      {formatStatus(status)}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary = false,
}: {
  children: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 cursor-pointer items-center justify-center rounded-[7px] border px-3 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
        primary
          ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-80"
          : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<AdminArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArtistStatusFilter>("all");
  const [updatingArtistId, setUpdatingArtistId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [showCreateArtist, setShowCreateArtist] = useState(false);
  const [newArtistName, setNewArtistName] = useState("");
  const [newArtistSlug, setNewArtistSlug] = useState("");
  const [newArtistEmail, setNewArtistEmail] = useState("");
  const [creatingArtist, setCreatingArtist] = useState(false);

  async function loadArtists() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/artists", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as ArtistsResponse;

      if (!response.ok) {
        throw new Error(body.error || "Failed to load artists");
      }

      setArtists(Array.isArray(body.artists) ? body.artists : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load artists",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadArtists();
  }, []);

  const counts = useMemo(() => {
    return {
      all: artists.length,
      pending: artists.filter((artist) => artist.status === "pending").length,
      approved: artists.filter((artist) => artist.status === "approved").length,
      rejected: artists.filter((artist) => artist.status === "rejected").length,
      suspended: artists.filter((artist) => artist.status === "suspended").length,
    };
  }, [artists]);

  const visibleArtists = useMemo(() => {
    const query = search.trim().toLowerCase();

    return artists.filter((artist) => {
      if (statusFilter !== "all" && artist.status !== statusFilter) return false;
      if (!query) return true;

      const ownerName = artist.owner?.display_name ?? "";
      const ownerCompany = artist.owner?.company_name ?? "";
      const claimEmail = artist.claim_invitation?.email ?? "";
      const searchable = [
        artist.name,
        artist.slug,
        artist.location ?? "",
        ownerName,
        ownerCompany,
        claimEmail,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [artists, search, statusFilter]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 1800);
  }

  async function createAndInviteArtist() {
    if (creatingArtist) return;

    try {
      setCreatingArtist(true);

      const response = await fetch("/api/admin/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newArtistName,
          slug: newArtistSlug,
          email: newArtistEmail,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ArtistsResponse;

      if (!response.ok || !body.artist) {
        throw new Error(body.error || "Failed to create artist invitation");
      }

      setArtists((current) => [body.artist!, ...current]);
      setNewArtistName("");
      setNewArtistSlug("");
      setNewArtistEmail("");
      setShowCreateArtist(false);
      showToast(`${body.artist.name}: invitation sent`);
    } catch (createError) {
      showToast(
        createError instanceof Error
          ? createError.message
          : "Failed to create artist invitation",
      );
    } finally {
      setCreatingArtist(false);
    }
  }

  async function inviteArtistOwner(artist: AdminArtist) {
    if (updatingArtistId) return;

    const email = window.prompt(
      `Email address to invite as the owner of ${artist.name}:`,
      artist.claim_invitation?.email ?? "",
    );
    if (!email?.trim()) return;

    try {
      setUpdatingArtistId(artist.id);

      const response = await fetch(
        `/api/admin/artists/${artist.id}/claim-invitation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as ArtistsResponse;

      if (!response.ok || !body.invitation) {
        throw new Error(body.error || "Failed to invite artist owner");
      }

      setArtists((current) =>
        current.map((item) =>
          item.id === artist.id
            ? { ...item, claim_invitation: body.invitation! }
            : item,
        ),
      );
      showToast(`${artist.name}: invitation sent`);
    } catch (inviteError) {
      showToast(
        inviteError instanceof Error
          ? inviteError.message
          : "Failed to invite artist owner",
      );
    } finally {
      setUpdatingArtistId(null);
    }
  }

  async function revokeArtistInvite(artist: AdminArtist) {
    if (updatingArtistId || artist.claim_invitation?.status !== "pending") return;

    const confirmed = window.confirm(
      `Revoke the owner invitation for ${artist.name}?`,
    );
    if (!confirmed) return;

    try {
      setUpdatingArtistId(artist.id);

      const response = await fetch(
        `/api/admin/artists/${artist.id}/claim-invitation`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invitation_id: artist.claim_invitation.id,
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as ArtistsResponse;

      if (!response.ok || !body.revoked) {
        throw new Error(body.error || "Failed to revoke artist invitation");
      }

      setArtists((current) =>
        current.map((item) =>
          item.id === artist.id && item.claim_invitation
            ? {
                ...item,
                claim_invitation: {
                  ...item.claim_invitation,
                  status: "revoked",
                  revoked_at: new Date().toISOString(),
                },
              }
            : item,
        ),
      );
      showToast(`${artist.name}: invitation revoked`);
    } catch (revokeError) {
      showToast(
        revokeError instanceof Error
          ? revokeError.message
          : "Failed to revoke artist invitation",
      );
    } finally {
      setUpdatingArtistId(null);
    }
  }

  async function updateArtistStatus(artist: AdminArtist, status: ArtistStatus) {
    if (updatingArtistId) return;

    const actionLabel =
      status === "approved"
        ? artist.status === "suspended"
          ? "restore"
          : "approve"
        : status === "rejected"
          ? "reject"
          : status === "suspended"
            ? "suspend"
            : "move back to pending";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} ${artist.name}?`,
    );
    if (!confirmed) return;

    try {
      setUpdatingArtistId(artist.id);

      const response = await fetch(`/api/admin/artists/${artist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = (await response.json().catch(() => ({}))) as ArtistsResponse;

      if (!response.ok || !body.artist) {
        throw new Error(body.error || "Failed to update artist status");
      }

      setArtists((current) =>
        current.map((item) =>
          item.id === artist.id
            ? {
                ...item,
                ...body.artist,
                owner: item.owner,
                claim_invitation: item.claim_invitation,
              }
            : item,
        ),
      );
      showToast(`${artist.name}: ${formatStatus(status)}`);
    } catch (updateError) {
      showToast(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update artist status",
      );
    } finally {
      setUpdatingArtistId(null);
    }
  }

  return (
    <AdminContentPage
      section="Database"
      label="Artists"
      title="Artists"
      description="Review artist applications and manage artist access status."
      compactHeader
      hideIntro
      contentAreaClassName="bg-[var(--filmwave-neutral-surface)]"
    >
      {showCreateArtist ? (
        <section className="mb-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <label className="grid gap-2 text-[11px] text-[var(--text-secondary)] font-[320]">
              <span>Name (Required)</span>
              <input
                type="text"
                value={newArtistName}
                maxLength={160}
                onChange={(event) => setNewArtistName(event.target.value)}
                className="h-10 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-[13px] font-normal text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
              />
            </label>

            <label className="grid gap-2 text-[11px] text-[var(--text-secondary)] font-[320]">
              <span>Artist URL (Required)</span>
              <input
                type="text"
                value={newArtistSlug}
                maxLength={80}
                placeholder="artist-name"
                onChange={(event) => setNewArtistSlug(event.target.value)}
                className="h-10 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-[13px] font-normal text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
              />
            </label>

            <label className="grid gap-2 text-[11px] text-[var(--text-secondary)] font-[320]">
              <span>Owner Email (Required)</span>
              <input
                type="email"
                value={newArtistEmail}
                onChange={(event) => setNewArtistEmail(event.target.value)}
                className="h-10 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-[13px] font-normal text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)]"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  creatingArtist ||
                  !newArtistName.trim() ||
                  !newArtistSlug.trim() ||
                  !newArtistEmail.trim()
                }
                onClick={() => void createAndInviteArtist()}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-[7px] border border-[var(--text-primary)] bg-[var(--text-primary)] px-4 text-[11px] font-medium text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {creatingArtist ? "Creating..." : "Create & Invite"}
              </button>
              <button
                type="button"
                disabled={creatingArtist}
                onClick={() => setShowCreateArtist(false)}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <AdminSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search artists"
          className="w-full max-w-[500px]"
        />

        <div className="flex shrink-0 flex-nowrap gap-2">
          <button
            type="button"
            onClick={() => setShowCreateArtist((current) => !current)}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-[7px] border border-[var(--text-primary)] bg-[var(--text-primary)] px-4 text-[11px] font-medium text-[var(--bg-primary)] transition hover:opacity-80"
          >
            Create & Invite
          </button>

          {FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-[7px] border px-3 text-[11px] font-medium transition ${
                  active
                    ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                    : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span>{filter.label}</span>
                <span className={active ? "opacity-70" : "text-[var(--text-muted)]"}>
                  {counts[filter.value]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="overflow-x-auto rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="grid min-w-[1140px] grid-cols-[minmax(190px,1.35fr)_minmax(190px,1fr)_minmax(130px,0.8fr)_120px_130px_270px] gap-4 border-b border-[var(--border)] bg-[var(--bg-primary)] px-5 py-3 text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)] font-[320]">
          <span>Artist</span>
          <span>Owner</span>
          <span>Location</span>
          <span>Submitted</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="flex min-h-[180px] min-w-[1140px] items-center justify-center text-xs text-[var(--text-muted)] font-[320]">
            Loading artists...
          </div>
        ) : error ? (
          <div className="flex min-h-[180px] min-w-[1140px] flex-col items-center justify-center gap-3 px-5 text-center text-xs text-[var(--text-secondary)] font-[320]">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadArtists()}
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[11px] font-medium text-[var(--text-primary)]"
            >
              Try again
            </button>
          </div>
        ) : visibleArtists.length === 0 ? (
          <div className="flex min-h-[180px] min-w-[1140px] items-center justify-center px-5 text-xs text-[var(--text-muted)] font-[320]">
            No artists match this view.
          </div>
        ) : (
          <div className="min-w-[1140px]">
            {visibleArtists.map((artist) => {
              const updating = updatingArtistId === artist.id;
              const pendingClaim =
                !artist.owner && artist.claim_invitation?.status === "pending"
                  ? artist.claim_invitation
                  : null;
              const ownerLabel = artist.owner
                ? artist.owner.display_name || artist.owner.company_name || "Owner"
                : pendingClaim
                  ? "Invitation pending"
                  : "Unclaimed";

              return (
                <div
                  key={artist.id}
                  className="grid grid-cols-[minmax(190px,1.35fr)_minmax(190px,1fr)_minmax(130px,0.8fr)_120px_130px_270px] items-center gap-4 border-b border-[var(--border)] px-5 py-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-[var(--text-primary)] font-[320]">
                      {artist.name}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)] font-[320]">
                      <span>/{artist.slug}</span>
                      {artist.website_url ? (
                        <a
                          href={artist.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="transition hover:text-[var(--text-primary)]"
                        >
                          Website
                        </a>
                      ) : null}
                      {artist.instagram_url ? (
                        <a
                          href={artist.instagram_url}
                          target="_blank"
                          rel="noreferrer"
                          className="transition hover:text-[var(--text-primary)]"
                        >
                          Instagram
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-xs text-[var(--text-primary)] font-[320]">
                      {ownerLabel}
                    </div>
                    {artist.owner?.company_name &&
                    artist.owner.company_name !== ownerLabel ? (
                      <div className="mt-1 truncate text-[11px] text-[var(--text-muted)] font-[320]">
                        {artist.owner.company_name}
                      </div>
                    ) : pendingClaim ? (
                      <div className="mt-1 truncate text-[11px] text-[var(--text-muted)] font-[320]">
                        {pendingClaim.email}
                      </div>
                    ) : null}
                  </div>

                  <div className="truncate text-xs text-[var(--text-secondary)] font-[320]">
                    {artist.location || "—"}
                  </div>

                  <div className="text-xs text-[var(--text-secondary)] font-[320]">
                    {formatDate(artist.created_at)}
                  </div>

                  <div>
                    <StatusBadge status={artist.status} />
                  </div>

                  <div className="flex flex-nowrap justify-end gap-2">
                    {!artist.owner ? (
                      pendingClaim ? (
                        <ActionButton
                          disabled={Boolean(updatingArtistId)}
                          onClick={() => void revokeArtistInvite(artist)}
                        >
                          {updating ? "Saving..." : "Revoke Invite"}
                        </ActionButton>
                      ) : (
                        <ActionButton
                          disabled={Boolean(updatingArtistId)}
                          onClick={() => void inviteArtistOwner(artist)}
                        >
                          {updating ? "Saving..." : "Invite Owner"}
                        </ActionButton>
                      )
                    ) : null}

                    {artist.status === "pending" ? (
                      <>
                        <ActionButton
                          primary
                          disabled={Boolean(updatingArtistId)}
                          onClick={() => void updateArtistStatus(artist, "approved")}
                        >
                          {updating ? "Saving..." : "Approve"}
                        </ActionButton>
                        <ActionButton
                          disabled={Boolean(updatingArtistId)}
                          onClick={() => void updateArtistStatus(artist, "rejected")}
                        >
                          Reject
                        </ActionButton>
                      </>
                    ) : null}

                    {artist.status === "approved" ? (
                      <ActionButton
                        disabled={Boolean(updatingArtistId)}
                        onClick={() => void updateArtistStatus(artist, "suspended")}
                      >
                        {updating ? "Saving..." : "Suspend"}
                      </ActionButton>
                    ) : null}

                    {artist.status === "rejected" ? (
                      <ActionButton
                        primary
                        disabled={Boolean(updatingArtistId)}
                        onClick={() => void updateArtistStatus(artist, "approved")}
                      >
                        {updating ? "Saving..." : "Approve"}
                      </ActionButton>
                    ) : null}

                    {artist.status === "suspended" ? (
                      <ActionButton
                        primary
                        disabled={Boolean(updatingArtistId)}
                        onClick={() => void updateArtistStatus(artist, "approved")}
                      >
                        {updating ? "Saving..." : "Restore"}
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Toast message={toastMessage} />
    </AdminContentPage>
  );
}
