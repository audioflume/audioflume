from __future__ import annotations

import re
from pathlib import Path

ROOTS = [Path("apps/web"), Path("apps/desktop"), Path("packages/shared")]
TEXT_EXTENSIONS = {".css", ".tsx", ".ts", ".jsx", ".js"}
MONO_MARKERS = (
    "font-roboto-mono",
    "--font-roboto-mono",
    "Roboto Mono",
    "font-mono",
)
SONG_MARKERS = (
    "song-title",
    "song_name",
    "song-name",
    "track-title",
    "track_name",
    "track-name",
)
HEADER_MARKERS = (
    "title",
    "heading",
    "headline",
    "hero",
    "artist-name",
    "artist_name",
    "display",
)
WEIGHT_WORDS = "thin|extralight|light|normal|medium|semibold|bold|extrabold|black"
WEIGHT_TOKEN_RE = re.compile(
    rf"^(?P<variant>(?:(?:sm|md|lg|xl|2xl):)*)font-(?:{WEIGHT_WORDS}|\[(?:[1-9]\d{{2}})\])$"
)
SIZE_MAP = {
    "text-xs": 12.0,
    "text-sm": 14.0,
    "text-base": 16.0,
    "text-lg": 18.0,
    "text-xl": 20.0,
    "text-2xl": 24.0,
    "text-3xl": 30.0,
    "text-4xl": 36.0,
    "text-5xl": 48.0,
    "text-6xl": 60.0,
    "text-7xl": 72.0,
    "text-8xl": 96.0,
    "text-9xl": 128.0,
}


def iter_files() -> list[Path]:
    files: list[Path] = []
    for root in ROOTS:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if path.is_file() and path.suffix in TEXT_EXTENSIONS:
                files.append(path)
    return files


def has_mono_marker(value: str) -> bool:
    lower = value.lower()
    return any(marker.lower() in lower for marker in MONO_MARKERS)


def class_names_from_selector(selector: str) -> set[str]:
    return set(re.findall(r"\.([A-Za-z0-9_-]+)", selector))


def collect_mono_context(files: list[Path]) -> tuple[set[str], set[str]]:
    mono_selectors: set[str] = set()
    mono_classes: set[str] = set()
    block_re = re.compile(r"(?P<selector>[^{}]+)\{(?P<body>[^{}]*)\}", re.S)
    for path in files:
        text = path.read_text(encoding="utf-8")
        for match in block_re.finditer(text):
            selector = match.group("selector").strip()
            body = match.group("body")
            if has_mono_marker(body):
                for part in selector.split(","):
                    clean = part.strip()
                    if clean:
                        mono_selectors.add(clean)
                        mono_classes.update(class_names_from_selector(clean))
    return mono_selectors, mono_classes


def numeric_sizes(value: str) -> list[float]:
    sizes: list[float] = []
    for number in re.findall(r"(-?\d+(?:\.\d+)?)px", value):
        sizes.append(float(number))
    for number in re.findall(r"(-?\d+(?:\.\d+)?)rem", value):
        sizes.append(float(number) * 16.0)
    return sizes


def is_header(selector_or_context: str) -> bool:
    lower = selector_or_context.lower()
    if re.search(r"(^|[\s>+~,])h[1-6](?:\b|[:.#\[])", lower):
        return True
    return any(marker in lower for marker in HEADER_MARKERS)


def is_song_name(selector_or_context: str) -> bool:
    lower = selector_or_context.lower()
    return any(marker in lower for marker in SONG_MARKERS)


def target_for_range(min_size: float, max_size: float, context: str) -> int | None:
    if is_song_name(context):
        return 400
    if max_size < 15.0:
        return 320
    if min_size > 16.0:
        if max_size > 40.0 and is_header(context):
            return 400
        return 200
    return None


def target_for_size_value(value: str, context: str) -> int | None:
    sizes = numeric_sizes(value)
    if not sizes:
        return 400 if is_song_name(context) else None
    if "clamp(" in value.lower() and len(sizes) >= 2:
        return target_for_range(sizes[0], sizes[-1], context)
    if "min(" in value.lower() or "max(" in value.lower():
        return target_for_range(min(sizes), max(sizes), context)
    size = sizes[0]
    return target_for_range(size, size, context)


def selector_is_mono(selector: str, mono_selectors: set[str]) -> bool:
    normalized = selector.strip()
    for mono_selector in mono_selectors:
        # Descendant rules of a known mono-family selector inherit Roboto Mono.
        if mono_selector and mono_selector in normalized:
            return True
    return False


def replace_weight_declaration(body: str, target: int) -> str:
    weight_re = re.compile(r"(?P<prefix>font-weight\s*:\s*)(?P<value>[^;]+)(?P<semi>;)", re.I)
    if weight_re.search(body):
        def repl(match: re.Match[str]) -> str:
            important = " !important" if "!important" in match.group("value") else ""
            return f"{match.group('prefix')}{target}{important}{match.group('semi')}"
        body = weight_re.sub(repl, body)
    else:
        size_re = re.compile(r"(?P<decl>font-size\s*:\s*[^;]+;)", re.I)
        size_match = size_re.search(body)
        if size_match:
            line_start = body.rfind("\n", 0, size_match.start()) + 1
            indent = re.match(r"[ \t]*", body[line_start:size_match.start()]).group(0)
            insert = f"\n{indent}font-weight: {target};"
            body = body[: size_match.end()] + insert + body[size_match.end() :]

    variation_re = re.compile(
        r'(?P<prefix>font-variation-settings\s*:\s*[^;]*["\']wght["\']\s+)(?P<weight>\d+(?:\.\d+)?)(?P<suffix>[^;]*;)',
        re.I,
    )
    body = variation_re.sub(lambda m: f"{m.group('prefix')}{target}{m.group('suffix')}", body)
    return body


def process_css_like(text: str, mono_selectors: set[str]) -> str:
    block_re = re.compile(r"(?P<selector>[^{}]+)\{(?P<body>[^{}]*?font-size\s*:[^{}]*?)\}", re.S | re.I)

    def repl(match: re.Match[str]) -> str:
        selector = match.group("selector")
        body = match.group("body")
        if has_mono_marker(selector) or has_mono_marker(body) or selector_is_mono(selector, mono_selectors):
            return match.group(0)
        size_match = re.search(r"font-size\s*:\s*([^;]+);", body, re.I)
        if not size_match:
            return match.group(0)
        target = target_for_size_value(size_match.group(1), selector)
        if target is None:
            return match.group(0)
        new_body = replace_weight_declaration(body, target)
        return f"{selector}{{{new_body}}}"

    return block_re.sub(repl, text)


def class_size(token: str) -> tuple[str, float, float] | None:
    parts = token.split(":")
    base = parts[-1]
    variant = ":".join(parts[:-1])
    variant_prefix = f"{variant}:" if variant else ""
    if base in SIZE_MAP:
        size = SIZE_MAP[base]
        return variant_prefix, size, size
    match = re.fullmatch(r"text-\[(.+)\]", base)
    if not match:
        return None
    raw = match.group(1)
    sizes = numeric_sizes(raw)
    if not sizes:
        return None
    if "clamp(" in raw.lower() and len(sizes) >= 2:
        return variant_prefix, sizes[0], sizes[-1]
    return variant_prefix, sizes[0], sizes[0]


def process_class_string(classes: str, context: str, mono_classes: set[str]) -> str:
    tokens = classes.split()
    if not tokens or has_mono_marker(classes):
        return classes
    if mono_classes.intersection(tokens):
        return classes

    targets: dict[str, int] = {}
    for token in tokens:
        parsed = class_size(token)
        if not parsed:
            continue
        variant, min_size, max_size = parsed
        target = target_for_range(min_size, max_size, context + " " + classes)
        if target is not None:
            targets[variant] = target

    if not targets:
        return classes

    kept: list[str] = []
    for token in tokens:
        weight_match = WEIGHT_TOKEN_RE.match(token)
        if weight_match and weight_match.group("variant") in targets:
            continue
        kept.append(token)

    for variant, target in targets.items():
        kept.append(f"{variant}font-[{target}]")
    return " ".join(kept)


def process_jsx_classnames(text: str, mono_classes: set[str]) -> str:
    # Static quoted className attributes. Dynamic template strings are intentionally left untouched.
    attr_re = re.compile(
        r"(?P<prefix><(?P<tag>[A-Za-z][A-Za-z0-9.]*)\b[^>]*?\bclassName=)(?P<quote>[\"'])(?P<classes>.*?)(?P=quote)",
        re.S,
    )

    def repl(match: re.Match[str]) -> str:
        tag = match.group("tag")
        classes = match.group("classes")
        context = tag
        new_classes = process_class_string(classes, context, mono_classes)
        return f"{match.group('prefix')}{match.group('quote')}{new_classes}{match.group('quote')}"

    return attr_re.sub(repl, text)


def apply_special_tokens(text: str) -> str:
    text = re.sub(
        r"(--filmwave-section-title-font-weight\s*:\s*)\d+",
        r"\g<1>200",
        text,
    )
    text = re.sub(
        r"(--filmwave-ui-title-font-weight\s*:\s*)\d+",
        r"\g<1>200",
        text,
    )
    return text


def mono_context_fingerprint(text: str) -> tuple[str, ...]:
    fragments: list[str] = []
    block_re = re.compile(r"[^{}]+\{[^{}]*\}", re.S)
    for block in block_re.findall(text):
        if has_mono_marker(block):
            fragments.append(block)
    attr_re = re.compile(r"className=[\"'][^\"']+[\"']", re.S)
    for attr in attr_re.findall(text):
        if has_mono_marker(attr):
            fragments.append(attr)
    return tuple(fragments)


def main() -> None:
    files = iter_files()
    mono_selectors, mono_classes = collect_mono_context(files)
    changed: list[str] = []

    for path in files:
        before = path.read_text(encoding="utf-8")
        before_mono = mono_context_fingerprint(before)
        after = process_css_like(before, mono_selectors)
        if path.suffix in {".tsx", ".jsx"}:
            after = process_jsx_classnames(after, mono_classes)
        if path.as_posix() == "packages/shared/styles/theme.css":
            after = apply_special_tokens(after)
        after_mono = mono_context_fingerprint(after)
        if before_mono != after_mono:
            raise RuntimeError(f"Roboto Mono context changed unexpectedly in {path}")
        if after != before:
            path.write_text(after, encoding="utf-8")
            changed.append(path.as_posix())

    print(f"Updated {len(changed)} files")
    for path in changed:
        print(path)


if __name__ == "__main__":
    main()
