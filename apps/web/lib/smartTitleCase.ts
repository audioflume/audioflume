const LOWERCASE_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "if",
  "in",
  "into",
  "nor",
  "of",
  "on",
  "onto",
  "or",
  "over",
  "per",
  "the",
  "to",
  "vs",
  "v",
  "via",
  "with",
  "without",
]);

const PRESERVED_UPPERCASE_WORDS = new Set([
  "AI",
  "BPM",
  "DJ",
  "EDM",
  "EP",
  "LP",
  "SFX",
  "TV",
  "UK",
  "US",
  "USA",
]);

function hasIntentionalInternalCaps(word: string) {
  return /[a-z][A-Z]/.test(word);
}

function formatWord(word: string, isFirstWord: boolean) {
  if (!word) return word;

  const match = word.match(
    /^([^A-Za-z0-9]*)([A-Za-z0-9][A-Za-z0-9'’&.-]*)([^A-Za-z0-9]*)$/,
  );

  if (!match) return word;

  const [, prefix, core, suffix] = match;
  const lowerCore = core.toLowerCase();
  const upperCore = core.toUpperCase();

  if (PRESERVED_UPPERCASE_WORDS.has(upperCore)) {
    return `${prefix}${upperCore}${suffix}`;
  }

  if (!isFirstWord && LOWERCASE_WORDS.has(lowerCore)) {
    return `${prefix}${lowerCore}${suffix}`;
  }

  if (hasIntentionalInternalCaps(core)) {
    return `${prefix}${core}${suffix}`;
  }

  const formattedCore = core
    .split(/([\-'’])/)
    .map((part) => {
      if (part === "-" || part === "'" || part === "’") return part;
      if (!part) return part;

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");

  return `${prefix}${formattedCore}${suffix}`;
}

export function toSmartTitleCase(value: string) {
  let wordIndex = 0;

  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      const formatted = formatWord(word, wordIndex === 0);
      wordIndex += 1;
      return formatted;
    })
    .join(" ");
}
