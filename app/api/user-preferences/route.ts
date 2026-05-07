import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

type PlaylistViewMode = 'grid' | 'list';
type PlaylistSortMode = 'custom' | 'alphabetical';
type ThemeMode = 'light' | 'dark';

type UserPreferencesPatch = {
  playlist_view_mode?: PlaylistViewMode;
  playlist_sort_mode?: PlaylistSortMode;
  theme_mode?: ThemeMode;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const defaultPreferences = {
  playlist_view_mode: 'grid' as PlaylistViewMode,
  playlist_sort_mode: 'custom' as PlaylistSortMode,
  theme_mode: 'dark' as ThemeMode,
};

function isValidPlaylistViewMode(value: unknown): value is PlaylistViewMode {
  return value === 'grid' || value === 'list';
}

function isValidPlaylistSortMode(value: unknown): value is PlaylistSortMode {
  return value === 'custom' || value === 'alphabetical';
}

function isValidThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('playlist_view_mode, playlist_sort_mode, theme_mode')
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }

  if (!data) {
    const { data: created, error: createError } = await supabase
      .from('user_preferences')
      .insert({
        clerk_user_id: userId,
        ...defaultPreferences,
      })
      .select('playlist_view_mode, playlist_sort_mode, theme_mode')
      .single();

    if (createError) {
      console.error('Failed to create user preferences:', createError);
      return NextResponse.json({ error: 'Failed to create preferences' }, { status: 500 });
    }

    return NextResponse.json(created);
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const updates: UserPreferencesPatch = {};

  if ('playlist_view_mode' in body) {
    if (!isValidPlaylistViewMode(body.playlist_view_mode)) {
      return NextResponse.json({ error: 'Invalid playlist_view_mode' }, { status: 400 });
    }

    updates.playlist_view_mode = body.playlist_view_mode;
  }

  if ('playlist_sort_mode' in body) {
    if (!isValidPlaylistSortMode(body.playlist_sort_mode)) {
      return NextResponse.json({ error: 'Invalid playlist_sort_mode' }, { status: 400 });
    }

    updates.playlist_sort_mode = body.playlist_sort_mode;
  }

  if ('theme_mode' in body) {
    if (!isValidThemeMode(body.theme_mode)) {
      return NextResponse.json({ error: 'Invalid theme_mode' }, { status: 400 });
    }

    updates.theme_mode = body.theme_mode;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid preferences provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        clerk_user_id: userId,
        ...updates,
      },
      { onConflict: 'clerk_user_id' }
    )
    .select('playlist_view_mode, playlist_sort_mode, theme_mode')
    .single();

  if (error) {
    console.error('Failed to update user preferences:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }

  return NextResponse.json(data);
}