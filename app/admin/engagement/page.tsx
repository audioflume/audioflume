"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AlertIcon from "@/components/icons/AlertIcon";
import CheckMarkIcon from "@/components/icons/CheckMarkIcon";
import DownloadArrowIcon from "@/components/icons/DownloadArrowIcon";
import FailedIcon from "@/components/icons/FailedIcon";
import FunnelIcon from "@/components/icons/FunnelIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import UserIcon from "@/components/icons/UserIcon";
import { pillButtonClass } from "@/components/uiClasses";
import { usePlayer } from "@/context/PlayerContext";

type RangeKey = "day" | "week" | "month" | "year" | "all";

type StatusTone = "success" | "warning" | "error";

type MetricCard = {
  label: string;
  value: string;
  delta: string;
  detail: string;
};

type SongRow = {
  title: string;
  artist: string;
  coverArt: string;
  plays: number;
  downloads: number;
  conversion: string;
};

type ActivityPoint = {
  label: string;
  value: number;
};

type RangeDataset = {
  metrics: MetricCard[];
  activity: ActivityPoint[];
  funnel: {
    plays: string;
    downloads: string;
    subscribers: string;
  };
  songs: SongRow[];
  trafficSources: { label: string; value: string }[];
  topGenres: { label: string; value: string }[];
  topSearchTerms: { label: string; value: string }[];
};

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "all", label: "All Time" },
];

const STATUS_COLORS = {
  success: "var(--status-success, #48b571)",
  warning: "var(--status-warning, #d9a441)",
  error: "var(--status-error, #dc584f)",
};

const STATUS_BACKGROUNDS = {
  success: "var(--status-success-soft, rgba(72, 181, 113, 0.12))",
  warning: "var(--status-warning-soft, rgba(217, 164, 65, 0.12))",
  error: "var(--status-error-soft, rgba(220, 88, 79, 0.12))",
};

const DATASETS: Record<RangeKey, RangeDataset> = {
  day: {
    metrics: [
      {
        label: "Downloads",
        value: "24",
        delta: "+9%",
        detail: "Music downloads",
      },
      {
        label: "Song Plays",
        value: "146",
        delta: "+12%",
        detail: "Playback activity",
      },
      {
        label: "Subscribers",
        value: "3",
        delta: "+50%",
        detail: "New paid users",
      },
      {
        label: "Conversion",
        value: "12.5%",
        delta: "+2%",
        detail: "Subscribers / downloads",
      },
    ],
    activity: [
      { label: "12a", value: 18 },
      { label: "4a", value: 14 },
      { label: "8a", value: 21 },
      { label: "12p", value: 31 },
      { label: "4p", value: 36 },
      { label: "8p", value: 28 },
    ],
    funnel: {
      plays: "146",
      downloads: "24",
      subscribers: "3",
    },
    songs: [
      {
        title: "Northern Tides",
        artist: "Dan Hauser",
        coverArt:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=120&q=80",
        plays: 42,
        downloads: 6,
        conversion: "14.3%",
      },
      {
        title: "Coyote on the Road",
        artist: "Paisley Wilson",
        coverArt:
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=120&q=80",
        plays: 35,
        downloads: 5,
        conversion: "14.3%",
      },
      {
        title: "Ember Drift",
        artist: "Lumen Fade",
        coverArt:
          "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=120&q=80",
        plays: 29,
        downloads: 4,
        conversion: "13.8%",
      },
      {
        title: "Veiled Endless",
        artist: "Sable",
        coverArt:
          "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=120&q=80",
        plays: 22,
        downloads: 3,
        conversion: "13.6%",
      },
    ],
    trafficSources: [
      { label: "Direct", value: "44%" },
      { label: "Instagram", value: "28%" },
      { label: "Search", value: "18%" },
      { label: "Referral", value: "10%" },
    ],
    topGenres: [
      { label: "Cinematic", value: "31%" },
      { label: "Ambient", value: "24%" },
      { label: "Indie", value: "18%" },
      { label: "Documentary", value: "12%" },
    ],
    topSearchTerms: [
      { label: "cinematic build", value: "18%" },
      { label: "ambient piano", value: "15%" },
      { label: "documentary underscore", value: "11%" },
      { label: "emotional indie", value: "9%" },
    ],
  },
  week: {
    metrics: [
      {
        label: "Downloads",
        value: "168",
        delta: "+14%",
        detail: "Music downloads",
      },
      {
        label: "Song Plays",
        value: "982",
        delta: "+19%",
        detail: "Playback activity",
      },
      {
        label: "Subscribers",
        value: "11",
        delta: "+10%",
        detail: "New paid users",
      },
      {
        label: "Conversion",
        value: "10.8%",
        delta: "+3%",
        detail: "Subscribers / downloads",
      },
    ],
    activity: [
      { label: "Mon", value: 86 },
      { label: "Tue", value: 94 },
      { label: "Wed", value: 112 },
      { label: "Thu", value: 126 },
      { label: "Fri", value: 149 },
      { label: "Sat", value: 132 },
      { label: "Sun", value: 118 },
    ],
    funnel: {
      plays: "982",
      downloads: "168",
      subscribers: "11",
    },
    songs: [
      {
        title: "Northern Tides",
        artist: "Dan Hauser",
        coverArt:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=120&q=80",
        plays: 164,
        downloads: 22,
        conversion: "13.4%",
      },
      {
        title: "Veiled Endless",
        artist: "Sable",
        coverArt:
          "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=120&q=80",
        plays: 150,
        downloads: 19,
        conversion: "12.7%",
      },
      {
        title: "Coyote on the Road",
        artist: "Paisley Wilson",
        coverArt:
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=120&q=80",
        plays: 143,
        downloads: 18,
        conversion: "12.6%",
      },
      {
        title: "Ember Drift",
        artist: "Lumen Fade",
        coverArt:
          "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=120&q=80",
        plays: 128,
        downloads: 16,
        conversion: "12.5%",
      },
    ],
    trafficSources: [
      { label: "Direct", value: "39%" },
      { label: "Instagram", value: "25%" },
      { label: "Search", value: "22%" },
      { label: "Referral", value: "14%" },
    ],
    topGenres: [
      { label: "Cinematic", value: "33%" },
      { label: "Ambient", value: "21%" },
      { label: "Indie", value: "17%" },
      { label: "Corporate", value: "14%" },
    ],
    topSearchTerms: [
      { label: "cinematic trailer", value: "16%" },
      { label: "ambient background", value: "14%" },
      { label: "uplifting indie", value: "10%" },
      { label: "documentary music", value: "9%" },
    ],
  },
  month: {
    metrics: [
      {
        label: "Downloads",
        value: "527",
        delta: "+18%",
        detail: "Music downloads",
      },
      {
        label: "Song Plays",
        value: "2.4k",
        delta: "+24%",
        detail: "Playback activity",
      },
      {
        label: "Subscribers",
        value: "56",
        delta: "+11%",
        detail: "New paid users",
      },
      {
        label: "Conversion",
        value: "11%",
        delta: "+4%",
        detail: "Subscribers / downloads",
      },
    ],
    activity: [
      { label: "W1", value: 92 },
      { label: "W2", value: 127 },
      { label: "W3", value: 141 },
      { label: "W4", value: 168 },
    ],
    funnel: {
      plays: "2.4k",
      downloads: "527",
      subscribers: "56",
    },
    songs: [
      {
        title: "Afterglow Drift",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=120&q=80",
        plays: 842,
        downloads: 96,
        conversion: "11.4%",
      },
      {
        title: "Northline",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=120&q=80",
        plays: 716,
        downloads: 83,
        conversion: "11.6%",
      },
      {
        title: "Soft Cut",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=120&q=80",
        plays: 688,
        downloads: 72,
        conversion: "10.5%",
      },
      {
        title: "Signal Bloom",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=120&q=80",
        plays: 601,
        downloads: 58,
        conversion: "9.7%",
      },
      {
        title: "Golden Pull",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1511300636408-a63a89df3482?auto=format&fit=crop&w=120&q=80",
        plays: 544,
        downloads: 49,
        conversion: "9.0%",
      },
    ],
    trafficSources: [
      { label: "Search", value: "42%" },
      { label: "Direct", value: "26%" },
      { label: "Instagram", value: "19%" },
      { label: "Referral", value: "13%" },
    ],
    topGenres: [
      { label: "Cinematic", value: "32%" },
      { label: "Ambient", value: "23%" },
      { label: "Indie", value: "16%" },
      { label: "Documentary", value: "13%" },
    ],
    topSearchTerms: [
      { label: "cinematic build", value: "46%" },
      { label: "ambient underscore", value: "21%" },
      { label: "documentary piano", value: "12%" },
      { label: "uplifting corporate", value: "8%" },
    ],
  },
  year: {
    metrics: [
      {
        label: "Downloads",
        value: "5.9k",
        delta: "+31%",
        detail: "Music downloads",
      },
      {
        label: "Song Plays",
        value: "28.6k",
        delta: "+37%",
        detail: "Playback activity",
      },
      {
        label: "Subscribers",
        value: "412",
        delta: "+28%",
        detail: "New paid users",
      },
      {
        label: "Conversion",
        value: "7.0%",
        delta: "+1%",
        detail: "Subscribers / downloads",
      },
    ],
    activity: [
      { label: "Jan", value: 320 },
      { label: "Mar", value: 390 },
      { label: "May", value: 442 },
      { label: "Jul", value: 486 },
      { label: "Sep", value: 530 },
      { label: "Nov", value: 612 },
    ],
    funnel: {
      plays: "28.6k",
      downloads: "5.9k",
      subscribers: "412",
    },
    songs: [
      {
        title: "Afterglow Drift",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=120&q=80",
        plays: 6240,
        downloads: 702,
        conversion: "11.3%",
      },
      {
        title: "Signal Bloom",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=120&q=80",
        plays: 5812,
        downloads: 610,
        conversion: "10.5%",
      },
      {
        title: "Golden Pull",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1511300636408-a63a89df3482?auto=format&fit=crop&w=120&q=80",
        plays: 5360,
        downloads: 554,
        conversion: "10.3%",
      },
      {
        title: "Northline",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=120&q=80",
        plays: 4918,
        downloads: 501,
        conversion: "10.2%",
      },
      {
        title: "Soft Cut",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=120&q=80",
        plays: 4702,
        downloads: 464,
        conversion: "9.9%",
      },
    ],
    trafficSources: [
      { label: "Search", value: "38%" },
      { label: "Direct", value: "24%" },
      { label: "Instagram", value: "20%" },
      { label: "Referral", value: "18%" },
    ],
    topGenres: [
      { label: "Cinematic", value: "35%" },
      { label: "Ambient", value: "20%" },
      { label: "Indie", value: "15%" },
      { label: "Corporate", value: "13%" },
    ],
    topSearchTerms: [
      { label: "cinematic score", value: "31%" },
      { label: "ambient background", value: "18%" },
      { label: "documentary music", value: "13%" },
      { label: "emotional piano", value: "10%" },
    ],
  },
  all: {
    metrics: [
      {
        label: "Downloads",
        value: "12.2k",
        delta: "+100%",
        detail: "Lifetime downloads",
      },
      {
        label: "Song Plays",
        value: "61.4k",
        delta: "+100%",
        detail: "Lifetime playback",
      },
      {
        label: "Subscribers",
        value: "1.1k",
        delta: "+100%",
        detail: "Total subscribers",
      },
      {
        label: "Conversion",
        value: "9.2%",
        delta: "+100%",
        detail: "Subscribers / downloads",
      },
    ],
    activity: [
      { label: "2022", value: 420 },
      { label: "2023", value: 610 },
      { label: "2024", value: 870 },
      { label: "2025", value: 1120 },
      { label: "2026", value: 1450 },
    ],
    funnel: {
      plays: "61.4k",
      downloads: "12.2k",
      subscribers: "1.1k",
    },
    songs: [
      {
        title: "Afterglow Drift",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=120&q=80",
        plays: 12480,
        downloads: 1488,
        conversion: "11.9%",
      },
      {
        title: "Northline",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=120&q=80",
        plays: 11136,
        downloads: 1212,
        conversion: "10.9%",
      },
      {
        title: "Signal Bloom",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=120&q=80",
        plays: 10882,
        downloads: 1167,
        conversion: "10.7%",
      },
      {
        title: "Golden Pull",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1511300636408-a63a89df3482?auto=format&fit=crop&w=120&q=80",
        plays: 10440,
        downloads: 1080,
        conversion: "10.3%",
      },
      {
        title: "Soft Cut",
        artist: "Filmwave",
        coverArt:
          "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=120&q=80",
        plays: 9924,
        downloads: 992,
        conversion: "10.0%",
      },
    ],
    trafficSources: [
      { label: "Search", value: "36%" },
      { label: "Direct", value: "25%" },
      { label: "Instagram", value: "22%" },
      { label: "Referral", value: "17%" },
    ],
    topGenres: [
      { label: "Cinematic", value: "34%" },
      { label: "Ambient", value: "21%" },
      { label: "Indie", value: "14%" },
      { label: "Documentary", value: "12%" },
    ],
    topSearchTerms: [
      { label: "cinematic music", value: "27%" },
      { label: "ambient background", value: "19%" },
      { label: "documentary underscore", value: "14%" },
      { label: "emotional piano", value: "11%" },
    ],
  },
};

function getPercentValue(value: string) {
  const parsed = Number(value.replace("%", "").trim());

  return Number.isFinite(parsed) ? parsed : 0;
}

function SeverityIcon({ status }: { status: StatusTone }) {
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-md"
      style={{
        backgroundColor: STATUS_BACKGROUNDS[status],
        color: STATUS_COLORS[status],
      }}
    >
      {status === "success" && <CheckMarkIcon />}
      {status === "warning" && <AlertIcon />}
      {status === "error" && <FailedIcon />}
    </div>
  );
}

function LineChart({
  data,
  accentLabel,
}: {
  data: ActivityPoint[];
  accentLabel: string;
}) {
  const width = 1000;
  const height = 176;
  const top = 16;
  const right = 14;
  const bottom = 30;
  const left = 42;

  const values = data.map((point) => point.value);
  const maxValue = Math.max(...values);
  const minValue = 0;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const points = data.map((point, index) => {
    const x = left + index * stepX;
    const y =
      top +
      plotHeight -
      ((point.value - minValue) / (maxValue - minValue || 1)) * plotHeight;

    return {
      ...point,
      x,
      y,
      xPercent: (x / width) * 100,
      yPercent: (y / height) * 100,
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    top + plotHeight
  } L ${points[0].x} ${top + plotHeight} Z`;

  const yTicks = 4;
  const yValues = Array.from({ length: yTicks + 1 }, (_, index) => {
    const ratio = index / yTicks;
    const y = top + (plotHeight / yTicks) * index;
    const value = Math.round(maxValue - ratio * maxValue);

    return {
      y,
      value,
      yPercent: (y / height) * 100,
    };
  });

  return (
    <div className="flex h-full min-h-[277px] flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Activity
        </div>

        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <span className="block h-[2px] w-7 rounded-full bg-[var(--chart-line)]" />
            <span>{accentLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="block h-px w-7 rounded-full bg-[var(--chart-grid)]" />
            <span>Grid scale</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 px-4 py-3">
        <div className="relative h-full min-h-[200px] w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {yValues.map((tick, index) => (
              <line
                key={`horizontal-${index}`}
                x1={left}
                y1={tick.y}
                x2={width - right}
                y2={tick.y}
                stroke="var(--chart-grid)"
                strokeWidth="1"
              />
            ))}

            {points.map((point) => (
              <line
                key={`grid-${point.label}`}
                x1={point.x}
                y1={top}
                x2={point.x}
                y2={top + plotHeight}
                stroke="var(--chart-grid-subtle)"
                strokeWidth="1"
              />
            ))}

            <path d={areaPath} fill="var(--chart-area)" />

            <path
              d={linePath}
              fill="none"
              stroke="var(--chart-line)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {yValues.map((tick) => (
            <div
              key={`y-label-${tick.value}`}
              className="pointer-events-none absolute -translate-y-1/2 text-right text-[10px] font-medium text-[var(--text-muted)]"
              style={{
                left: `calc(${(left / width) * 100}% - 24px)`,
                top: `${tick.yPercent}%`,
                width: "20px",
              }}
            >
              {tick.value}
            </div>
          ))}

          {points.map((point) => (
            <div
              key={`point-${point.label}`}
              className="pointer-events-none absolute h-2 w-2 rounded-full border-2 bg-[var(--bg-secondary)]"
              style={{
                left: `${point.xPercent}%`,
                top: `${point.yPercent}%`,
                borderColor: "var(--chart-line)",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}

          {points.map((point) => (
            <div
              key={`x-label-${point.label}`}
              className="pointer-events-none absolute -translate-x-1/2 text-[10px] font-medium text-[var(--text-muted)]"
              style={{
                left: `${point.xPercent}%`,
                bottom: "0px",
              }}
            >
              {point.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCardBlock({
  metric,
  index,
}: {
  metric: MetricCard;
  index: number;
}) {
  const Icon =
    index === 0
      ? DownloadArrowIcon
      : index === 1
        ? PlayIconSmall
        : index === 2
          ? UserIcon
          : FunnelIcon;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-start justify-between px-4 pt-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {metric.label}
        </div>

        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
          <Icon size={13} />
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="mt-2 text-[30px] leading-none tracking-[-0.04em] text-[var(--text-primary)]">
          {metric.value}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-[var(--bg-tertiary)] px-2.5 text-[11px] font-medium text-[var(--text-primary)]">
            {metric.delta}
          </span>

          <span className="text-[11px] text-[var(--text-secondary)]">
            vs previous
          </span>
        </div>

        <div className="mt-2 text-xs text-[var(--text-secondary)]">
          {metric.detail}
        </div>
      </div>
    </div>
  );
}

function CompactListCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-9 items-center border-b border-[var(--border)] px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {title}
      </div>

      <div className="px-4 py-2">
        {items.map((item) => {
          const percent = getPercentValue(item.value);

          return (
            <div key={item.label} className="py-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-[var(--text-secondary)]">
                  {item.label}
                </span>
                <span className="text-[var(--text-primary)]">{item.value}</span>
              </div>

              <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                <div
                  className="h-full rounded-full bg-[var(--chart-line)] transition-all"
                  style={{
                    width: `${Math.min(Math.max(percent, 0), 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConversionFunnelCard({ funnel }: { funnel: RangeDataset["funnel"] }) {
  return (
    <div className="flex h-full min-h-[277px] flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Conversion funnel
        </div>

        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
          <FunnelIcon />
        </div>
      </div>

      <div className="grid flex-1 content-start gap-2 px-4 py-3">
        <div className="flex h-10 items-center justify-between rounded-lg bg-[var(--bg-tertiary)] px-3">
          <span className="text-xs text-[var(--text-secondary)]">
            Song Plays
          </span>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {funnel.plays}
          </span>
        </div>

        <div className="flex h-10 items-center justify-between rounded-lg bg-[var(--bg-tertiary)] px-3">
          <span className="text-xs text-[var(--text-secondary)]">
            Downloads
          </span>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {funnel.downloads}
          </span>
        </div>

        <div className="flex h-10 items-center justify-between rounded-lg bg-[var(--bg-tertiary)] px-3">
          <span className="text-xs text-[var(--text-secondary)]">
            Subscribers
          </span>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {funnel.subscribers}
          </span>
        </div>
      </div>
    </div>
  );
}

function NeedsAttentionCard() {
  const status: StatusTone = "warning";

  return (
    <div className="flex h-full min-h-[282px] flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          Needs attention
        </div>

        <SeverityIcon status={status} />
      </div>

      <div className="flex-1 px-4 py-3 text-xs leading-5 text-[var(--text-secondary)]">
        Six songs have strong playback but lower-than-average download
        conversion. Review metadata, preview points, and edit-point markers.
      </div>
    </div>
  );
}

function TopPerformingSongsCard({ songs }: { songs: SongRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-[58px] items-center justify-between border-b border-[var(--border)] px-4">
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Top Performing Songs
          </h2>

          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
            Strongest play and download activity.
          </p>
        </div>

        <Link
          href="/admin/music-library"
          className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          View Library
        </Link>
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <div className="min-w-[700px]">
          <div className="grid h-8 grid-cols-[minmax(230px,1.7fr)_minmax(120px,1fr)_80px_100px_110px] items-center gap-3 border-b border-[var(--border)] px-4 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            <div>Song</div>
            <div>Artist</div>
            <div>Plays</div>
            <div>Downloads</div>
            <div>Rate</div>
          </div>

          {songs.map((song, index) => (
            <div
              key={song.title}
              className="grid min-h-[44px] grid-cols-[minmax(230px,1.7fr)_minmax(120px,1fr)_80px_100px_110px] items-center gap-3 px-4 text-xs"
              style={{
                borderBottom:
                  index === songs.length - 1
                    ? "none"
                    : "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="h-7 w-7 overflow-hidden rounded bg-[var(--bg-tertiary)]">
                  <img
                    src={song.coverArt}
                    alt={song.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="truncate font-medium text-[var(--text-primary)]">
                    {song.title}
                  </div>
                </div>
              </div>

              <div className="truncate text-[var(--text-secondary)]">
                {song.artist}
              </div>
              <div className="text-[var(--text-secondary)]">{song.plays}</div>
              <div className="text-[var(--text-secondary)]">
                {song.downloads}
              </div>
              <div className="text-[var(--text-secondary)]">
                {song.conversion}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminEngagementPage() {
  const [range, setRange] = useState<RangeKey>("month");
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;

  const data = useMemo(() => DATASETS[range], [range]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />

      <style>{`
        :root {
          --chart-line: var(--text-primary);
          --chart-area: color-mix(in srgb, var(--text-primary) 10%, transparent);
          --chart-grid: color-mix(in srgb, var(--text-primary) 10%, transparent);
          --chart-grid-subtle: color-mix(in srgb, var(--text-primary) 6%, transparent);
        }
      `}</style>

      <section className="min-h-screen">
        <div className="flex items-end justify-between gap-4 px-8 pt-14 pb-8">
          <div>
            <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
              Engagement Overview
            </h1>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Dense analytics for platform activity, conversion, song
              performance, and discovery behaviour.
            </p>
          </div>

          <div className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--bg-tertiary)] p-1">
            {RANGE_OPTIONS.map((option) => {
              const active = option.key === range;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRange(option.key)}
                  className={`${pillButtonClass} h-7 rounded-full px-3 ${
                    active
                      ? "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="px-8"
          style={{
            paddingBottom: playerVisible ? "104px" : "32px",
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.metrics.map((metric, index) => (
              <MetricCardBlock
                key={metric.label}
                metric={metric}
                index={index}
              />
            ))}
          </div>

          <div className="mt-3 grid items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
            <LineChart
              data={data.activity}
              accentLabel={data.metrics[0].label}
            />
            <ConversionFunnelCard funnel={data.funnel} />
          </div>

          <div className="mt-3 grid items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
            <TopPerformingSongsCard songs={data.songs} />
            <NeedsAttentionCard />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <CompactListCard
              title="Traffic Sources"
              items={data.trafficSources}
            />
            <CompactListCard title="Top Genres" items={data.topGenres} />
            <CompactListCard
              title="Top Search Terms"
              items={data.topSearchTerms}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
