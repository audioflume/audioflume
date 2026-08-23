"use client";

import { FormEvent, useEffect, useState } from "react";

import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type TeamRole = "owner" | "manager" | "editor" | "viewer";
type EditableTeamRole = Exclude<TeamRole, "owner">;

type TeamMember = {
  clerk_user_id: string;
  role: TeamRole;
  created_at: string | null;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  is_current_user: boolean;
};

type TeamInvitation = {
  id: string;
  email: string;
  role: EditableTeamRole;
  status: "pending";
  created_at: string;
};

type TeamResponse = {
  members?: TeamMember[];
  invitations?: TeamInvitation[];
  can_manage?: boolean;
  current_role?: TeamRole;
  error?: string;
};

const ROLE_OPTIONS: { value: EditableTeamRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

function formatRole(role: TeamRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatJoinedAt(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ArtistTeamManager({
  artist,
}: {
  artist: ArtistDashboardProfile;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [canManage, setCanManage] = useState(
    artist.permissions.includes("artist:manage_members"),
  );
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EditableTeamRole>("manager");
  const [submitting, setSubmitting] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadTeam() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/artists/${artist.id}/team`, {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | TeamResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Failed to load artist team");
      }

      setMembers(Array.isArray(body?.members) ? body.members : []);
      setInvitations(
        Array.isArray(body?.invitations) ? body.invitations : [],
      );
      setCanManage(Boolean(body?.can_manage));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load artist team",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeam();
  }, [artist.id]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || submitting) return;

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/artists/${artist.id}/team`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = (await response.json().catch(() => null)) as
        | { added?: boolean; invited?: boolean; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Failed to add team member");
      }

      setEmail("");
      setMessage(
        body?.added
          ? "Team member added."
          : "Invitation sent. Access will be added after they create their Audioflume account.",
      );
      await loadTeam();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Failed to add team member",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateRole(memberUserId: string, nextRole: EditableTeamRole) {
    if (!canManage || busyKey) return;

    setBusyKey(`member:${memberUserId}`);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/artists/${artist.id}/team`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_user_id: memberUserId,
          role: nextRole,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Failed to update team member");
      }

      setMembers((current) =>
        current.map((member) =>
          member.clerk_user_id === memberUserId
            ? { ...member, role: nextRole }
            : member,
        ),
      );
      setMessage("Team access updated.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update team member",
      );
    } finally {
      setBusyKey("");
    }
  }

  async function removeMember(memberUserId: string) {
    if (!canManage || busyKey) return;

    setBusyKey(`member:${memberUserId}`);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/artists/${artist.id}/team`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_user_id: memberUserId }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Failed to remove team member");
      }

      setMembers((current) =>
        current.filter((member) => member.clerk_user_id !== memberUserId),
      );
      setMessage("Team member removed.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove team member",
      );
    } finally {
      setBusyKey("");
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!canManage || busyKey) return;

    setBusyKey(`invite:${invitationId}`);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/artists/${artist.id}/team`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitation_id: invitationId }),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(body?.error || "Failed to revoke invitation");
      }

      setInvitations((current) =>
        current.filter((invitation) => invitation.id !== invitationId),
      );
      setMessage("Invitation revoked.");
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Failed to revoke invitation",
      );
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="grid gap-4">
      {canManage ? (
        <section className="filmwave-backend-section">
          <div className="filmwave-backend-section-header">
            <h2 className="filmwave-backend-section-title">Add team member</h2>
          </div>

          <form
            onSubmit={handleInvite}
            className="grid gap-3 px-5 pb-5 md:grid-cols-[minmax(0,1fr)_170px_auto] md:items-end"
          >
            <label className="block">
              <span className="mb-2 block text-[11px] text-[var(--text-secondary)] font-[320]">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                className="filmwave-backend-input w-full"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] text-[var(--text-secondary)] font-[320]">
                Access
              </span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as EditableTeamRole)}
                className="filmwave-backend-select w-full"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="filmwave-backend-button filmwave-backend-button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add member"}
            </button>
          </form>
        </section>
      ) : null}

      {message ? (
        <div className="filmwave-backend-section px-4 py-3 text-xs text-[var(--text-primary)] font-[320]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="filmwave-backend-section px-4 py-3 text-xs text-[var(--text-primary)] font-[320]">
          {error}
        </div>
      ) : null}

      <section className="filmwave-backend-section overflow-hidden">
        <div className="filmwave-backend-section-header">
          <h2 className="filmwave-backend-section-title">Team</h2>
          {!loading ? (
            <span className="text-[10px] text-[var(--text-muted)] font-[320]">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="flex min-h-[144px] items-center justify-center px-5 text-center text-xs text-[var(--text-muted)] font-[320]">
            Loading team...
          </div>
        ) : members.length === 0 ? (
          <div className="flex min-h-[144px] items-center justify-center px-5 text-center text-xs text-[var(--text-muted)] font-[320]">
            No team members found.
          </div>
        ) : (
          <div>
            {members.map((member, index) => {
              const memberBusy = busyKey === `member:${member.clerk_user_id}`;
              const isOwner = member.role === "owner";

              return (
                <div
                  key={member.clerk_user_id}
                  className={`flex min-h-[72px] flex-wrap items-center gap-4 px-5 py-3 ${
                    index < members.length - 1
                      ? "border-b border-[var(--border)]"
                      : ""
                  }`}
                >
                  <div
                    className="h-10 w-10 shrink-0 overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--bg-tertiary)] bg-cover bg-center"
                    style={
                      member.avatar_url
                        ? { backgroundImage: `url(${member.avatar_url})` }
                        : undefined
                    }
                  />

                  <div className="min-w-[180px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[var(--text-primary)] font-[320]">
                        {member.display_name}
                      </span>
                      {member.is_current_user ? (
                        <span className="text-[9px] text-[var(--text-muted)] font-[320]">
                          You
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)] font-[320]">
                      {member.email || "Email unavailable"}
                    </div>
                    {member.created_at ? (
                      <div className="mt-1 text-[9px] text-[var(--text-muted)] font-[320]">
                        Added {formatJoinedAt(member.created_at)}
                      </div>
                    ) : null}
                  </div>

                  {canManage && !isOwner ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        value={member.role}
                        disabled={memberBusy || Boolean(busyKey)}
                        onChange={(event) =>
                          void updateRole(
                            member.clerk_user_id,
                            event.target.value as EditableTeamRole,
                          )
                        }
                        className="filmwave-backend-select h-9 w-[132px]"
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={memberBusy || Boolean(busyKey)}
                        onClick={() => void removeMember(member.clerk_user_id)}
                        className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {memberBusy ? "Working..." : "Remove"}
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-[11px] text-[var(--text-secondary)] font-[320]">
                      {formatRole(member.role)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {canManage && invitations.length > 0 ? (
        <section className="filmwave-backend-section overflow-hidden">
          <div className="filmwave-backend-section-header">
            <h2 className="filmwave-backend-section-title">Pending invitations</h2>
          </div>

          <div>
            {invitations.map((invitation, index) => {
              const invitationBusy = busyKey === `invite:${invitation.id}`;

              return (
                <div
                  key={invitation.id}
                  className={`flex min-h-[62px] flex-wrap items-center gap-4 px-5 py-3 ${
                    index < invitations.length - 1
                      ? "border-b border-[var(--border)]"
                      : ""
                  }`}
                >
                  <div className="min-w-[180px] flex-1">
                    <div className="text-xs text-[var(--text-primary)] font-[320]">
                      {invitation.email}
                    </div>
                    <div className="mt-1 text-[9px] text-[var(--text-muted)] font-[320]">
                      Pending · {formatRole(invitation.role)} · {formatJoinedAt(invitation.created_at)}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={invitationBusy || Boolean(busyKey)}
                    onClick={() => void revokeInvitation(invitation.id)}
                    className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {invitationBusy ? "Revoking..." : "Revoke"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}