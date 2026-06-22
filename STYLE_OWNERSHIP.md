# Style Ownership

Shared UI styling must live in its source-owned stylesheet. Do not add page-level, component-level, or runtime-injected CSS to change shared UI behavior.

## Header search ownership

Header/search pill styling is owned by:

- `packages/shared/styles/app-chrome.css`
- `packages/shared/styles/collapsible-search-pill.css`
- `packages/shared/styles/header-search-toolbar.css`

Do not style these selectors anywhere else:

- `.filmwave-header-search-form`
- `.filmwave-music-header-search-form`
- `.filmwave-header-actions > form`
- `.filmwave-search-pill`
- `.filmwave-search-pill-body`
- `.filmwave-search-pill-collapsed`
- `.filmwave-search-pill-expanded`
- `.filmwave-search-pill-icon-circle`
- `.filmwave-search-pill-input`

## Runtime style blocks

Do not use `style jsx global` for shared UI. Move the rule into the owning stylesheet instead.

The guard is run with:

```bash
npm run style:guard
```

It also runs before:

```bash
npm run web
npm --prefix apps/web run dev
npm --prefix apps/web run build
npm --prefix apps/web run vercel-build
```
