from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTS = {".css", ".tsx", ".ts", ".jsx", ".js"}
SKIP_DIRS = {"node_modules", ".next", "dist", "build", ".git", "tools", ".github"}
MONO_MARKERS = ("roboto-mono", "font-roboto-mono", "ui-monospace", "monospace", "font-mono", "font-geist-mono")
SONG_MARKERS = ("song-title", "player-title")

TAILWIND_SIZES = {
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

WEIGHT_CLASS_RE = re.compile(r"(?<![\w-])font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])(?![\w-])")
ARBITRARY_SIZE_RE = re.compile(r"text-\[([0-9]+(?:\.[0-9]+)?)px\]")
CSS_LEAF_BLOCK_RE = re.compile(r"([^{}]+)\{([^{}]*)\}", re.S)
CSS_SIZE_RE = re.compile(r"font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)px\s*(!important)?\s*;", re.I)
CSS_CLAMP_RE = re.compile(r"font-size\s*:\s*clamp\(([^;]+)\)\s*(!important)?\s*;", re.I)
CSS_WEIGHT_RE = re.compile(r"font-weight\s*:\s*(?:[1-9]00|[1-9][0-9]{2}|normal|bold|bolder|lighter)\s*(!important)?\s*;", re.I)


def desired_weight(size: float, song: bool = False) -> int | None:
    if song:
        return 400
    if size == 0:
        return None
    if size < 15:
        return 320
    if size > 40:
        return 400
    if size > 16:
        return 200
    return None


def clamp_weight(expr: str, song: bool = False) -> int | None:
    if song:
        return 400
    nums = [float(v) for v in re.findall(r"([0-9]+(?:\.[0-9]+)?)px", expr)]
    if not nums:
        return None
    if all(v > 40 for v in nums):
        return 400
    if all(v > 16 for v in nums):
        return 200
    if all(v < 15 for v in nums):
        return 320
    return None


def replace_css_block(match: re.Match[str]) -> str:
    selector, body = match.group(1), match.group(2)
    lower = (selector + "\n" + body).lower()
    if any(marker in lower for marker in MONO_MARKERS):
        return match.group(0)

    song = any(marker in lower for marker in SONG_MARKERS)
    size_match = CSS_SIZE_RE.search(body)
    clamp_match = CSS_CLAMP_RE.search(body)
    weight = None
    anchor = None
    important = False

    if size_match:
        weight = desired_weight(float(size_match.group(1)), song=song)
        anchor = size_match
        important = bool(size_match.group(2))
    elif clamp_match:
        weight = clamp_weight(clamp_match.group(1), song=song)
        anchor = clamp_match
        important = bool(clamp_match.group(2))

    if weight is None or anchor is None:
        return match.group(0)

    suffix = " !important" if important else ""
    replacement = f"font-weight: {weight}{suffix};"
    if CSS_WEIGHT_RE.search(body):
        body = CSS_WEIGHT_RE.sub(replacement, body, count=1)
    else:
        insert_at = anchor.end()
        indent_match = re.search(r"\n([ \t]*)[^\n]*font-size", body[:anchor.end()])
        indent = indent_match.group(1) if indent_match else "  "
        body = body[:insert_at] + f"\n{indent}{replacement}" + body[insert_at:]
    return selector + "{" + body + "}"


def process_css(text: str) -> str:
    previous = None
    current = text
    # Re-run so leaf rules nested inside at-rules are handled without flattening structure.
    while previous != current:
        previous = current
        current = CSS_LEAF_BLOCK_RE.sub(replace_css_block, current)
    return current


def line_size(line: str) -> tuple[float | None, str | None]:
    arbitrary = ARBITRARY_SIZE_RE.search(line)
    if arbitrary:
        return float(arbitrary.group(1)), arbitrary.group(0)
    for token, size in TAILWIND_SIZES.items():
        if re.search(rf"(?<![\w-]){re.escape(token)}(?![\w-])", line):
            return size, token
    return None, None


def process_code(text: str) -> str:
    lines = text.splitlines(keepends=True)
    out: list[str] = []
    for line in lines:
        lower = line.lower()
        if any(marker in lower for marker in MONO_MARKERS):
            out.append(line)
            continue
        size, token = line_size(line)
        if size is None or token is None:
            out.append(line)
            continue
        song = any(marker in lower for marker in SONG_MARKERS)
        weight = desired_weight(size, song=song)
        if weight is None:
            out.append(line)
            continue
        weight_token = f"font-[{weight}]"
        if WEIGHT_CLASS_RE.search(line):
            line = WEIGHT_CLASS_RE.sub(weight_token, line)
        else:
            line = line.replace(token, f"{token} {weight_token}", 1)
        out.append(line)
    return "".join(out)


def should_process(path: Path) -> bool:
    if path.suffix not in EXTS:
        return False
    if any(part in SKIP_DIRS for part in path.parts):
        return False
    return True


changed: list[str] = []
for path in ROOT.rglob("*"):
    if not path.is_file() or not should_process(path):
        continue
    original = path.read_text(encoding="utf-8")
    updated = process_css(original) if path.suffix == ".css" else process_code(original)
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        changed.append(str(path.relative_to(ROOT)))

print(f"Changed {len(changed)} files")
for item in changed:
    print(item)
