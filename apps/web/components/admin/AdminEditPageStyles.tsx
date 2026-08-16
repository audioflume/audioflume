export default function AdminEditPageStyles() {
  return (
    <style>{`
      /* Edit Song — follows the Song Upload design language without changing form behavior. */
      .admin-song-edit-content-page {
        --admin-song-card-x: 20px;
        --admin-song-card-bottom: 20px;
        --admin-song-title-gap: 12px;
        --admin-song-content-gap: 12px;
      }

      .admin-song-edit-content-page .admin-song-edit-song-info {
        --admin-song-content-gap: 8px;
      }

      .filmwave-admin-content-page.admin-song-edit-content-page .admin-song-form-card {
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--bg-primary);
      }

      .admin-song-edit-content-page .admin-song-form-card-header {
        min-height: 0;
        padding: 20px var(--admin-song-card-x) 0;
        border-bottom: 0;
        background: var(--bg-primary);
      }

      .admin-song-edit-content-page .admin-song-form-kicker {
        color: var(--text-primary);
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: -0.03em;
        text-transform: none;
      }

      .admin-song-edit-content-page form label[class*="uppercase"] {
        color: var(--text-primary);
        font-family: var(--font-aktiv-grotesk), sans-serif;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .filmwave-admin-content-page.admin-song-edit-content-page [class~="rounded-md"],
      .filmwave-admin-content-page.admin-song-edit-content-page [class~="rounded-lg"] {
        border-radius: 7px;
      }

      .filmwave-admin-content-page.admin-song-edit-content-page [class~="rounded-xl"],
      .filmwave-admin-content-page.admin-song-edit-content-page [class~="rounded-2xl"] {
        border-radius: 10px;
      }

      .admin-song-edit-content-page .admin-song-form-icon-btn {
        border-radius: 7px;
      }

      .admin-song-edit-content-page .admin-song-form-icon-btn:hover,
      .admin-song-edit-content-page .admin-song-form-icon-btn.is-open {
        background: transparent;
        color: var(--text-primary);
      }

      .admin-song-edit-content-page .admin-song-file-row {
        position: relative;
        grid-template-columns: 145px minmax(0, 1fr);
        align-items: start;
        border-top: 0;
        padding: 2px var(--admin-song-card-x);
      }

      .admin-song-edit-content-page .admin-song-file-row > div:first-child {
        grid-column: 1;
        grid-row: 1;
        align-self: start;
        padding-top: 11px;
      }

      .admin-song-edit-content-page .admin-song-file-row > div:nth-child(2) {
        grid-column: 2;
        grid-row: 1;
        min-width: 0;
      }

      .admin-song-edit-content-page
        .admin-song-file-row
        > div:first-child
        > div:nth-child(2) {
        display: none;
      }

      .admin-song-edit-content-page .admin-song-file-row:first-child {
        padding-top: var(--admin-song-title-gap);
      }

      .admin-song-edit-content-page .admin-song-file-row:last-child {
        padding-bottom: var(--admin-song-card-bottom);
      }

      .admin-song-edit-content-page
        .admin-song-file-row
        > div:nth-child(2)
        > div[class~="h-9"] {
        height: 40px;
        padding-left: 6px;
        border-radius: 7px;
      }

      .admin-song-edit-content-page
        .admin-song-file-row
        button[class~="rounded-full"] {
        height: 28px;
        border-radius: 7px;
        font-weight: 500;
      }

      .admin-song-edit-content-page
        .admin-song-file-row:first-child
        > div:last-child,
      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(3)
        > div:last-child {
        grid-column: 2;
        grid-row: 1;
        z-index: 2;
        height: 40px;
        align-items: center;
        align-self: start;
        justify-self: end;
        margin-right: 12px;
      }

      .admin-song-edit-content-page
        .admin-song-file-row:first-child
        > div:last-child:not(:has(button)),
      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(3)
        > div:last-child:not(:has(button)) {
        display: none;
      }

      .admin-song-edit-content-page
        .admin-song-file-row:first-child:has(> div:last-child > button)
        > div:nth-child(2)
        > div[class~="h-9"],
      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(3):has(> div:last-child > button)
        > div:nth-child(2)
        > div[class~="h-9"] {
        padding-right: 72px;
      }

      .admin-song-edit-content-page
        .admin-song-file-row:first-child
        > div:last-child
        > button:hover,
      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(3)
        > div:last-child
        > button:hover {
        color: var(--danger);
      }

      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(2):not(:has(img))
        > div:last-child {
        display: none;
      }

      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(2):has(img)
        > div:nth-child(2) {
        margin-right: 44px;
      }

      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(2)
        > div:last-child {
        grid-column: 2;
        grid-row: 1;
        position: relative;
        width: 40px;
        height: 40px;
        align-items: center;
        align-self: start;
        justify-self: end;
        margin: 0;
      }

      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(2)
        > div:last-child
        > div {
        width: 40px;
        height: 40px;
        border-radius: 7px;
      }

      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(2)
        > div:last-child
        > button {
        position: absolute;
        top: -6px;
        right: -6px;
        z-index: 10;
        display: flex;
        width: 20px;
        height: 20px;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: var(--bg-primary);
        color: var(--text-secondary);
        font-size: 0;
        line-height: 1;
        transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
      }

      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(2)
        > div:last-child
        > button::before {
        content: "×";
        font-size: 14px;
        font-weight: 300;
        line-height: 1;
      }

      .admin-song-edit-content-page
        .admin-song-file-row:nth-child(2)
        > div:last-child
        > button:hover {
        background: color-mix(in srgb, var(--bg-primary) 90%, var(--danger) 10%);
        color: var(--danger);
      }

      .admin-song-edit-content-page
        .admin-song-form-card
        > [class~="p-4"] {
        padding: var(--admin-song-title-gap) var(--admin-song-card-x)
          var(--admin-song-card-bottom);
      }

      .admin-song-edit-content-page
        .admin-song-form-card
        > .admin-song-form-card-header
        + [class*="grid"] {
        gap: var(--admin-song-content-gap);
      }

      .admin-song-edit-content-page form :is(
        input:not([type="file"]),
        select,
        textarea
      ) {
        border-radius: 7px;
      }

      .admin-song-edit-content-page form :is(
        input:not([type="file"]):not([type="checkbox"]),
        select
      ) {
        height: 40px;
      }

      .admin-song-edit-content-page form label[class~="h-9"] {
        height: 40px;
        border-radius: 7px;
      }

      .admin-song-edit-content-page
        .admin-song-edit-song-info
        > .admin-song-form-card-header
        + div
        > div:nth-child(-n + 6)
        > label:first-child,
      .admin-song-edit-content-page
        .admin-song-edit-song-info
        [data-ai-generated-field-embedded]
        > div
        > label:first-child {
        display: none;
      }

      .admin-song-edit-content-page
        .admin-song-edit-song-info
        > .admin-song-form-card-header
        + div
        > div:nth-child(6)
        > label:last-child
        > span,
      .admin-song-edit-content-page
        .admin-song-edit-song-info
        [data-ai-generated-field-embedded]
        > div
        > label:last-child
        > span {
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
        border: 1.5px solid var(--border);
        border-radius: 4px;
        background: var(--bg-secondary);
        color: var(--bg-primary);
        transition: border 0.15s ease, background 0.15s ease, color 0.15s ease;
      }

      .admin-song-edit-content-page
        .admin-song-edit-song-info
        > .admin-song-form-card-header
        + div
        > div:nth-child(6)
        > label:last-child:hover
        > span,
      .admin-song-edit-content-page
        .admin-song-edit-song-info
        [data-ai-generated-field-embedded]
        > div
        > label:last-child:hover
        > span {
        border-color: var(--text-secondary);
      }

      .admin-song-edit-content-page
        .admin-song-edit-song-info
        > .admin-song-form-card-header
        + div
        > div:nth-child(6)
        > label:last-child
        > input:checked
        + span,
      .admin-song-edit-content-page
        .admin-song-edit-song-info
        [data-ai-generated-field-embedded]
        > div
        > label:last-child
        > input:checked
        + span {
        border-color: var(--text-primary);
        background: var(--text-primary);
        color: var(--bg-primary);
      }

      .admin-song-edit-content-page .admin-song-edit-tags-card {
        display: contents;
      }

      .admin-song-edit-content-page
        .admin-song-edit-tags-card
        > .admin-song-form-card-header {
        display: none;
      }

      .admin-song-edit-content-page
        .admin-song-edit-tags-card
        > .admin-song-form-card-header
        + div {
        display: contents;
      }

      .admin-song-edit-content-page
        .admin-song-edit-tags-card
        > .admin-song-form-card-header
        + div
        > div[class*="md:grid-cols-2"] {
        display: contents;
      }

      .admin-song-edit-content-page
        .admin-song-edit-tags-card
        > .admin-song-form-card-header
        + div
        > div:not([class*="md:grid-cols-2"]),
      .admin-song-edit-content-page
        .admin-song-edit-tags-card
        > .admin-song-form-card-header
        + div
        > div[class*="md:grid-cols-2"]
        > div {
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--bg-primary);
        padding: 20px var(--admin-song-card-x) var(--admin-song-card-bottom);
      }

      .admin-song-edit-content-page
        .admin-song-edit-tags-card
        > .admin-song-form-card-header
        + div
        > div:not([class*="md:grid-cols-2"]):not([data-region-field-embedded])
        > div:first-child,
      .admin-song-edit-content-page
        .admin-song-edit-tags-card
        > .admin-song-form-card-header
        + div
        > div[class*="md:grid-cols-2"]
        > div
        > div:first-child,
      .admin-song-edit-content-page
        .admin-song-edit-tags-card
        [data-region-field-embedded]
        > div
        > div:first-child {
        margin-bottom: var(--admin-song-title-gap);
      }

      .admin-song-edit-content-page
        .admin-song-edit-tags-card
        label[class*="uppercase"] {
        margin-bottom: 0;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: -0.03em;
        text-transform: none;
      }

      .admin-song-edit-content-page
        form
        > aside
        > .admin-song-form-card:last-child
        > div:last-child
        > button {
        height: 40px;
        border-radius: 7px;
        font-size: 12px;
        font-weight: 400;
      }

      @media (min-width: 1280px) {
        .admin-song-edit-content-page
          .admin-song-edit-song-info
          > .admin-song-form-card-header
          + div {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }

      @media (max-width: 900px) {
        .admin-song-edit-content-page .admin-song-file-row {
          grid-template-columns: 1fr;
        }

        .admin-song-edit-content-page
          .admin-song-file-row
          > div:first-child {
          grid-column: 1;
          grid-row: 1;
          padding-top: 0;
        }

        .admin-song-edit-content-page
          .admin-song-file-row
          > div:nth-child(2) {
          grid-column: 1;
          grid-row: 2;
        }

        .admin-song-edit-content-page
          .admin-song-file-row
          > div:last-child {
          grid-column: 1;
          grid-row: 2;
        }
      }

      /* Edit Playlist — Song Upload structure with Playlist Manager secondary cues. */
      .admin-playlist-edit-content-page form {
        gap: 16px;
      }

      .admin-playlist-edit-content-page form > aside {
        gap: 16px;
      }

      .filmwave-admin-content-page.admin-playlist-edit-content-page [class~="rounded-md"],
      .filmwave-admin-content-page.admin-playlist-edit-content-page [class~="rounded-lg"] {
        border-radius: 7px;
      }

      .filmwave-admin-content-page.admin-playlist-edit-content-page [class~="rounded-xl"],
      .filmwave-admin-content-page.admin-playlist-edit-content-page [class~="rounded-2xl"],
      .filmwave-admin-content-page.admin-playlist-edit-content-page [class~="rounded-[14px]"],
      .filmwave-admin-content-page.admin-playlist-edit-content-page [class~="rounded-[18px]"] {
        border-radius: 10px;
      }

      .filmwave-admin-content-page.admin-playlist-edit-content-page form > section,
      .filmwave-admin-content-page.admin-playlist-edit-content-page form > aside > div,
      .filmwave-admin-content-page.admin-playlist-edit-content-page form + section {
        border-radius: 10px;
        background: var(--bg-primary);
        padding: 20px;
      }

      .admin-playlist-edit-content-page form > section > div:first-child {
        margin-bottom: 12px;
      }

      .admin-playlist-edit-content-page form > section h2,
      .admin-playlist-edit-content-page form > aside h3 {
        color: var(--text-primary);
        font-family: var(--font-aktiv-grotesk), sans-serif;
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: -0.03em;
      }

      .admin-playlist-edit-content-page form > section h2 + p,
      .admin-playlist-edit-content-page form > aside h3 + p,
      .admin-playlist-edit-content-page form + section h2 + p {
        margin-top: 4px;
        font-size: 12px;
        line-height: 18px;
      }

      .admin-playlist-edit-content-page form > section > div:last-child {
        gap: 12px;
      }

      .admin-playlist-edit-content-page form > section > div:last-child > label.grid {
        gap: 6px;
        color: var(--text-primary);
        font-family: var(--font-aktiv-grotesk), sans-serif;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .admin-playlist-edit-content-page form > section > div:last-child > label.grid > input {
        height: 40px;
        border-radius: 7px;
        font-family: inherit;
        font-size: 12px;
        text-transform: none;
        letter-spacing: normal;
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > div.grid.gap-3.rounded-xl {
        gap: 12px;
        border-radius: 10px;
        padding: 16px;
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > div.grid.gap-3.rounded-xl
        > div:first-child
        > div:first-child {
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: -0.03em;
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > div.grid.gap-3.rounded-xl
        > div:first-child
        > p {
        margin-top: 4px;
        font-size: 12px;
        line-height: 18px;
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > div.grid.gap-3.rounded-xl
        > div[class*="grid-cols"] {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > div.grid.gap-3.rounded-xl
        label:has(> input[type="checkbox"]) {
        display: inline-flex;
        width: auto;
        min-height: 28px;
        align-items: center;
        justify-content: center;
        gap: 0;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: transparent;
        padding: 0 10px;
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 500;
        line-height: 1;
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > div.grid.gap-3.rounded-xl
        label:has(> input[type="checkbox"]):hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > div.grid.gap-3.rounded-xl
        label:has(> input[type="checkbox"]:checked) {
        border-color: var(--text-primary);
        background: var(--text-primary);
        color: var(--bg-primary);
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > div.grid.gap-3.rounded-xl
        label
        > input[type="checkbox"] {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > div.grid.gap-3.rounded-xl
        > div[class~="border-t"] {
        gap: 10px;
        padding-top: 12px;
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > label.flex:has(> input[type="checkbox"]) {
        border-radius: 10px;
        padding: 12px;
      }

      .admin-playlist-edit-content-page
        form
        > section
        > div:last-child
        > label.flex
        > input[type="checkbox"] {
        width: 16px;
        height: 16px;
        margin-top: 1px;
      }

      .admin-playlist-edit-content-page
        form
        > section
        .flex.flex-wrap.gap-3.pt-2 {
        gap: 8px;
        padding-top: 4px;
      }

      .admin-playlist-edit-content-page
        form
        > section
        .flex.flex-wrap.gap-3.pt-2
        > button {
        min-height: 44px;
        border-radius: 7px;
        padding-right: 18px;
        padding-left: 18px;
        font-size: 12px;
        font-weight: 400;
      }

      .admin-playlist-edit-content-page form > aside > div > .grid > .flex:first-child > span {
        color: var(--text-primary);
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: -0.03em;
      }

      .admin-playlist-edit-content-page form > aside input[type="url"] {
        height: 40px;
        border-radius: 7px;
      }

      .admin-playlist-edit-content-page form > aside [class~="h-[112px]"] {
        border-radius: 10px;
      }

      .admin-playlist-edit-content-page form > aside h3 + div {
        margin-top: 12px;
        border-radius: 10px;
      }

      .filmwave-admin-content-page.admin-playlist-edit-content-page form + section {
        margin-top: 16px;
      }

      .admin-playlist-edit-content-page form + section > div:first-child {
        margin-bottom: 12px;
      }

      .admin-playlist-edit-content-page form + section h2 {
        color: var(--text-primary);
        font-family: var(--font-aktiv-grotesk), sans-serif;
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: -0.03em;
      }

      .admin-playlist-edit-content-page form + section .grid.gap-2 > div {
        border-radius: 7px;
      }

      .admin-playlist-edit-content-page form + section button[aria-label^="Remove "]:hover {
        color: var(--danger);
      }
    `}</style>
  );
}
