"use client";

import Link from "next/link";

import { useTheme } from "@/context/ThemeContext";

const UI_GRAPHIC_DARK =
  "https://images.filmwave.io/images/home/UI-Dark.png";
const UI_GRAPHIC_LIGHT =
  "https://images.filmwave.io/images/home/UI-Light.png";

export default function PricingUiShowcase() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="audioflume-pricing-ui-showcase">
      <img
        className="audioflume-pricing-ui-graphic is-dark"
        src={UI_GRAPHIC_DARK}
        alt="Audioflume music library interface"
        draggable={false}
      />
      <img
        className="audioflume-pricing-ui-graphic is-light"
        src={UI_GRAPHIC_LIGHT}
        alt=""
        aria-hidden="true"
        draggable={false}
      />

      <div className="audioflume-pricing-ui-overlay">
        <h2>An extensive library of music curated for film.</h2>
        <Link href="/sign-up">Create Free Account</Link>
      </div>

      <button
        type="button"
        className="audioflume-pricing-ui-theme-toggle"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? "Use light mode" : "Use dark mode"}
      >
        {theme === "dark" ? (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="3.25" />
            <path d="M10 2.25v2M10 15.75v2M2.25 10h2M15.75 10h2M4.52 4.52l1.42 1.42M14.06 14.06l1.42 1.42M15.48 4.52l-1.42 1.42M5.94 14.06l-1.42 1.42" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M15.8 12.65A6.35 6.35 0 0 1 7.35 4.2 6.35 6.35 0 1 0 15.8 12.65Z" />
          </svg>
        )}
      </button>
    </section>
  );
}
