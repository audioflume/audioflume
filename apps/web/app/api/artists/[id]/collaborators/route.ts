import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type ResourceType = "song" | "release";
type CollaboratorRole = "featured" | "collaborator";

type CollaboratorInput = {
  artist_id: string;
  role: CollaboratorRole;
};

function normalizeResourceType(value: string | null): ResourceType | null {
  return value === "song" || value === "release" ? value : null;
}

function normalizeCollaborators(value: unknown): CollaboratorInput[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;

  const collaborators: CollaboratorInput[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const artistId =
      typeof record.artist_id === "string" ? record.artist_id.trim() : "";
    const role = record.role;

    if (
      !artistId ||
      seen.has(artistId) ||
      (role !== "featured" && role !== "collaborator")
    ) {
      return null;
    }

    seen.add(artistId);
    collaborators.push({ artist_id: artistId, role });
  }

  return collaborators;
}

function resourceConfig(resourceType: ResourceType) {
  if (resourceType === "song") {
    return {
      table: "song_artists" as const,
      resourceColumn: "song_id" as const,
      permission: "catalog:edit" as const,
    };
  }

  return {
    table: "artist_release_artists" as const,
    resourceColumn: "release_id" as const,
    permission: "release:manage" as const,
  };
}

async function requirePrimaryResource(
  artistId: string,
  resourceType: ResourceType,
  resourceId: string,
) {
  const config = resourceConfig(resourceType);
  const { data, error } = await supabaseServer
    .from(config.table)
    .select(config.resourceColumn)
    .eq(config.resourceColumn, resourceId)
    .eq("artist_id", artistId)
    .eq("role", "primary")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function loadCollaboratorData(
  primaryArtistId: string,
  resourceType: ResourceType,
  resourceId: string,
) {
  const config = resourceConfig(resourceType);
  const [linksResult, artistsResult, primaryArtistResult] = await Promise.all([
    supabaseServer
      .from(config.table)
      .select("artist_id, role, position")
      .eq(config.resourceColumn, resourceId)
      .neq("role", "primary")
      .order("position", { ascending: true }),
    supabaseServer
      .from("artists")
      .select("id, name, slug, profile_image_url")
      .eq("status", "approved")
      .neq("id", primaryArtistId)
      .order("name", { ascending: true }),
    supabaseServer
      .from("artists")
      .select("id, name, slug, profile_image_url")
      .eq("id", primaryArtistId)
      .maybeSingle(),
  ]);

  if (linksResult.error) throw linksResult.error;
  if (artistsResult.error) throw artistsResult.error;
  if (primaryArtistResult.error) throw primaryArtistResult.error;

  const artistMap = new Map(
    (artistsResult.data ?? []).map((artist) => [artist.id, artist]),
  );

  return {
    primary_artist: primaryArtistResult.data ?? null,
    options: artistsResult.data ?? [],
    collaborators: (linksResult.data ?? [])
      .map((link) => {
        const linkedArtist = artistMap.get(link.artist_id);
        if (!linkedArtist) return null;
        return {
          artist_id: link.artist_id,
          role: link.role,
          position: link.position,
          artist: linkedArtist,
        };
      })
      .filter(Boolean),
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "artist:view");

    const url = new URL(request.url);
    const resourceType = normalizeResourceType(url.searchParams.get("resource"));
    const resourceId = url.searchParams.get("resource_id")?.trim() ?? "";

    if (!resourceType || !resourceId) {
      return NextResponse.json(
        { error: "A valid resource and resource_id are required" },
        { status: 400 },
      );
    }

    if (!(await requirePrimaryResource(id, resourceType, resourceId))) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    return NextResponse.json(
      await loadCollaboratorData(id, resourceType, resourceId),
    );
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load artist collaborators:", error);
    return NextResponse.json(
      { error: "Failed to load collaborators" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const resourceType =
      typeof body.resource === "string"
        ? normalizeResourceType(body.resource)
        : null;
    const resourceId =
      typeof body.resource_id === "string" ? body.resource_id.trim() : "";
    const collaborators = normalizeCollaborators(body.collaborators);

    if (!resourceType || !resourceId || !collaborators) {
      return NextResponse.json(
        { error: "Invalid collaborator request" },
        { status: 400 },
      );
    }

    const config = resourceConfig(resourceType);
    await requireArtistPermission(id, config.permission);

    if (!(await requirePrimaryResource(id, resourceType, resourceId))) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    if (collaborators.some((collaborator) => collaborator.artist_id === id)) {
      return NextResponse.json(
        { error: "The primary artist cannot also be added as a collaborator" },
        { status: 400 },
      );
    }

    if (collaborators.length > 0) {
      const collaboratorIds = collaborators.map((item) => item.artist_id);
      const { data: approvedArtists, error: approvedArtistsError } =
        await supabaseServer
          .from("artists")
          .select("id")
          .in("id", collaboratorIds)
          .eq("status", "approved");

      if (approvedArtistsError) throw approvedArtistsError;

      const approvedIds = new Set(
        (approvedArtists ?? []).map((artist) => artist.id),
      );
      if (collaboratorIds.some((artistId) => !approvedIds.has(artistId))) {
        return NextResponse.json(
          { error: "Only approved artist profiles can be added" },
          { status: 400 },
        );
      }
    }

    const { error: deleteError } = await supabaseServer
      .from(config.table)
      .delete()
      .eq(config.resourceColumn, resourceId)
      .neq("role", "primary");

    if (deleteError) throw deleteError;

    if (collaborators.length > 0) {
      const rows = collaborators.map((collaborator, index) => ({
        [config.resourceColumn]: resourceId,
        artist_id: collaborator.artist_id,
        role: collaborator.role,
        position: index + 1,
      }));

      const { error: insertError } = await supabaseServer
        .from(config.table)
        .insert(rows);

      if (insertError) throw insertError;
    }

    return NextResponse.json(
      await loadCollaboratorData(id, resourceType, resourceId),
    );
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to save artist collaborators:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save collaborators",
      },
      { status: 500 },
    );
  }
}
