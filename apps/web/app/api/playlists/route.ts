import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { normalizePlaylist, getPlaylistErrorResponse } from "@/lib/playlists";
import { toSmartTitleCase } from "@/lib/smartTitleCase";
import type { PlaylistSourceType } from "@/lib/types";

function parseCoverImageUrl(value: unknown): string | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const cleanValue = value.trim();
  if (!cleanValue) return null;
  if (cleanValue.startsWith("data:") || cleanValue.startsWith("blob:")) {
    return undefined;
  }

  try {
    const url = new URL(cleanValue);
    return url.protocol === "https:" || url.protocol === "http:"
      ? cleanValue
      : undefined;
  } catch {
    return undefined;
  }
}

type PlaylistSourceReference = {
  sourceType: PlaylistSourceType;
  sourcePlaylistId: number | null;
};

function getPlaylistSourceReference(req: Request): PlaylistSourceReference {
  const referer = req.headers.get("referer");
  if (!referer) {
    return { sourceType: "user", sourcePlaylistId: null };
  }

  try {
    const pathname = new URL(referer).pathname;
    const curatedMatch = pathname.match(/^\/curated-playlists\/(\d+)\/?$/);
    if (curatedMatch) {
      return {
        sourceType: "curated",
        sourcePlaylistId: Number(curatedMatch[1]),
      };
    }

    const communityMatch = pathname.match(/^\/community-playlists\/(\d+)\/?$/);
    if (communityMatch) {
      return {
        sourceType: "community",
        sourcePlaylistId: Number(communityMatch[1]),
      };
    }
  } catch {
    return { sourceType: "user", sourcePlaylistId: null };
  }

  return { sourceType: "user", sourcePlaylistId: null };
}

function getSourceKey(value: {
  source_type?: unknown;
  source_playlist_id?: unknown;
}) {
  if (value.source_type !== "curated" && value.source_type !== "community") {
    return null;
  }

  const sourcePlaylistId = Number(value.source_playlist_id);
  if (!Number.isInteger(sourcePlaylistId) || sourcePlaylistId <= 0) {
    return null;
  }

  return `${value.source_type}:${sourcePlaylistId}`;
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let playlistsResult = await supabaseServer
      .from("playlists")
      .select(
        "id, clerk_user_id, name, position, is_public, published_at, primary_category, secondary_categories, source_type, source_playlist_id",
      )
      .eq("clerk_user_id", userId)
      .order("position", { ascending: true });

    if (playlistsResult.error) {
      playlistsResult = await supabaseServer
        .from("playlists")
        .select(
          "id, clerk_user_id, name, position, is_public, published_at, primary_category, secondary_categories, source_type",
        )
        .eq("clerk_user_id", userId)
        .order("position", { ascending: true });
    }

    if (playlistsResult.error) {
      playlistsResult = await supabaseServer
        .from("playlists")
        .select("id, clerk_user_id, name, position, is_public, published_at")
        .eq("clerk_user_id", userId)
        .order("position", { ascending: true });
    }

    if (playlistsResult.error) {
      playlistsResult = await supabaseServer
        .from("playlists")
        .select("id, clerk_user_id, name, position")
        .eq("clerk_user_id", userId)
        .order("position", { ascending: true });
    }

    const coversResult = await supabaseServer
      .from("playlists")
      .select("id, cover_image_url")
      .eq("clerk_user_id", userId)
      .not("cover_image_url", "like", "data:%")
      .not("cover_image_url", "like", "blob:%");

    if (playlistsResult.error) {
      throw playlistsResult.error;
    }

    if (coversResult.error) {
      throw coversResult.error;
    }

    const playlistRows = playlistsResult.data ?? [];
    const coversByPlaylistId = new Map(
      (coversResult.data ?? []).map((playlist) => [
        Number(playlist.id),
        playlist.cover_image_url,
      ]),
    );

    const curatedSourceIds = [
      ...new Set(
        playlistRows
          .filter((playlist) => playlist.source_type === "curated")
          .map((playlist) => Number(playlist.source_playlist_id))
          .filter(
            (sourcePlaylistId) =>
              Number.isInteger(sourcePlaylistId) && sourcePlaylistId > 0,
          ),
      ),
    ];
    const communitySourceIds = [
      ...new Set(
        playlistRows
          .filter((playlist) => playlist.source_type === "community")
          .map((playlist) => Number(playlist.source_playlist_id))
          .filter(
            (sourcePlaylistId) =>
              Number.isInteger(sourcePlaylistId) && sourcePlaylistId > 0,
          ),
      ),
    ];

    const curatedCoversById = new Map<number, string | null>();
    if (curatedSourceIds.length > 0) {
      const { data: curatedSources, error: curatedSourcesError } =
        await supabaseServer
          .from("curated_playlists")
          .select("id, cover_image_url")
          .in("id", curatedSourceIds);

      if (!curatedSourcesError) {
        for (const source of curatedSources ?? []) {
          curatedCoversById.set(
            Number(source.id),
            typeof source.cover_image_url === "string" && source.cover_image_url.trim()
              ? source.cover_image_url
              : null,
          );
        }
      }
    }

    const communityCoversById = new Map<number, string | null>();
    if (communitySourceIds.length > 0) {
      const { data: communitySources, error: communitySourcesError } =
        await supabaseServer
          .from("playlists")
          .select("id, cover_image_url")
          .in("id", communitySourceIds)
          .eq("is_public", true);

      if (!communitySourcesError) {
        for (const source of communitySources ?? []) {
          communityCoversById.set(
            Number(source.id),
            typeof source.cover_image_url === "string" && source.cover_image_url.trim()
              ? source.cover_image_url
              : null,
          );
        }
      }
    }

    const seenSourceKeys = new Set<string>();
    const visiblePlaylistRows = playlistRows.filter((playlist) => {
      const sourceKey = getSourceKey(playlist);
      if (!sourceKey) return true;
      if (seenSourceKeys.has(sourceKey)) return false;
      seenSourceKeys.add(sourceKey);
      return true;
    });

    return NextResponse.json(
      visiblePlaylistRows.map((playlist) => {
        const sourcePlaylistId = Number(playlist.source_playlist_id);
        const storedCover =
          coversByPlaylistId.get(Number(playlist.id)) ?? null;
        let resolvedCover = storedCover;

        if (
          playlist.source_type === "curated" &&
          Number.isInteger(sourcePlaylistId) &&
          sourcePlaylistId > 0
        ) {
          resolvedCover =
            curatedCoversById.get(sourcePlaylistId) ?? storedCover;
        } else if (
          playlist.source_type === "community" &&
          Number.isInteger(sourcePlaylistId) &&
          sourcePlaylistId > 0
        ) {
          resolvedCover =
            communityCoversById.get(sourcePlaylistId) ?? storedCover;
        }

        return normalizePlaylist({
          ...playlist,
          cover_image_url: resolvedCover,
        });
      }),
    );
  } catch (err) {
    console.error("Supabase playlists fetch error:", err);

    return NextResponse.json(
      getPlaylistErrorResponse(
        err instanceof Error
          ? { message: err.message }
          : { message: "Failed to load playlists" },
      ),
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        { error: "Missing playlist name" },
        { status: 400 },
      );
    }

    const cleanName = toSmartTitleCase(body.name);

    if (!cleanName) {
      return NextResponse.json(
        { error: "Missing playlist name" },
        { status: 400 },
      );
    }

    let coverImageUrl = parseCoverImageUrl(body.cover_image_url);

    if (coverImageUrl === undefined) {
      return NextResponse.json(
        { error: "Playlist cover must be an uploaded image URL" },
        { status: 400 },
      );
    }

    const sourceReference = getPlaylistSourceReference(req);

    if (
      sourceReference.sourceType !== "user" &&
      sourceReference.sourcePlaylistId !== null
    ) {
      if (sourceReference.sourceType === "curated") {
        const { data: sourcePlaylist, error: sourceError } = await supabaseServer
          .from("curated_playlists")
          .select("id, cover_image_url")
          .eq("id", sourceReference.sourcePlaylistId)
          .maybeSingle();

        if (sourceError) throw sourceError;
        if (!sourcePlaylist) {
          return NextResponse.json(
            { error: "Curated playlist not found" },
            { status: 404 },
          );
        }

        const sourceCover = parseCoverImageUrl(sourcePlaylist.cover_image_url);
        if (sourceCover !== undefined) {
          coverImageUrl = sourceCover;
        }
      } else {
        const { data: sourcePlaylist, error: sourceError } = await supabaseServer
          .from("playlists")
          .select("id, cover_image_url")
          .eq("id", sourceReference.sourcePlaylistId)
          .eq("is_public", true)
          .maybeSingle();

        if (sourceError) throw sourceError;
        if (!sourcePlaylist) {
          return NextResponse.json(
            { error: "Community playlist not found" },
            { status: 404 },
          );
        }

        const sourceCover = parseCoverImageUrl(sourcePlaylist.cover_image_url);
        if (sourceCover !== undefined) {
          coverImageUrl = sourceCover;
        }
      }

      const { data: existingSourcePlaylists, error: existingSourceError } =
        await supabaseServer
          .from("playlists")
          .select(
            "id, clerk_user_id, name, cover_image_url, position, is_public, published_at, primary_category, secondary_categories, source_type, source_playlist_id",
          )
          .eq("clerk_user_id", userId)
          .eq("source_type", sourceReference.sourceType)
          .eq("source_playlist_id", sourceReference.sourcePlaylistId)
          .order("id", { ascending: true })
          .limit(1);

      if (existingSourceError) {
        throw existingSourceError;
      }

      if (existingSourcePlaylists?.[0]) {
        return NextResponse.json(
          {
            error: `"${cleanName}" is already in My Playlists`,
            playlist: normalizePlaylist(existingSourcePlaylists[0]),
          },
          { status: 409 },
        );
      }
    }

    const { data: existingPlaylists, error: positionError } =
      await supabaseServer
        .from("playlists")
        .select("position")
        .eq("clerk_user_id", userId)
        .order("position", { ascending: false })
        .limit(1);

    if (positionError) {
      throw positionError;
    }

    const nextPosition =
      existingPlaylists?.[0]?.position != null
        ? existingPlaylists[0].position + 1
        : 0;

    const { data, error } = await supabaseServer
      .from("playlists")
      .insert({
        clerk_user_id: userId,
        name: cleanName,
        cover_image_url: coverImageUrl,
        source_type: sourceReference.sourceType,
        source_playlist_id: sourceReference.sourcePlaylistId,
        position:
          typeof body.position === "number" && Number.isFinite(body.position)
            ? body.position
            : nextPosition,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(normalizePlaylist(data));
  } catch (err) {
    console.error("Supabase playlist create error:", err);

    return NextResponse.json(
      getPlaylistErrorResponse(
        err instanceof Error
          ? { message: err.message }
          : { message: "Failed to create playlist" },
      ),
      { status: 500 },
    );
  }
}
