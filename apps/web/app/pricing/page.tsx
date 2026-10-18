import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Footer from "@/components/Footer";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import { playlistDetailPrimaryActionButtonClass } from "@/components/uiClasses";
import { r2Client } from "@/lib/r2";
import { getSongs } from "@/lib/songs";

import PricingOriginalsShelf from "./PricingOriginalsShelf";

import "./pricing-page.css";

export const metadata: Metadata = {
  title: "Pricing | Audioflume",
  description:
    "Audioflume membership pricing for solo filmmakers, active studios, and larger creative teams.",
};

const DEFAULT_PRICING_HERO_IMAGE =
  "https://images.filmwave.io/images/home/kyle-loftus-FtQE89f3EXA-unsplash.jpg";
const PRICING_IMAGE_EXTENSIONS = /\.(avif|jpe?g|png|webp)$/i;


function AudioflumeOriginalsLogo() {
  return (
    <svg
      className="audioflume-pricing-lifetime-logo"
      viewBox="0 0 341.37 39.62"
      role="img"
      aria-label="Audioflume Originals"
    >
      <g fill="currentColor">
        <path d="M11.31,23.98c0-1.28.27-2.32.81-3.15.54-.82,1.27-1.47,2.19-1.93.92-.47,1.96-.8,3.11-1.01,1.15-.21,2.34-.34,3.57-.39l3.17-.11v-.74c0-1.5-.32-2.57-.96-3.22-.64-.65-1.67-.98-3.09-.98s-2.39.23-3.05.7c-.66.47-1.09,1.12-1.29,1.95l-3.5-.37c.34-1.79,1.18-3.1,2.52-3.94,1.34-.83,3.16-1.25,5.47-1.25,2.77,0,4.74.64,5.91,1.93,1.16,1.29,1.75,3.11,1.75,5.47v12.29h-3.68v-2.47c-.71.81-1.58,1.5-2.61,2.06-1.03.56-2.29.85-3.79.85-1.94,0-3.51-.48-4.71-1.44-1.2-.96-1.8-2.38-1.8-4.27ZM15.14,23.83c0,.88.27,1.59.81,2.12.54.53,1.41.79,2.61.79,1.67,0,3.02-.42,4.05-1.25,1.03-.83,1.55-2.05,1.55-3.64v-1.91l-2.94.11c-1.57.05-2.8.23-3.68.53-.88.31-1.5.73-1.86,1.27-.36.54-.53,1.2-.53,1.99Z"/>
        <path d="M19.91,39.23C9.18,39.23.44,30.5.44,19.76S9.18.3,19.91.3s19.47,8.73,19.47,19.47-8.73,19.47-19.47,19.47ZM19.91,3.5C10.94,3.5,3.64,10.79,3.64,19.76s7.3,16.27,16.27,16.27,16.27-7.3,16.27-16.27S28.88,3.5,19.91,3.5Z"/>
        <path d="M48.39,23.83c0-1.28.27-2.33.81-3.15.54-.82,1.27-1.47,2.19-1.93.92-.47,1.96-.8,3.11-1.01,1.15-.21,2.34-.34,3.57-.39l3.17-.11v-.74c0-1.5-.32-2.57-.96-3.22-.64-.65-1.67-.97-3.09-.97s-2.39.23-3.05.7c-.66.47-1.09,1.12-1.29,1.95l-3.5-.37c.34-1.79,1.18-3.1,2.52-3.94,1.34-.83,3.16-1.25,5.47-1.25,2.77,0,4.74.64,5.91,1.93,1.17,1.29,1.75,3.11,1.75,5.46v12.29h-3.68v-2.47c-.71.81-1.58,1.5-2.61,2.06-1.03.56-2.29.85-3.79.85-1.94,0-3.51-.48-4.71-1.44-1.2-.96-1.8-2.38-1.8-4.27ZM52.21,23.69c0,.88.27,1.59.81,2.12.54.53,1.41.79,2.61.79,1.67,0,3.02-.42,4.05-1.25,1.03-.83,1.55-2.05,1.55-3.64v-1.91l-2.94.11c-1.57.05-2.8.23-3.68.53s-1.5.73-1.86,1.27c-.36.54-.53,1.2-.53,1.99Z"/>
        <path d="M67.3,22.69v-12.7h3.86v12c0,1.6.27,2.73.81,3.4.54.68,1.4,1.01,2.58,1.01,1.35,0,2.54-.48,3.57-1.44.54-.49.95-1.01,1.23-1.56.28-.55.42-1.26.42-2.12v-11.3h3.86v19.1h-3.79v-2.83c-.91,1.18-1.89,2.04-2.94,2.59-1.06.55-2.2.83-3.42.83-2.13,0-3.7-.59-4.69-1.77s-1.49-2.92-1.49-5.23Z"/>
        <path d="M85.56,19.67c0-3.17.75-5.67,2.25-7.51,1.5-1.84,3.54-2.76,6.15-2.76,1.01,0,2.01.2,3,.61.99.41,1.91,1.14,2.74,2.19V2.82h3.86v26.28h-3.75v-2.61c-.79,1.03-1.67,1.82-2.67,2.37-.99.55-2.18.83-3.55.83-1.82,0-3.32-.44-4.51-1.31-1.19-.87-2.07-2.06-2.65-3.57-.58-1.51-.86-3.22-.86-5.13ZM89.53,19.56c0,1.74.24,3.12.72,4.12s1.09,1.72,1.84,2.15c.75.43,1.53.64,2.34.64,1.62,0,2.92-.54,3.9-1.62.98-1.08,1.47-2.64,1.47-4.67v-1.18c0-2.23-.47-3.86-1.42-4.9-.94-1.03-2.19-1.54-3.74-1.54-1.45,0-2.66.53-3.64,1.6-.98,1.07-1.47,2.87-1.47,5.39Z"/>
        <path d="M106.09,2.78h3.94v3.94h-3.94v-3.94ZM106.17,10h3.86v19.1h-3.86V10Z"/>
        <path d="M112.02,19.6c0-2.09.39-3.89,1.16-5.41s1.86-2.7,3.28-3.53c1.41-.83,3.07-1.25,4.99-1.25,2.92,0,5.2.9,6.85,2.7,1.64,1.8,2.47,4.25,2.47,7.34s-.84,5.66-2.52,7.49c-1.68,1.83-3.98,2.74-6.9,2.74s-5.23-.9-6.86-2.69c-1.63-1.79-2.45-4.26-2.45-7.4ZM116.03,19.53c0,2.09.42,3.77,1.25,5.06.83,1.29,2.2,1.93,4.09,1.93s3.26-.65,4.1-1.95c.85-1.3,1.27-2.99,1.27-5.08s-.42-3.7-1.27-4.99c-.85-1.29-2.21-1.93-4.1-1.93s-3.22.64-4.07,1.93c-.85,1.29-1.27,2.96-1.27,5.02Z"/>
        <path d="M133.92,13.2h-2.98v-3.05h2.98v-1.44c0-2.11.59-3.67,1.77-4.67,1.18-1.01,2.63-1.51,4.34-1.51.56,0,1.14.04,1.73.11.59.07,1.18.2,1.77.37l-.59,2.91c-.39-.12-.76-.2-1.1-.24-.34-.04-.69-.05-1.03-.05-.86,0-1.58.22-2.15.66-.58.44-.86,1.23-.86,2.36v1.51h4.71v3.05h-4.71v15.9h-3.86v-15.9ZM145.62,2.82h3.86v26.28h-3.86V2.82Z"/>
        <path d="M151.99,22.69v-12.7h3.86v12c0,1.6.27,2.73.81,3.4.54.68,1.4,1.01,2.58,1.01,1.35,0,2.54-.48,3.57-1.44.54-.49.95-1.01,1.23-1.56.28-.55.42-1.26.42-2.12v-11.3h3.86v19.1h-3.79v-2.83c-.91,1.18-1.89,2.04-2.94,2.59-1.06.55-2.2.83-3.42.83-2.13,0-3.7-.59-4.69-1.77s-1.49-2.92-1.49-5.23Z"/>
        <path d="M170.86,10h3.79v2.8c.83-1.13,1.75-1.97,2.76-2.54,1.01-.56,2.04-.85,3.09-.85,1.37,0,2.5.3,3.39.9.88.6,1.53,1.45,1.95,2.56,1.72-2.31,3.84-3.46,6.37-3.46,1.89,0,3.34.53,4.36,1.58,1.02,1.06,1.53,2.7,1.53,4.93v13.18h-3.83v-12.37c0-1.57-.26-2.64-.77-3.2-.52-.56-1.28-.85-2.28-.85-.54,0-1.09.09-1.66.28-.57.18-1.12.51-1.66.98-.44.39-.8.85-1.07,1.38-.27.53-.41,1.14-.41,1.82v11.96h-3.86v-12.37c0-1.5-.26-2.54-.79-3.15-.53-.6-1.28-.9-2.26-.9-1.15,0-2.23.48-3.24,1.43-.39.34-.75.79-1.09,1.34-.33.55-.5,1.29-.5,2.23v11.41h-3.83V10Z"/>
        <path d="M199.94,19.71c0-2.21.39-4.08,1.16-5.61.77-1.53,1.85-2.7,3.22-3.5,1.37-.8,2.96-1.2,4.75-1.2,1.96,0,3.58.4,4.84,1.2,1.26.8,2.2,1.9,2.82,3.31.61,1.41.92,3.04.92,4.88v1.69h-13.84c.1,1.96.58,3.49,1.45,4.58s2.14,1.64,3.81,1.64c1.45,0,2.52-.28,3.22-.83.7-.55,1.17-1.31,1.42-2.26h3.64c-.32,1.89-1.16,3.37-2.52,4.45-1.36,1.08-3.28,1.62-5.76,1.62-2.92,0-5.17-.88-6.75-2.65-1.58-1.77-2.37-4.21-2.37-7.32ZM204.54,15c-.37.83-.6,1.79-.7,2.87h10.01c-.1-1.82-.48-3.2-1.16-4.16s-1.9-1.44-3.66-1.44c-1.18,0-2.13.25-2.85.74-.72.49-1.27,1.15-1.64,1.99Z"/>
        <path d="M219.7,19.67c0-3.14.81-5.61,2.43-7.4s3.8-2.69,6.55-2.69,4.94.89,6.51,2.67c1.57,1.78,2.36,4.23,2.36,7.34s-.8,5.58-2.39,7.38c-1.6,1.8-3.78,2.71-6.55,2.71s-5.01-.89-6.57-2.67c-1.56-1.78-2.34-4.23-2.34-7.34ZM221.98,19.64c0,2.53.55,4.53,1.64,6.02s2.75,2.23,4.99,2.23,3.94-.75,5.04-2.25c1.1-1.5,1.66-3.51,1.66-6.04s-.55-4.5-1.66-5.98c-1.1-1.48-2.79-2.23-5.04-2.23s-3.9.74-4.99,2.23-1.64,3.49-1.64,6.02Z"/>
        <path d="M240.5,10.18h2.13v3.09c1.52-2.28,3.52-3.42,6-3.42.27,0,.53.01.79.04.26.03.51.06.75.11l-.26,1.99c-.25-.05-.48-.09-.7-.11s-.47-.04-.74-.04c-.86,0-1.67.17-2.43.5-.76.33-1.46.85-2.1,1.56-.44.47-.77.97-.99,1.51-.22.54-.33,1.28-.33,2.21v11.48h-2.13V10.18Z"/>
        <path d="M251.9,2.82h2.21v3.57h-2.21v-3.57ZM251.94,10.18h2.13v18.92h-2.13V10.18Z"/>
        <path d="M272,28.18v-3.35c-.71,1.25-1.63,2.22-2.76,2.91-1.13.69-2.48,1.03-4.05,1.03-1.77,0-3.25-.41-4.45-1.23-1.2-.82-2.12-1.96-2.74-3.4-.63-1.45-.94-3.09-.94-4.93,0-1.94.34-3.62,1.03-5.06.69-1.44,1.67-2.55,2.94-3.35,1.28-.8,2.78-1.2,4.53-1.2,1.35,0,2.58.28,3.68.85,1.1.56,2.02,1.48,2.76,2.76v-3.02h2.13v17.11c0,1.99-.25,3.68-.74,5.08-.49,1.4-1.33,2.46-2.52,3.18-1.19.72-2.83,1.08-4.91,1.08-2.43,0-4.33-.44-5.71-1.32-1.37-.88-2.17-2.27-2.39-4.16h2.1c.27,1.28.87,2.21,1.8,2.82s2.33.9,4.2.9c2.18,0,3.74-.55,4.66-1.66.92-1.1,1.38-2.79,1.38-5.04ZM270.53,13.34c-1.01-1.3-2.56-1.95-4.67-1.95-1.94,0-3.51.64-4.71,1.93s-1.8,3.25-1.8,5.87.59,4.6,1.79,5.85c1.19,1.25,2.66,1.88,4.4,1.88,2.13,0,3.75-.66,4.86-1.99,1.1-1.33,1.66-3.02,1.66-5.08v-1.25c0-2.21-.5-3.96-1.51-5.26Z"/>
        <path d="M277.81,2.82h2.21v3.57h-2.21v-3.57ZM277.85,10.18h2.13v18.92h-2.13V10.18Z"/>
        <path d="M283.74,10.18h2.13v3.05c.93-1.25,1.99-2.17,3.18-2.76,1.19-.59,2.47-.88,3.85-.88,2.11,0,3.69.58,4.75,1.75,1.05,1.17,1.58,2.88,1.58,5.13v12.62h-2.13v-12.22c0-1.89-.39-3.26-1.16-4.12-.77-.86-1.93-1.29-3.48-1.29-.91,0-1.77.15-2.59.46-.82.31-1.56.78-2.23,1.42-.64.59-1.09,1.17-1.36,1.75-.27.58-.4,1.42-.4,2.52v11.48h-2.13V10.18Z"/>
        <path d="M301.66,23.83c0-1.57.4-2.8,1.21-3.7.81-.9,1.93-1.54,3.37-1.93,1.43-.39,3.08-.63,4.95-.7l3.79-.15v-.81c0-1.89-.39-3.23-1.16-4.03-.77-.8-2.07-1.2-3.88-1.2-1.64,0-2.89.28-3.74.83s-1.41,1.37-1.67,2.45l-1.95-.22c.34-1.64,1.13-2.85,2.37-3.62,1.24-.77,2.93-1.16,5.06-1.16,2.55,0,4.37.59,5.46,1.77s1.64,2.93,1.64,5.26v12.48h-2.1v-2.98c-.71,1.01-1.63,1.83-2.74,2.47s-2.46.96-4.03.96c-2.01,0-3.61-.48-4.8-1.45-1.19-.97-1.79-2.39-1.79-4.25ZM303.87,23.76c0,1.25.38,2.23,1.14,2.93s1.93,1.05,3.5,1.05c1.84,0,3.38-.48,4.62-1.43,1.24-.96,1.86-2.33,1.86-4.12v-3.2l-3.61.15c-1.89.07-3.39.28-4.49.62-1.1.34-1.88.85-2.34,1.51-.45.66-.68,1.5-.68,2.5Z"/>
        <path d="M320.72,2.82h2.13v26.28h-2.13V2.82Z"/>
        <path d="M338.87,24.17c0-1.01-.29-1.8-.87-2.37-.58-.58-1.74-1.01-3.48-1.31l-2.13-.33c-2.11-.34-3.68-.91-4.71-1.69-1.03-.78-1.55-1.97-1.55-3.57s.66-2.97,1.97-3.9c1.31-.93,3.04-1.4,5.17-1.4,1.62,0,2.92.2,3.9.59s1.74.96,2.28,1.69c.54.74.94,1.61,1.21,2.61l-1.95.33c-.39-1.2-.97-2.08-1.73-2.65-.76-.56-1.98-.85-3.64-.85-1.84,0-3.16.32-3.96.96-.8.64-1.2,1.47-1.2,2.5,0,.96.3,1.7.9,2.23.6.53,1.7.93,3.29,1.2l2.39.37c2.31.39,3.93,1.01,4.88,1.84.94.83,1.42,2.09,1.42,3.75s-.62,3.01-1.86,4.01c-1.24,1-3.07,1.51-5.5,1.51-2.28,0-4.16-.46-5.63-1.38-1.47-.92-2.29-2.41-2.47-4.47h2.06c.22,1.42.83,2.46,1.84,3.11,1.01.65,2.39.98,4.16.98s3.13-.33,3.96-.98c.82-.65,1.23-1.58,1.23-2.78Z"/>
      </g>
    </svg>
  );
}

async function listPricingImagesForPrefix(bucket: string, prefix: string) {
  const result = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    }),
  );

  return (result.Contents ?? [])
    .map((object) => object.Key)
    .filter(
      (key): key is string =>
        Boolean(key) && PRICING_IMAGE_EXTENSIONS.test(key as string),
    );
}

async function getPricingHeroImages() {
  const bucket =
    process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET_NAME ||
    "";
  const publicBaseUrl = (
    process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");

  if (!bucket || !publicBaseUrl) return [DEFAULT_PRICING_HERO_IMAGE];

  try {
    let keys = await listPricingImagesForPrefix(bucket, "images/pricing/");
    if (keys.length === 0) {
      keys = await listPricingImagesForPrefix(bucket, "pricing/");
    }

    if (keys.length === 0) return [DEFAULT_PRICING_HERO_IMAGE];

    return keys
      .sort((a, b) => a.localeCompare(b))
      .map(
        (key) =>
          `${publicBaseUrl}/${key
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/")}`,
      );
  } catch (error) {
    console.error("Failed to load pricing hero images from R2:", error);
    return [DEFAULT_PRICING_HERO_IMAGE];
  }
}

const plans = [
  {
    name: "Starter",
    kicker: "Solo creators",
    price: "$15",
    priceDetail: "CAD / month",
    description:
      "For solo filmmakers licensing music and SFX for their own client work.",
    features: [
      "Full music + SFX catalogue",
      "Royalty-free commercial use",
      "Projects, playlists + favorites",
      "Desktop sync workflow",
    ],
  },
  {
    name: "Studio",
    kicker: "Active filmmakers",
    price: "$39",
    priceDetail: "CAD / month",
    description:
      "For active filmmakers and small teams handling more projects and client work.",
    features: [
      "Expanded project coverage",
      "Small-team commercial licensing",
      "Full music + SFX catalogue",
      "Desktop sync workflow",
    ],
  },
  {
    name: "Enterprise",
    kicker: "Larger teams",
    price: "Custom",
    priceDetail: "",
    description:
      "For agencies, publishers, and larger teams with high-volume or custom licensing needs.",
    features: [
      "Higher-volume licensing",
      "Custom usage terms",
      "Larger team coverage",
      "Direct licensing support",
    ],
  },
] as const;

const planComparisonRows = [
  {
    label: "Full music catalogue",
    starter: true,
    studio: true,
    enterprise: true,
  },
  {
    label: "Full SFX catalogue",
    starter: true,
    studio: true,
    enterprise: true,
  },
  {
    label: "Royalty-free commercial use",
    starter: true,
    studio: true,
    enterprise: true,
  },
  {
    label: "Projects, playlists + favorites",
    starter: true,
    studio: true,
    enterprise: true,
  },
  {
    label: "Desktop sync workflow",
    starter: true,
    studio: true,
    enterprise: true,
  },
  {
    label: "Expanded project coverage",
    starter: false,
    studio: true,
    enterprise: true,
  },
  {
    label: "Higher-volume licensing",
    starter: false,
    studio: false,
    enterprise: true,
  },
  {
    label: "Custom usage terms",
    starter: false,
    studio: false,
    enterprise: true,
  },
  {
    label: "Direct support for complex projects",
    starter: false,
    studio: false,
    enterprise: true,
  },
] as const;

const includedFeatures = [
  {
    number: "01",
    title: "Human-curated music",
    copy: "A film-forward catalogue shaped around picture, pacing, emotion, and story rather than endless volume.",
  },
  {
    number: "02",
    title: "Sound effects",
    copy: "Music and SFX live in the same workflow, so the search for audio does not become a second job.",
  },
  {
    number: "03",
    title: "Search + organization",
    copy: "Save tracks into projects and playlists, keep favorites close, and get back to the right audio quickly.",
  },
  {
    number: "04",
    title: "Desktop workflow",
    copy: "Keep selected audio close to the edit with Audioflume's connected desktop workflow and local project organization.",
  },
] as const;

function PlanStatus({ included }: { included: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{
        color: included
          ? "var(--text-primary)"
          : "color-mix(in srgb, var(--text-primary) 22%, transparent)",
      }}
      aria-label={included ? "Included" : "Not included"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M6.8 10.1 9 12.3l4.4-4.6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default async function PricingPage() {
  const [{ userId }, pricingHeroImages, songs] = await Promise.all([
    auth(),
    getPricingHeroImages(),
    getSongs().catch(() => []),
  ]);
  const membershipHref = userId ? "/account/membership" : "/sign-up";
  const membershipLabel = userId ? "Manage membership" : "Get Lifetime Access";
  const enterpriseImage = pricingHeroImages[2] ?? pricingHeroImages[0];
  const pricingPlanImages = pricingHeroImages.filter(
    (image) =>
      !image.includes("andrey-strizhkov-sehwu2FbcHg-unsplash-web.jpg"),
  );
  const lifetimeOriginalSongs = songs
    .filter(
      (song) =>
        Boolean(song.audioUrl) &&
        song.artist.trim().localeCompare("Audioflume", undefined, {
          sensitivity: "base",
        }) === 0,
    )
    .slice(0, 8);

  return (
    <main className="audioflume-pricing-page-root">
      <section className="audioflume-pricing-plans-section">
        <div className="audioflume-pricing-overview">
          <div className="audioflume-pricing-overview-heading">
            <span className="audioflume-pricing-overview-eyebrow">
              Choose your plan
            </span>
            <h1>Plans &amp; Pricing</h1>
          </div>
          <p>
            Straightforward access to Audioflume&apos;s curated music and SFX
            catalogue, with plans for solo filmmakers, active studios, and
            larger creative teams.
          </p>
        </div>

        <div className="audioflume-pricing-offers-grid">
          <div className="audioflume-pricing-plan-grid">
          {plans.map((plan, index) => {
            const isEnterprise = plan.name === "Enterprise";
            const planActionLabel = userId
              ? "Manage membership"
              : `Choose ${plan.name}`;
            const planImage =
              plan.name === "Enterprise"
                ? "https://images.filmwave.io/images/home/thomas-kinto-qYqbehR-wSI-unsplash.jpg"
                : pricingPlanImages[index] ??
                  pricingPlanImages[0] ??
                  DEFAULT_PRICING_HERO_IMAGE;

            return (
              <article key={plan.name} className="audioflume-pricing-plan">
                <div className="audioflume-pricing-plan-banner">
                  <Image
                    src={planImage}
                    alt=""
                    fill
                    sizes="(max-width: 1168px) 50vw, 33vw"
                    className="audioflume-pricing-plan-banner-background"
                    aria-hidden="true"
                  />
                  <span
                    className="audioflume-pricing-plan-banner-overlay"
                    aria-hidden="true"
                  />
                  <div className="audioflume-pricing-plan-meta">
                    <p className="audioflume-pricing-plan-kicker">{plan.kicker}</p>
                  </div>
                  <h3 className="audioflume-pricing-plan-name">{plan.name}</h3>
                </div>

                <div className="audioflume-pricing-plan-body">
                  <p className="audioflume-pricing-plan-description">
                    {plan.description}
                  </p>

                  <div className="audioflume-pricing-plan-price">
                    <strong>{plan.price}</strong>
                    {plan.priceDetail ? <span>{plan.priceDetail}</span> : null}
                  </div>

                  <div className="audioflume-pricing-plan-action-row">
                  {isEnterprise ? (
                    <a
                      href="mailto:hello@filmwave.io?subject=Audioflume%20Enterprise"
                      className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
                      style={{ fontSize: "14px", fontWeight: 400 }}
                    >
                      Contact us
                    </a>
                  ) : (
                    <Link
                      href={membershipHref}
                      className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
                      style={{ fontSize: "14px", fontWeight: 400 }}
                    >
                      {planActionLabel}
                    </Link>
                  )}
                </div>

                  <ul className="audioflume-pricing-plan-features">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
          </div>

          <section className="audioflume-pricing-lifetime-section">
          <div className="audioflume-pricing-lifetime">
            <Image
              src="https://images.filmwave.io/images/pricing/andrey-strizhkov-sehwu2FbcHg-unsplash-web.jpg"
              alt=""
              fill
              sizes="100vw"
              className="audioflume-pricing-lifetime-background"
              aria-hidden="true"
            />
            <span
              className="audioflume-pricing-lifetime-overlay"
              aria-hidden="true"
            />

            <div className="audioflume-pricing-lifetime-brand">
              <AudioflumeOriginalsLogo />
            </div>

            <h2 className="audioflume-pricing-lifetime-heading">
              Lifetime Access Offer
            </h2>

            <p className="audioflume-pricing-lifetime-meta">
              Lifetime access&nbsp;&nbsp;|&nbsp;&nbsp;commercial work&nbsp;&nbsp;|&nbsp;&nbsp;clients up to 100 employees.
            </p>

            <p className="audioflume-pricing-lifetime-description">
              Lifetime access to in-house original music, licensed for commercial work and clients up to 100 employees.
            </p>

            <div className="audioflume-pricing-lifetime-pricing">
              <div className="audioflume-pricing-lifetime-price-group is-regular">
                <span className="audioflume-pricing-lifetime-badge">Regular price</span>
                <div className="audioflume-pricing-plan-price">
                  <strong>$199</strong>
                </div>
              </div>
              <div className="audioflume-pricing-lifetime-price-group">
                <span className="audioflume-pricing-lifetime-badge is-light">
                  Limited time offer
                </span>
                <div className="audioflume-pricing-plan-price">
                  <strong>$99</strong>
                  <span>One time payment</span>
                </div>
              </div>
            </div>

            <div className="audioflume-pricing-lifetime-action">
              <Link
                href={membershipHref}
                className={`${playlistDetailPrimaryActionButtonClass} audioflume-public-action-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
                style={{ fontSize: "14px", fontWeight: 400 }}
              >
                {membershipLabel}
              </Link>
            </div>
          </div>

          {lifetimeOriginalSongs.length > 0 ? (
            <div className="audioflume-pricing-originals-shelf">
              <div
                className="audioflume-pricing-originals-shelf-background"
                aria-hidden="true"
              />
              <div
                className="audioflume-pricing-originals-shelf-overlay"
                aria-hidden="true"
              />
              <PricingOriginalsShelf songs={lifetimeOriginalSongs} />
            </div>
          ) : null}
          </section>
        </div>

        <section className="audioflume-pricing-comparison-section">
          <div className="audioflume-pricing-comparison-heading">
            <span>Plan Comparison</span>
            <Link href="/artists/licensing">View licensing details</Link>
          </div>
          <div className="audioflume-pricing-comparison-block">
            <table className="audioflume-pricing-comparison-table">
              <thead>
                <tr className="border-b-[1.25px] border-[var(--border)]">
                  <th className="audioflume-pricing-comparison-label-column" scope="col">
                    <p className="audioflume-pricing-section-eyebrow mb-1">
                      Flexible Licensing Options
                    </p>
                    <h2 className="audioflume-pricing-comparison-title">
                      Compare these plans.
                    </h2>
                  </th>
                  {plans.map((plan, index) => (
                    <th
                      key={plan.name}
                      className={`audioflume-pricing-comparison-plan-column${index > 0 ? " border-l-[1.25px] border-[var(--border)]" : ""}`}
                      scope="col"
                    >
                      <p className="audioflume-pricing-plan-name">{plan.name}</p>
                      <div className="mt-3 audioflume-pricing-include-title">
                        {plan.price}
                        {plan.priceDetail ? ` ${plan.priceDetail}` : ""}
                      </div>
                      <p className="audioflume-pricing-include-copy mx-auto mt-2 max-w-[190px]">
                        {plan.kicker}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planComparisonRows.map((row) => (
                  <tr key={row.label} className="border-b-[1.25px] border-[var(--border)] last:border-b-0">
                    <th className="audioflume-pricing-comparison-row-label" scope="row">
                      <div className="audioflume-pricing-include-title">
                        {row.label}
                      </div>
                    </th>
                    <td className="audioflume-pricing-comparison-status-cell">
                      <PlanStatus included={row.starter} />
                    </td>
                    <td className="audioflume-pricing-comparison-status-cell border-l-[1.25px] border-[var(--border)]">
                      <PlanStatus included={row.studio} />
                    </td>
                    <td className="audioflume-pricing-comparison-status-cell border-l-[1.25px] border-[var(--border)]">
                      <PlanStatus included={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="group/pricing-testimonials relative overflow-hidden bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
        <div
          className="pointer-events-none absolute left-8 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition group-hover/pricing-testimonials:opacity-100 sm:flex"
          aria-hidden="true"
        >
          <ChevronLeftIcon size={18} />
        </div>

        <div
          className="pointer-events-none absolute right-8 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition group-hover/pricing-testimonials:opacity-100 sm:flex"
          aria-hidden="true"
        >
          <ChevronRightIcon size={18} />
        </div>

        <div className="mx-auto w-[calc(100%-var(--filmwave-editorial-inset)-var(--filmwave-editorial-inset))] max-w-[var(--filmwave-editorial-max-width)] py-[clamp(84px,8vw,126px)]">
          <div className="mx-auto max-w-[900px] text-left">
            <p className="m-0 font-[family-name:var(--font-aktiv-grotesk)] text-[14.5px] font-light uppercase leading-none tracking-[0.04em] text-[var(--text-muted)]">
              Testimonials
            </p>
            <blockquote className="mt-7 max-w-none font-[family-name:var(--font-aktiv-grotesk)] text-[clamp(16px,1.45vw,20px)] font-light leading-[1.35] tracking-normal">
              “Add a longer filmmaker testimonial here that speaks to the quality of the music, the speed of finding the right track, and how Audioflume helps keep the editing process focused, creative, and moving without unnecessary friction.”
            </blockquote>
            <div className="mt-7">
              <div className="text-[16px] font-medium leading-[1.2]">Filmmaker name</div>
              <div className="mt-1 text-[13px] font-light leading-[1.35] text-[var(--text-secondary)]">
                Role / Studio
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="audioflume-pricing-includes-section">
        <div>
          <p className="audioflume-home-eyebrow">Built into Audioflume</p>
          <h2 className="audioflume-pricing-includes-heading">
            Less time managing audio. More time making the edit.
          </h2>
        </div>

        <div className="audioflume-pricing-includes-list">
          {includedFeatures.map((feature) => (
            <div key={feature.number} className="audioflume-pricing-include-row">
              <div className="audioflume-pricing-include-number">
                {feature.number}
              </div>
              <div className="audioflume-pricing-include-title">
                {feature.title}
              </div>
              <p className="audioflume-pricing-include-copy">{feature.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="audioflume-pricing-enterprise-band">
        <div className="audioflume-pricing-enterprise-section">
          <div className="audioflume-pricing-enterprise-heading">
            <div className="audioflume-pricing-enterprise-media" aria-hidden="true">
              <Image
                src={enterpriseImage}
                alt=""
                fill
                sizes="(max-width: 760px) 76vw, 38vw"
                className="audioflume-pricing-enterprise-image"
              />
            </div>
            <p className="audioflume-pricing-section-eyebrow">Enterprise</p>
            <h2 className="audioflume-pricing-enterprise-title">
              Bigger team. Different requirements.
            </h2>
          </div>

          <div className="audioflume-pricing-enterprise-copy">
            <p>
              For agencies, publishers, brands, and larger teams, licensing can be shaped around volume, usage, and the way the organization actually works.
            </p>
            <a
              href="mailto:hello@filmwave.io?subject=Audioflume%20Enterprise"
              className="inline-flex h-[44px] min-w-[240px] items-center justify-center bg-white px-10 text-[14px] font-normal text-[#111111] transition hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none"
            >
              Talk about enterprise
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
