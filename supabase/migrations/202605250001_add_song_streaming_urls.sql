alter table songs
add column if not exists playback_url text,
add column if not exists hls_url text;

create index if not exists songs_playback_url_idx on songs (playback_url);
create index if not exists songs_hls_url_idx on songs (hls_url);
