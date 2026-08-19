# Audioflume Backend UI

This directory is the canonical UI source for the Audioflume **backend**.

## Scope

- **Admin backend and Artist backend use the same visual system.**
- The public/front-end website is a separate visual system and must not be used as a backend presentation source.
- Backend pages should compose the shared components in this directory instead of recreating buttons, selects, checkboxes, uploads, artwork controls, sections, rows, modals, search fields, or sidebar geometry locally.

## Visual source of truth

The approved current Admin backend is the visual reference. `BackendUI.css` owns shared backend dimensions and base styles. The React components in this directory are the canonical implementations of repeated backend UI.

Current shared primitives include:

- `BackendControls.tsx` — buttons, inputs, selects, textareas, checkboxes, choice buttons, status badges, sections.
- `BackendArtworkUpload.tsx` — canonical image upload with `song` and `compact` variants.
- `BackendSongFileUpload.tsx` — canonical Audio / Stems / Song Cover upload experience used by Admin and Artist song upload.
- `BackendModalShell.tsx` — backend modal shell.
- `BackendPageHeader.tsx` — backend page breadcrumb/header.
- `BackendSearchBar.tsx` — backend search input.
- `BackendSidebar.tsx` — shared Admin/Artist sidebar geometry.
- `BackendRow.tsx` — shared backend row/media primitives.
- `BackendDragHandle.tsx` — backend reorder handle.

## Rules

1. If Admin and Artist need the same control, use the same component from this directory.
2. Do not copy backend JSX/classes into another page to make it look the same.
3. Do not import public/front-end presentation helpers into backend components to imitate backend UI.
4. Do not add page-level CSS overrides for a shared backend component. Change the canonical component or `BackendUI.css` instead.
5. Do not add a second dropdown chevron to `BackendSelect`; the canonical chevron is supplied by `BackendUI.css`.
6. Specialized behavior can remain specialized, but repeated presentation should use these primitives.
7. New legacy adapter/injector layers must not be introduced to restyle rendered backend DOM.

`tools/style-guard.mjs` enforces key ownership boundaries during `npm run web` and `npm run build`.
