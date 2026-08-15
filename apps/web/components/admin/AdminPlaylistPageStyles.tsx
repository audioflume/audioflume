export default function AdminPlaylistPageStyles() {
  return (
    <style>{`
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form {
        gap: 24px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > aside {
        gap: 24px;
      }

      @media (min-width: 1280px) {
        :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
          form {
          grid-template-columns: minmax(0, 1fr) 340px;
        }
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > aside
        > div,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        + section {
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--bg-primary);
        padding: 20px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:first-child,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        + section
        > div:first-child {
        margin-bottom: 12px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        h2,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        h3,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        + section
        h2 {
        color: var(--text-primary);
        font-family: var(--font-aktiv-grotesk), sans-serif;
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: -0.03em;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child {
        gap: 12px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > div.grid.gap-3 {
        padding-top: 12px;
      }

      /* Keep playlist name and kicker labels accessible but visually hidden. */
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > label.grid {
        gap: 0;
        color: var(--text-primary);
        font-family: var(--font-aktiv-grotesk), sans-serif;
        font-size: 0;
        font-weight: 500;
        line-height: 0;
        letter-spacing: 0;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > label.grid
        > input,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > aside
        input[type="url"] {
        height: 40px;
        border-radius: 7px;
        font-family: inherit;
        font-size: 12px;
        line-height: normal;
        text-transform: none;
        letter-spacing: normal;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > label.grid
        > input:focus {
        border-color: var(--border);
      }

      /* Preserve the original pre-pill browse filter card/grid layout.
         The checkbox treatment matches Music Library exactly. */
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > div.grid.gap-3
        label
        > input[type="checkbox"] {
        position: relative;
        display: grid;
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
        appearance: none;
        place-content: center;
        opacity: 1;
        pointer-events: auto;
        cursor: pointer;
        border: 1.5px solid var(--border);
        border-radius: 4px;
        background: var(--bg-secondary);
        color: var(--bg-primary);
        transition:
          border-color 150ms ease,
          background 150ms ease,
          color 150ms ease;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > div.grid.gap-3
        label:hover
        > input[type="checkbox"] {
        border-color: var(--text-secondary);
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > div.grid.gap-3
        label
        > input[type="checkbox"]::after {
        content: "";
        width: 11px;
        height: 11px;
        opacity: 0;
        background: var(--bg-primary);
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5L9.5 17L19 7' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5L9.5 17L19 7' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / contain no-repeat;
        transition: opacity 150ms ease;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > div.grid.gap-3
        label
        > input[type="checkbox"]:checked {
        border-color: var(--text-primary);
        background: var(--text-primary);
        color: var(--bg-primary);
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > div.grid.gap-3
        label
        > input[type="checkbox"]:checked::after {
        opacity: 1;
      }

      /* Remove descriptive copy beneath playlist section/filter headings. */
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:first-child
        > p,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > div.grid.gap-3
        > div:first-child
        > p,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        + section
        h2
        + p {
        display: none;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > label.flex:has(> input[type="checkbox"]) {
        border-radius: 7px;
        background: var(--bg-primary);
        padding: 12px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > label.flex
        > input[type="checkbox"] {
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
        appearance: none;
        margin-top: 1px;
        border: 1.5px solid var(--border);
        border-radius: 4px;
        background: var(--bg-secondary);
        transition:
          border-color 150ms ease,
          background 150ms ease;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        > div:last-child
        > label.flex
        > input[type="checkbox"]:checked {
        border-color: var(--text-primary);
        background-color: var(--text-primary);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M5 12.5L9.5 17L19 7' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-position: center;
        background-repeat: no-repeat;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        .flex.flex-wrap.gap-3.pt-2 {
        gap: 8px;
        padding-top: 12px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > section
        .flex.flex-wrap.gap-3.pt-2
        > button {
        height: 40px;
        min-height: 40px;
        border-radius: 7px;
        padding-right: 18px;
        padding-left: 18px;
        font-size: 14px;
        font-weight: 500;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > aside
        > div
        > .grid
        > .flex:first-child
        > span {
        color: var(--text-primary);
        font-size: 16px;
        font-weight: 500;
        line-height: 24px;
        letter-spacing: -0.03em;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > aside
        [class~="h-[112px]"] {
        border-radius: 10px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > aside
        [class~="rounded-[14px]"],
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > aside
        [class~="rounded-[18px]"] {
        border-radius: 10px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > aside
        h3
        + div {
        margin-top: 12px;
        border-radius: 10px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        + section {
        margin-top: 24px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        + section
        .grid.gap-2 {
        gap: 6px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        + section
        .grid.gap-2
        > div,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        + section
        [class~="rounded-xl"] {
        border-radius: 7px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        + section
        button[aria-label^="Remove "]:hover {
        color: var(--danger);
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        :is(
          [class~="rounded-lg"],
          [class~="rounded-md"]
        ) {
        border-radius: 7px;
      }

      /* Playlist create/edit opt into the rounded admin corner system. */
      main.filmwave-admin-content-page:is(
          .admin-playlist-create-content-page,
          .admin-playlist-edit-content-page
        ):is(
          .admin-playlist-create-content-page,
          .admin-playlist-edit-content-page
        ):is(
          .admin-playlist-create-content-page,
          .admin-playlist-edit-content-page
        ) :is(
          [class~="rounded-xl"],
          [class~="rounded-2xl"],
          [class~="rounded-[14px]"],
          [class~="rounded-[18px]"]
        ) {
        border-radius: 10px;
      }

      main.filmwave-admin-content-page:is(
          .admin-playlist-create-content-page,
          .admin-playlist-edit-content-page
        ):is(
          .admin-playlist-create-content-page,
          .admin-playlist-edit-content-page
        ):is(
          .admin-playlist-create-content-page,
          .admin-playlist-edit-content-page
        ) :is(
          [class~="rounded-md"],
          [class~="rounded-lg"]
        ) {
        border-radius: 7px;
      }
    `}</style>
  );
}
