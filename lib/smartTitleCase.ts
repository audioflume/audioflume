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

function hasIntentionalInternalCaps(word: string) {
  return /[a-z][A-Z]/.test(word) || /^[a-z]+[A-Z]/.test(word);
}

function isAllCapsWord(word: string) {
  return /^[A-Z0-9&]+$/.test(word) && /[A-Z]/.test(word);
}

function uppercaseFirstLetter(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function preserveInternalCapsWithLeadingTitleCase(word: string) {
  return word
    .split(/([\-'’])/)
    .map((part) => {
      if (part === "-" || part === "'" || part === "’") return part;
      if (!part) return part;

      return uppercaseFirstLetter(part);
    })
    .join("");
}

function formatWord(word: string, isFirstWord: boolean) {
  if (!word) return word;

  const match = word.match(/^([^A-Za-z0-9]*)([A-Za-z0-9][A-Za-z0-9'’&.-]*)([^A-Za-z0-9]*)$/);

  if (!match) return word;

  const [, prefix, core, suffix] = match;
  const lowerCore = core.toLowerCase();

  if (!isFirstWord && LOWERCASE_WORDS.has(lowerCore)) {
    return `${prefix}${lowerCore}${suffix}`;
  }

  if (isAllCapsWord(core)) {
    return `${prefix}${core}${suffix}`;
  }

  if (hasIntentionalInternalCaps(core)) {
    return `${prefix}${preserveInternalCapsWithLeadingTitleCase(core)}${suffix}`;
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
