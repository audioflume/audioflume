"use client";

export default function DiscoverSharedHeaderSearch() {
  return (
    <style>{`
      .discover-header-search-row {
        display: none !important;
      }

      main > section {
        padding-top: calc(var(--filmwave-header-height, 56px) + 20px) !important;
      }

      main > section > div[class*="px-8"] {
        padding-top: 0 !important;
      }

      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
      }

      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section
        > form {
        box-sizing: border-box !important;
        height: 50px !important;
        min-height: 50px !important;
        align-items: center !important;
        gap: 8px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: var(--filmwave-chrome-surface) !important;
        background-color: var(--filmwave-chrome-surface) !important;
        padding: 0 24px !important;
      }

      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section
        > form:hover,
      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section
        > form:focus-within {
        background: var(--filmwave-chrome-surface) !important;
        background-color: var(--filmwave-chrome-surface) !important;
      }

      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section
        > form
        > div:first-child {
        width: 16px !important;
        height: 40px !important;
        flex: 0 0 16px !important;
        border-radius: 0 !important;
        background: transparent !important;
        color: var(--text-muted) !important;
      }

      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section
        > form
        > div:first-child
        svg {
        width: 16px !important;
        height: 16px !important;
      }

      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section
        > form
        > input {
        height: 40px !important;
        font-size: 15px !important;
        font-weight: 300 !important;
        line-height: 40px !important;
      }

      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section
        > form
        > input::placeholder {
        color: var(--text-muted) !important;
        font-size: 15px !important;
        font-weight: 300 !important;
      }

      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section
        > form
        > div[class*="lg:flex"],
      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section
        > form
        > button[type="submit"],
      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > section
        > div {
        display: none !important;
      }

      main > section[class*="ml-[var(--sidebar-width)]"]
        > div[class*="px-8"]
        > section:first-child
        > div[class*="mt-2"][class*="grid"] {
        margin-top: 14px !important;
      }
    `}</style>
  );
}
