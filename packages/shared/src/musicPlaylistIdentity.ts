function getRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getStringFromRecord(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
}

const MUSIC_SONG_IDENTITY_KEYS = [
  "id",
  "songId",
  "song_id",
  "airtableId",
  "airtable_id",
  "airtableRecordId",
  "recordId",
];

export function getMusicSongIdentityValues(song: unknown) {
  const record = getRecord(song);
  const fields =
    typeof record.fields === "object" && record.fields !== null
      ? getRecord(record.fields)
      : null;

  const values = [
    getStringFromRecord(record, MUSIC_SONG_IDENTITY_KEYS),
    fields ? getStringFromRecord(fields, MUSIC_SONG_IDENTITY_KEYS) : "",
  ];

  return values.filter(Boolean);
}

export function getMusicSongStableId(song: unknown, fallbackIndex = 0) {
  return getMusicSongIdentityValues(song)[0] || String(fallbackIndex);
}

export function getPlaylistSongIdsFromResponse(data: unknown) {
  const record = getRecord(data);

  const rows = Array.isArray(data)
    ? data
    : Array.isArray(record.songs)
      ? record.songs
      : Array.isArray(record.playlistSongs)
        ? record.playlistSongs
        : Array.isArray(record.items)
          ? record.items
          : Array.isArray(record.data)
            ? record.data
            : [];

  const ids = new Set<string>();

  rows.forEach((row) => {
    const rowRecord = getRecord(row);
    const fields =
      typeof rowRecord.fields === "object" && rowRecord.fields !== null
        ? getRecord(rowRecord.fields)
        : null;
    const song =
      typeof rowRecord.song === "object" && rowRecord.song !== null
        ? getRecord(rowRecord.song)
        : null;

    [
      getStringFromRecord(rowRecord, MUSIC_SONG_IDENTITY_KEYS),
      fields ? getStringFromRecord(fields, MUSIC_SONG_IDENTITY_KEYS) : "",
      song ? getStringFromRecord(song, MUSIC_SONG_IDENTITY_KEYS) : "",
    ].forEach((id) => {
      if (id) ids.add(id);
    });
  });

  return ids;
}
