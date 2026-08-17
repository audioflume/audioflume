import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

export const ARTIST_MEMBERSHIP_ROLES = [
  "owner",
  "manager",
  "editor",
  "viewer",
] as const;

export type ArtistMembershipRole = (typeof ARTIST_MEMBERSHIP_ROLES)[number];
export type ArtistEffectiveRole = ArtistMembershipRole | "admin";

export const ARTIST_PERMISSIONS = [
  "artist:view",
  "artist:edit_profile",
  "artist:manage_members",
  "catalog:view",
  "catalog:upload",
  "catalog:edit",
  "catalog:submit",
  "release:manage",
  "playlist:manage",
  "rights:view",
  "rights:edit",
  "analytics:view",
] as const;

export type ArtistPermission = (typeof ARTIST_PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<
  ArtistMembershipRole,
  readonly ArtistPermission[]
> = {
  owner: ARTIST_PERMISSIONS,
  manager: [
    "artist:view",
    "artist:edit_profile",
    "catalog:view",
    "catalog:upload",
    "catalog:edit",
    "catalog:submit",
    "release:manage",
    "playlist:manage",
    "rights:view",
    "rights:edit",
    "analytics:view",
  ],
  editor: [
    "artist:view",
    "catalog:view",
    "catalog:upload",
    "catalog:edit",
    "catalog:submit",
    "release:manage",
    "playlist:manage",
    "rights:view",
    "analytics:view",
  ],
  viewer: [
    "artist:view",
    "catalog:view",
    "rights:view",
    "analytics:view",
  ],
};

export type ArtistMembership = {
  artist_id: string;
  clerk_user_id: string;
  role: ArtistMembershipRole;
  created_at?: string;
  updated_at?: string;
};

export type ArtistAccess = {
  userId: string | null;
  isAdmin: boolean;
  role: ArtistEffectiveRole | null;
  permissions: ArtistPermission[];
  membership: ArtistMembership | null;
};

export class ArtistAccessError extends Error {
  status: 401 | 403;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "ArtistAccessError";
    this.status = status;
  }
}

function normalizeArtistMembershipRole(value: unknown): ArtistMembershipRole | null {
  return ARTIST_MEMBERSHIP_ROLES.includes(value as ArtistMembershipRole)
    ? (value as ArtistMembershipRole)
    : null;
}

function normalizeArtistMembership(value: unknown): ArtistMembership | null {
  if (!value || typeof value !== "object") return null;

  const membership = value as Record<string, unknown>;
  const role = normalizeArtistMembershipRole(membership.role);

  if (
    typeof membership.artist_id !== "string" ||
    typeof membership.clerk_user_id !== "string" ||
    !role
  ) {
    return null;
  }

  return {
    artist_id: membership.artist_id,
    clerk_user_id: membership.clerk_user_id,
    role,
    created_at:
      typeof membership.created_at === "string" ? membership.created_at : undefined,
    updated_at:
      typeof membership.updated_at === "string" ? membership.updated_at : undefined,
  };
}

export function getArtistPermissions(
  role: ArtistEffectiveRole,
): ArtistPermission[] {
  if (role === "admin") return [...ARTIST_PERMISSIONS];
  return [...ROLE_PERMISSIONS[role]];
}

export function artistRoleHasPermission(
  role: ArtistEffectiveRole,
  permission: ArtistPermission,
) {
  return getArtistPermissions(role).includes(permission);
}

export async function getArtistMembershipForUser(
  artistId: string,
  clerkUserId: string,
) {
  const { data, error } = await supabaseServer
    .from("artist_memberships")
    .select("artist_id, clerk_user_id, role, created_at, updated_at")
    .eq("artist_id", artistId)
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) throw error;
  return normalizeArtistMembership(data);
}

export async function getArtistMembershipsForUser(clerkUserId: string) {
  const { data, error } = await supabaseServer
    .from("artist_memberships")
    .select("artist_id, clerk_user_id, role, created_at, updated_at")
    .eq("clerk_user_id", clerkUserId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (Array.isArray(data) ? data : [])
    .map(normalizeArtistMembership)
    .filter((membership): membership is ArtistMembership => Boolean(membership));
}

export async function getCurrentArtistAccess(
  artistId: string,
): Promise<ArtistAccess> {
  const { isAdmin, user } = await requireAdmin();

  if (!user?.id) {
    return {
      userId: null,
      isAdmin: false,
      role: null,
      permissions: [],
      membership: null,
    };
  }

  if (isAdmin) {
    return {
      userId: user.id,
      isAdmin: true,
      role: "admin",
      permissions: [...ARTIST_PERMISSIONS],
      membership: null,
    };
  }

  const membership = await getArtistMembershipForUser(artistId, user.id);

  return {
    userId: user.id,
    isAdmin: false,
    role: membership?.role ?? null,
    permissions: membership ? getArtistPermissions(membership.role) : [],
    membership,
  };
}

export async function requireArtistPermission(
  artistId: string,
  permission: ArtistPermission,
) {
  const access = await getCurrentArtistAccess(artistId);

  if (!access.userId) {
    throw new ArtistAccessError("Unauthorized", 401);
  }

  if (!access.permissions.includes(permission)) {
    throw new ArtistAccessError("Forbidden", 403);
  }

  return access;
}
