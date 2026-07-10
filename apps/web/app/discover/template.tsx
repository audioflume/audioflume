import type { ReactNode } from "react";
import SuggestedForYouPortal from "./SuggestedForYouPortal";

const DISCOVER_FEATURED_SEARCH_STYLE = `
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section {
    display: grid !important;
    gap: 16px !important;
    margin: 0 0 18px !important;
    padding: 22px !important;
    border: 1px solid var(--border) !important;
    background:
      radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--text-primary) 10%, transparent), transparent 30%),
      color-mix(in srgb, var(--bg-primary) 92%, var(--text-primary) 8%) !important;
  }

  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section,
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section {
    background:
      radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--text-primary) 8%, transparent), transparent 30%),
      color-mix(in srgb, var(--bg-primary) 90%, var(--text-primary) 10%) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section::before {
    content: "Search the library";
    display: block !important;
    color: var(--text-muted) !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    letter-spacing: 0.08em !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section::after {
    content: "Find tracks by mood, scene, genre, instrument, artist, or the feeling you want the cut to hold.";
    display: block !important;
    max-width: 720px !important;
    color: var(--text-secondary) !important;
    font-size: 13px !important;
    font-weight: 300 !important;
    line-height: 1.55 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form,
  form[class*="min-h-[58px]"][class*="cursor-text"] {
    height: 68px !important;
    min-height: 68px !important;
    gap: 14px !important;
    border: 1px solid color-mix(in srgb, var(--border) 72%, var(--text-primary) 28%) !important;
    border-radius: 999px !important;
    background: var(--bg-primary) !important;
    background-color: var(--bg-primary) !important;
    box-shadow: 0 18px 52px rgba(0, 0, 0, 0.18) !important;
    padding: 0 12px 0 18px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form:hover,
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form:focus-within,
  form[class*="min-h-[58px]"][class*="cursor-text"]:hover,
  form[class*="min-h-[58px]"][class*="cursor-text"]:focus-within {
    background: var(--bg-primary) !important;
    background-color: var(--bg-primary) !important;
    border-color: color-mix(in srgb, var(--border) 46%, var(--text-primary) 54%) !important;
    box-shadow: 0 22px 64px rgba(0, 0, 0, 0.24) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > div:first-child,
  form[class*="min-h-[58px]"][class*="cursor-text"] > div:first-child {
    width: 42px !important;
    height: 42px !important;
    flex: 0 0 42px !important;
    border-radius: 999px !important;
    background: color-mix(in srgb, var(--bg-primary) 82%, var(--text-primary) 18%) !important;
    color: var(--text-primary) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > div:first-child svg,
  form[class*="min-h-[58px]"][class*="cursor-text"] > div:first-child svg {
    width: 18px !important;
    height: 18px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > input,
  form[class*="min-h-[58px]"][class*="cursor-text"] > input {
    height: 44px !important;
    font-size: 17px !important;
    font-weight: 300 !important;
    line-height: 44px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > input::placeholder,
  form[class*="min-h-[58px]"][class*="cursor-text"] > input::placeholder {
    color: var(--text-secondary) !important;
    font-size: 17px !important;
    font-weight: 300 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > div[class*="lg:flex"],
  form[class*="min-h-[58px]"][class*="cursor-text"] > div[class*="lg:flex"] {
    display: flex !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > div[class*="lg:flex"] button,
  form[class*="min-h-[58px]"][class*="cursor-text"] > div[class*="lg:flex"] button {
    height: 32px !important;
    border-radius: 999px !important;
    background: color-mix(in srgb, var(--bg-primary) 88%, var(--text-primary) 12%) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > button[type="submit"],
  form[class*="min-h-[58px]"][class*="cursor-text"] > button[type="submit"] {
    display: flex !important;
    height: 42px !important;
    border-radius: 999px !important;
    padding-right: 22px !important;
    padding-left: 22px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form + div,
  form[class*="min-h-[58px]"][class*="cursor-text"] + div {
    display: flex !important;
    margin-top: 0 !important;
  }
`;

export default function DiscoverTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{DISCOVER_FEATURED_SEARCH_STYLE}</style>
      <SuggestedForYouPortal />
      {children}
    </>
  );
}
