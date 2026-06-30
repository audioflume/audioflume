import type { FilmwaveStem } from "./music";

function getRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function cleanStemName(name: string) {
  return name
    .replace(/\.[^.]+$/, "")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/^\d{8,}\s*/, "")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStemNameFromUrl(url: string, index: number) {
  const decodedUrl = decodeURIComponent(url);
  const filename = decodedUrl.split("/").pop() || "";
  const cleanedName = filename ? cleanStemName(filename) : "";

  return cleanedName || `Stem ${index + 1}`;
}

export function normalizeSongStems(value: unknown): FilmwaveStem[] {
  if (!value) return [];

  if (typeof value === "string") {
    try {
      return normalizeSongStems(JSON.parse(value));
    } catch {
      return value
        .split(/\n/)
        .map((url, index) => {
          const cleanUrl = url.trim();
          if (!cleanUrl || !cleanUrl.startsWith("http")) return null;
          return { name: getStemNameFromUrl(cleanUrl, index), url: cleanUrl };
        })
        .filter((item): item is FilmwaveStem => Boolean(item));
    }
  }

  if (!Array.isArray(value)) return [];

  if (value.every((item) => typeof item === "string")) {
    const joined = value.join("\n").trim();
    if (joined.startsWith("[") || joined.startsWith("{")) {
      try {
        return normalizeSongStems(JSON.parse(joined));
      } catch {
        /* fall through */
      }
    }
  }

  return value
    .map((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();
        if (!url || !url.startsWith("http")) return null;
        return { name: getStemNameFromUrl(url, index), url };
      }

      if (!item || typeof item !== "object") return null;

      const record = getRecord(item);
      const url =
        typeof record.url === "string" && record.url.trim()
          ? record.url.trim()
          : typeof record.href === "string" && record.href.trim()
            ? record.href.trim()
            : "";

      if (!url) return null;

      const name =
        typeof record.name === "string" && record.name.trim()
          ? cleanStemName(record.name.trim()) || getStemNameFromUrl(url, index)
          : getStemNameFromUrl(url, index);

      return { name, url };
    })
    .filter((item): item is FilmwaveStem => Boolean(item));
}

export function getSongStemsFromRecord(song: unknown) {
  const record = getRecord(song);
  const fields =
    typeof record.fields === "object" && record.fields !== null
      ? getRecord(record.fields)
      : null;

  return (
    [
      normalizeSongStems(record.stems),
      normalizeSongStems(record.Stems),
      normalizeSongStems(record["Stem Files"]),
      normalizeSongStems(record.stemUrls),
      normalizeSongStems(record.stem_urls),
      fields ? normalizeSongStems(fields.stems) : [],
      fields ? normalizeSongStems(fields.Stems) : [],
      fields ? normalizeSongStems(fields["Stem Files"]) : [],
      fields ? normalizeSongStems(fields.stemUrls) : [],
      fields ? normalizeSongStems(fields.stem_urls) : [],
    ].find((items) => items.length > 0) ?? []
  );
}
