# Audioflume repository working rules

## Scope and safety

- Change only what the user explicitly requests. Do not refactor, reformat, rename, or fix unrelated code.
- Do not use CSS overrides to patch layout inconsistencies.
- Before editing, identify the files to touch, the purpose of each change, and what will remain unchanged.
- If a change touches shared components or CSS, filters, sidebar, song cards, player, authentication, admin, or code used by both web and desktop, explain the risk and plan before editing.
- The website is the visual source of truth. For web/desktop parity, inspect the website's actual structure, classes, CSS, icons, and states rather than approximating.
- Preserve existing functionality and state behavior unless explicitly instructed otherwise.
- Consult `STYLE_OWNERSHIP.md` before changing shared styling.

## Section headings and content spacing

The canonical title-to-content spacing is `--filmwave-section-title-margin-bottom` (currently 20px), owned by `packages/shared/styles/theme.css`. Reuse existing section-heading styles; do not hardcode another margin or introduce a second spacing source.

For **new Home/Discover sections** using the existing `audioflume-home-mockup-section-label` styling, use `HomeSectionWithHeading` from `apps/web/app/HomeSectionWithHeading.tsx`. Put song grids, carousels, and other flex/grid layouts in its **content** slot, never around the heading. The heading's existing bottom margin owns the title-to-content spacing; content gaps must only separate content items. Do not add a row gap between the heading and the content, and do not add a compensating margin or override.

For an optional right-aligned text link in a new Home/Discover section, pass `linkHref` and `linkLabel` to `HomeSectionWithHeading`. The component must emit the existing `audioflume-arrow-text-link inline-flex items-center gap-[5px]` link with `ArrowUpRightIcon` (size 16, stroke width 1.5, `translate-y-[2px]`), as used in the current curated playlist heading. The heading row already controls alignment and separation (`justify-content: space-between`, `gap: 24px`); do not add custom link or title spacing. Omit both link props for a heading without a link. Keep the `action` slot only for custom actions. Do not migrate existing link/heading pairs unless explicitly requested.

For **other pages**, inspect and reuse the established page-specific heading/container structure and canonical spacing token before adding a title. Do not blindly apply a Home/Discover class or change a shared component.

Before committing a new heading:
1. Inspect a correctly spaced neighboring heading and the complete DOM/JSX hierarchy.
2. Check the computed spacing contributors: heading margin, parent gap, grid/flex row gap, sibling margin, and padding.
3. Confirm there is exactly one title-to-content spacing source.
4. Verify narrow and wide layouts, including any conditional or loading states.
5. Avoid migrating existing sections unless the user explicitly asks.

## Commit handoff

After each series of commits, report: **Files changed**, **What changed**, **Commit** (full hash), and **What to test**, followed by exactly:

```bash
cd /Users/jordanwende/audioflume
git pull
npm run web
```
