import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { ensureUserProfile } from "@/lib/account";
import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type TeamRole = "manager" | "editor" | "viewer";

const TEAM_ROLES = new Set<TeamRole>(["manager", "editor", "viewer"]);

function normalizeTeamRole(value: unknown): TeamRole | null {
  return TEAM_ROLES.has(value as TeamRole) ? (value as TeamRole) : null;
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, 320);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getUserDisplayName(user: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}) {
  const fullName = user.fullName?.trim();
  if (fullName) return fullName;

  const combinedName = [user.firstName, user.lastName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();

  return combinedName || user.username?.trim() || "Audioflume member";
}

async function loadArtistTeam(artistId: string, currentUserId: string, canManage: boolean) {
  const { data: memberships, error: membershipsError } = await supabaseServer
    .from("artist_memberships")
    .select("artist_id, clerk_user_id, role, created_at")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: true });

  if (membershipsError) throw membershipsError;

  const clerkUserIds = (memberships ?? [])
    .map((membership) => membership.clerk_user_id)
    .filter((userId): userId is string => typeof userId === "string");

  const [profileResult, clerkUsersResult] = await Promise.all([
    clerkUserIds.length
      ? supabaseServer
          .from("user_profiles")
          .select("clerk_user_id, display_name, avatar_url")
          .in("clerk_user_id", clerkUserIds)
      : Promise.resolve({ data: [], error: null }),
    clerkUserIds.length
      ? (async () => {
          const client = await clerkClient();
          return client.users.getUserList({
            userId: clerkUserIds.slice(0, 100),
            limit: Math.min(clerkUserIds.length, 100),
          });
        })()
      : Promise.resolve({ data: [] }),
  ]);

  if (profileResult.error) throw profileResult.error;

  const profilesById = new Map(
    (profileResult.data ?? []).map((profile) => [profile.clerk_user_id, profile]),
  );
  const clerkUsersById = new Map(
    (clerkUsersResult.data ?? []).map((user) => [user.id, user]),
  );

  const members = (memberships ?? []).map((membership) => {
    const clerkUser = clerkUsersById.get(membership.clerk_user_id);
    const profile = profilesById.get(membership.clerk_user_id);

    return {
      clerk_user_id: membership.clerk_user_id,
      role: membership.role,
      created_at: membership.created_at,
      display_name: clerkUser
        ? getUserDisplayName(clerkUser)
        : profile?.display_name || "Audioflume member",
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
      avatar_url: clerkUser?.imageUrl ?? profile?.avatar_url ?? null,
      is_current_user: membership.clerk_user_id === currentUserId,
    };
  });

  let invitations: unknown[] = [];

  if (canManage) {
    const { data, error } = await supabaseServer
      .from("artist_team_invitations")
      .select("id, email, role, status, created_at")
      .eq("artist_id", artistId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;
    invitations = data ?? [];
  }

  return { members, invitations };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireArtistPermission(id, "artist:view");

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManage = access.permissions.includes("artist:manage_members");
    const team = await loadArtistTeam(id, access.userId, canManage);

    return NextResponse.json({
      ...team,
      can_manage: canManage,
      current_role: access.role,
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load artist team:", error);
    return NextResponse.json({ error: "Failed to load team" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const access = await requireArtistPermission(id, "artist:manage_members");

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const email = normalizeEmail(body?.email);
    const role = normalizeTeamRole(body?.role);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (!role) {
      return NextResponse.json({ error: "Choose a valid team role" }, { status: 400 });
    }

    const { data: existingInvitation, error: inviteLookupError } = await supabaseServer
      .from("artist_team_invitations")
      .select("id")
      .eq("artist_id", id)
      .eq("status", "pending")
      .eq("email", email)
      .maybeSingle();

    if (inviteLookupError) throw inviteLookupError;
    if (existingInvitation) {
      return NextResponse.json(
        { error: "This email already has a pending invitation" },
        { status: 409 },
      );
    }

    const client = await clerkClient();
    const userList = await client.users.getUserList({
      emailAddress: [email],
      limit: 10,
    });
    const existingUser = userList.data.find((user) =>
      user.emailAddresses.some(
        (address) => address.emailAddress.toLowerCase() === email,
      ),
    );

    if (existingUser) {
      const { data: existingMembership, error: membershipLookupError } =
        await supabaseServer
          .from("artist_memberships")
          .select("artist_id, clerk_user_id, role")
          .eq("artist_id", id)
          .eq("clerk_user_id", existingUser.id)
          .maybeSingle();

      if (membershipLookupError) throw membershipLookupError;
      if (existingMembership) {
        return NextResponse.json(
          { error: "This person already has access to the artist" },
          { status: 409 },
        );
      }

      await ensureUserProfile(existingUser.id, existingUser);

      const { error: membershipError } = await supabaseServer
        .from("artist_memberships")
        .insert({
          artist_id: id,
          clerk_user_id: existingUser.id,
          role,
        });

      if (membershipError) throw membershipError;

      return NextResponse.json(
        {
          added: true,
          member: {
            clerk_user_id: existingUser.id,
            display_name: getUserDisplayName(existingUser),
            email: existingUser.primaryEmailAddress?.emailAddress ?? email,
            avatar_url: existingUser.imageUrl ?? null,
            role,
          },
        },
        { status: 201 },
      );
    }

    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      ignoreExisting: true,
      notify: true,
    });

    const { data: storedInvitation, error: invitationError } = await supabaseServer
      .from("artist_team_invitations")
      .insert({
        artist_id: id,
        email,
        role,
        status: "pending",
        clerk_invitation_id: invitation.id,
        invited_by_clerk_user_id: access.userId,
      })
      .select("id, email, role, status, created_at")
      .single();

    if (invitationError) {
      try {
        await client.invitations.revokeInvitation({ invitationId: invitation.id });
      } catch (revokeError) {
        console.error("Failed to revoke orphaned Clerk invitation:", revokeError);
      }
      throw invitationError;
    }

    return NextResponse.json(
      { invited: true, invitation: storedInvitation },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to add artist team member:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to add team member",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:manage_members");

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const memberUserId =
      typeof body?.member_user_id === "string" ? body.member_user_id : "";
    const role = normalizeTeamRole(body?.role);

    if (!memberUserId || !role) {
      return NextResponse.json(
        { error: "Member and role are required" },
        { status: 400 },
      );
    }

    const { data: membership, error: lookupError } = await supabaseServer
      .from("artist_memberships")
      .select("artist_id, clerk_user_id, role")
      .eq("artist_id", id)
      .eq("clerk_user_id", memberUserId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!membership) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }
    if (membership.role === "owner") {
      return NextResponse.json(
        { error: "The artist owner role cannot be changed here" },
        { status: 409 },
      );
    }

    const { data: updatedMembership, error: updateError } = await supabaseServer
      .from("artist_memberships")
      .update({ role })
      .eq("artist_id", id)
      .eq("clerk_user_id", memberUserId)
      .select("artist_id, clerk_user_id, role")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ membership: updatedMembership });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to update artist team member:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:manage_members");

    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const memberUserId =
      typeof body?.member_user_id === "string" ? body.member_user_id : "";
    const invitationId =
      typeof body?.invitation_id === "string" ? body.invitation_id : "";

    if (invitationId) {
      const { data: invitation, error: inviteLookupError } = await supabaseServer
        .from("artist_team_invitations")
        .select("id, status, clerk_invitation_id")
        .eq("id", invitationId)
        .eq("artist_id", id)
        .maybeSingle();

      if (inviteLookupError) throw inviteLookupError;
      if (!invitation || invitation.status !== "pending") {
        return NextResponse.json(
          { error: "Pending invitation not found" },
          { status: 404 },
        );
      }

      if (invitation.clerk_invitation_id) {
        const client = await clerkClient();
        try {
          await client.invitations.revokeInvitation({
            invitationId: invitation.clerk_invitation_id,
          });
        } catch (revokeError) {
          console.error("Failed to revoke Clerk invitation:", revokeError);
        }
      }

      const { error: updateError } = await supabaseServer
        .from("artist_team_invitations")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
        })
        .eq("id", invitationId)
        .eq("artist_id", id)
        .eq("status", "pending");

      if (updateError) throw updateError;
      return NextResponse.json({ revoked: true });
    }

    if (!memberUserId) {
      return NextResponse.json(
        { error: "Member or invitation is required" },
        { status: 400 },
      );
    }

    const { data: membership, error: lookupError } = await supabaseServer
      .from("artist_memberships")
      .select("artist_id, clerk_user_id, role")
      .eq("artist_id", id)
      .eq("clerk_user_id", memberUserId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!membership) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }
    if (membership.role === "owner") {
      return NextResponse.json(
        { error: "The artist owner cannot be removed" },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabaseServer
      .from("artist_memberships")
      .delete()
      .eq("artist_id", id)
      .eq("clerk_user_id", memberUserId);

    if (deleteError) throw deleteError;
    return NextResponse.json({ removed: true });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to remove artist team access:", error);
    return NextResponse.json(
      { error: "Failed to remove team access" },
      { status: 500 },
    );
  }
}
