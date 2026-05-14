export function getRecord(value: unknown) {
  return value as Record<string, unknown>;
}

export function getStringFromRecord(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}
