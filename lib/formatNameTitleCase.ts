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
  "or",
  "over",
  "the",
  "to",
  "vs",
  "via",
  "with",
  "without",
]);

function hasIntentionalInnerCaps(word: string) {
  return /[a-z][A-Z]/.test(word.slice(1));
}

function hasMixedLettersAndSymbols(word: string) {
  return /[A-Za-z]/.test(word) && /[^A-Za-z'’]/.test(word);
}

function formatWord(word: string, index: number) {
  const leading = word.match(/^\W+/)?.[0] ?? "";
  const trailing = word.match(/\W+$/)?.[0] ?? "";
  const core = word.slice(leading.length, word.length - trailing.length);

  if (!core) return word;

  const lowerCore = core.toLowerCase();

  if (index > 0 && LOWERCASE_WORDS.has(lowerCore)) {
    return `${leading}${lowerCore}${trailing}`;
  }

  if (hasIntentionalInnerCaps(core) || hasMixedLettersAndSymbols(core)) {
    return word;
  }

  return `${leading}${core.charAt(0).toUpperCase()}${core.slice(1).toLowerCase()}${trailing}`;
}

export function formatNameTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word, index) => formatWord(word, index))
    .join(" ");
}
