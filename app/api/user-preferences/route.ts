import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type PlaylistViewMode = "grid" | "list";
type PlaylistSortMode = "custom" | "alphabetical";
type SidebarProjectSortMode = "custom" | "alphabetical";
type ProjectAssetAddTarget = "root" | "media_folder";
type ThemeMode = "light" | "dark";

type UserPreferencesPatch = {
  playlist_view_mode?: PlaylistViewMode;
  playlist_sort_mode?: PlaylistSortMode;
  sidebar_project_sort_mode?: SidebarProjectSortMode;
  project_asset_add_target?: ProjectAssetAddTarget;
  theme_mode?: ThemeMode;
  show_edit_point_markers?: boolean;
};

const userPreferenceSelect =
  "playlist_view_mode, playlist_sort_mode, sidebar_project_sort_mode, project_asset_add_target, theme_mode, show_edit_point_markers";

const defaultPreferences = {
  playlist_view_mode: "grid" as PlaylistViewMode,
  playlist_sort_mode: "custom" as PlaylistSortMode,
  sidebar_project_sort_mode: "alphabetical" as SidebarProjectSortMode,
  project_asset_add_target: "media_folder" as ProjectAssetAddTarget,
  theme_mode: "dark" as ThemeMode,
  show_edit_point_markers: true,
};

function isValidPlaylistViewMode(value: unknown): value is PlaylistViewMode {
  return value === "grid" || value === "list";
}

function isValidPlaylistSortMode(value: unknown): value is PlaylistSortMode {
  return value === "custom" || value === "alphabetical";
}

function isValidSidebarProjectSortMode(
  value: unknown,
): value is SidebarProjectSortMode {
  return value === "custom" || value === "alphabetical";
}

function isValidProjectAssetAddTarget(
  value: unknown,
): value is ProjectAssetAddTarget {
  return value === "root" || value === "media_folder";
}

function isValidThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("user_preferences")
    .select(userPreferenceSelect)
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch user preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 },
    );
  }

  if (!data) {
    const { data: created, error: createError } = await supabaseServer
      .from("user_preferences")
      .insert({
        clerk_user_id: userId,
        ...defaultPreferences,
      })
      .select(userPreferenceSelect)
      .single();

    if (createError) {
      console.error("Failed to create user preferences:", createError);
      return NextResponse.json(
        { error: "Failed to create preferences" },
        { status: 500 },
      );
    }

    return NextResponse.json(created);
  }

  return NextResponse.json({
    ...defaultPreferences,
    ...data,
  });
}

export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const updates: UserPreferencesPatch = {};

  if ("playlist_view_mode" in body) {
    if (!isValidPlaylistViewMode(body.playlist_view_mode)) {
      return NextResponse.json(
        { error: "Invalid playlist_view_mode" },
        { status: 400 },
      );
    }

    updates.playlist_view_mode = body.playlist_view_mode;
  }

  if ("playlist_sort_mode" in body) {
    if (!isValidPlaylistSortMode(body.playlist_sort_mode)) {
      return NextResponse.json(
        { error: "Invalid playlist_sort_mode" },
        { status: 400 },
      );
    }

    updates.playlist_sort_mode = body.playlist_sort_mode;
  }

  if ("sidebar_project_sort_mode" in body) {
    if (!isValidSidebarProjectSortMode(body.sidebar_project_sort_mode)) {
      return NextResponse.json(
        { error: "Invalid sidebar_project_sort_mode" },
        { status: 400 },
      );
    }

    updates.sidebar_project_sort_mode = body.sidebar_project_sort_mode;
  }

  if ("project_asset_add_target" in body) {
    if (!isValidProjectAssetAddTarget(body.project_asset_add_target)) {
      return NextResponse.json(
        { error: "Invalid project_asset_add_target" },
        { status: 400 },
      );
    }

    updates.project_asset_add_target = body.project_asset_add_target;
  }

  if ("theme_mode" in body) {
    if (!isValidThemeMode(body.theme_mode)) {
      return NextResponse.json(
        { error: "Invalid theme_mode" },
        { status: 400 },
      );
    }

    updates.theme_mode = body.theme_mode;
  }

  if ("show_edit_point_markers" in body) {
    if (!isBoolean(body.show_edit_point_markers)) {
      return NextResponse.json(
        { error: "Invalid show_edit_point_markers" },
        { status: 400 },
      );
    }

    updates.show_edit_point_markers = body.show_edit_point_markers;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid preferences provided" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseServer
    .from("user_preferences")
    .upsert(
      {
        clerk_user_id: userId,
        ...updates,
      },
      { onConflict: "clerk_user_id" },
    )
    .select(userPreferenceSelect)
    .single();

  if (error) {
    console.error("Failed to update user preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
