export default function AdminPlaylistPageStyles() {
  return (
    <style>{`
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form {
        gap: 12px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        .admin-playlist-main-stack {
        align-self: start;
        gap: 12px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        form
        > aside {
        align-self: start;
        align-content: start;
        grid-auto-rows: max-content;
        gap: 12px;
      }

      @media (min-width: 1280px) {
        :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
          form {
          grid-template-columns: minmax(0, 1fr) 340px;
        }
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        .admin-playlist-section-card,
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

      .admin-playlist-edit-content-page form + section {
        margin-top: 48px;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        .admin-playlist-section-card
        > h2 {
        margin-bottom: 12px;
      }

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

      /* Use the original Browse Filters 8px rhythm between playlist fields. */
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        .admin-playlist-fields,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        .admin-playlist-browse-grid,
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        .admin-playlist-shelf-card
        > div.grid {
        gap: 8px;
      }

      /* Browse and shelf fields use the same 40px control height as other admin fields. */
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        :is(.admin-playlist-browse-card, .admin-playlist-shelf-card)
        label {
        min-height: 40px;
        padding-top: 0;
        padding-bottom: 0;
        font-size: 12px;
      }

      /* Keep playlist name and kicker labels accessible but visually hidden. */
      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        .admin-playlist-details-card
        .admin-playlist-fields
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
        .admin-playlist-details-card
        .admin-playlist-fields
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
        .admin-playlist-details-card
        .admin-playlist-fields
        > label.grid
        > input:focus {
        border-color: var(--border);
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        .admin-playlist-actions {
        gap: 8px;
        padding-top: 0;
      }

      :is(.admin-playlist-create-content-page, .admin-playlist-edit-content-page)
        .admin-playlist-actions
        > button {
        height: 40px;
        min-height: 40px;
        border-radius: 7px;
        padding-right: 18px;
        padding-left: 18px;
        font-size: 12px;
        font-weight: 400;
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
        )
        form
        + section
        [class~="rounded-xl"] {
        border-radius: 7px;
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
