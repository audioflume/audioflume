"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AdminContentPage from "@/components/admin/AdminContentPage";
import { usePlayer } from "@/context/PlayerContext";

type RangeKey = "day" | "week" | "month" | "year" | "all";

type Metric = {
  label: string;
  value: string;
  delta: string;
  detail: string;
};

type ActivityPoint = {
  label: string;
  value: number;
};

type SongRow = {
  title: string;
  artist: string;
  plays: string;
  downloads: string;
  conversion: string;
};

type Dataset = {
  metrics: Metric[];
  activity: ActivityPoint[];
  funnel: { label: string; value: string }[];
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

const DATASETS: Record<RangeKey, Dataset> = {
  day: {
    metrics: [
      { label: "Downloads", value: "24", delta: "+9%", detail: "Music downloads" },
      { label: "Song Plays", value: "146", delta: "+12%", detail: "Playback activity" },
      { label: "Subscribers", value: "3", delta: "+50%", detail: "New paid users" },
      { label: "Conversion", value: "12.5%", delta: "+2%", detail: "Subscribers / downloads" },
    ],
    activity: [
      { label: "12a", value: 18 },
      { label: "4a", value: 14 },
      { label: "8a", value: 21 },
      { label: "12p", value: 31 },
      { label: "4p", value: 36 },
      { label: "8p", value: 28 },
    ],
    funnel: [
      { label: "Song Plays", value: "146" },
      { label: "Downloads", value: "24" },
      { label: "Subscribers", value: "3" },
    ],
    songs: [
      { title: "Northern Tides", artist: "Dan Hauser", plays: "42", downloads: "6", conversion: "14.3%" },
      { title: "Coyote on the Road", artist: "Paisley Wilson", plays: "35", downloads: "5", conversion: "14.3%" },
      { title: "Ember Drift", artist: "Lumen Fade", plays: "29", downloads: "4", conversion: "13.8%" },
      { title: "Veiled Endless", artist: "Sable", plays: "22", downloads: "3", conversion: "13.6%" },
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
      { label: "Downloads", value: "168", delta: "+14%", detail: "Music downloads" },
      { label: "Song Plays", value: "982", delta: "+19%", detail: "Playback activity" },
      { label: "Subscribers", value: "11", delta: "+10%", detail: "New paid users" },
      { label: "Conversion", value: "10.8%", delta: "+3%", detail: "Subscribers / downloads" },
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
    funnel: [
      { label: "Song Plays", value: "982" },
      { label: "Downloads", value: "168" },
      { label: "Subscribers", value: "11" },
    ],
    songs: [
      { title: "Northern Tides", artist: "Dan Hauser", plays: "164", downloads: "22", conversion: "13.4%" },
      { title: "Veiled Endless", artist: "Sable", plays: "150", downloads: "19", conversion: "12.7%" },
      { title: "Coyote on the Road", artist: "Paisley Wilson", plays: "143", downloads: "18", conversion: "12.6%" },
      { title: "Ember Drift", artist: "Lumen Fade", plays: "128", downloads: "16", conversion: "12.5%" },
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
      { label: "Downloads", value: "527", delta: "+18%", detail: "Music downloads" },
      { label: "Song Plays", value: "2.4k", delta: "+24%", detail: "Playback activity" },
      { label: "Subscribers", value: "56", delta: "+11%", detail: "New paid users" },
      { label: "Conversion", value: "11%", delta: "+4%", detail: "Subscribers / downloads" },
    ],
    activity: [
      { label: "W1", value: 92 },
      { label: "W2", value: 127 },
      { label: "W3", value: 141 },
      { label: "W4", value: 168 },
    ],
    funnel: [
      { label: "Song Plays", value: "2.4k" },
      { label: "Downloads", value: "527" },
      { label: "Subscribers", value: "56" },
    ],
    songs: [
      { title: "Afterglow Drift", artist: "Filmwave", plays: "842", downloads: "96", conversion: "11.4%" },
      { title: "Northline", artist: "Filmwave", plays: "716", downloads: "83", conversion: "11.6%" },
      { title: "Soft Cut", artist: "Filmwave", plays: "688", downloads: "72", conversion: "10.5%" },
      { title: "Signal Bloom", artist: "Filmwave", plays: "601", downloads: "58", conversion: "9.7%" },
      { title: "Golden Pull", artist: "Filmwave", plays: "544", downloads: "49", conversion: "9.0%" },
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
      { label: "Downloads", value: "5.9k", delta: "+31%", detail: "Music downloads" },
      { label: "Song Plays", value: "28.6k", delta: "+37%", detail: "Playback activity" },
      { label: "Subscribers", value: "412", delta: "+28%", detail: "New paid users" },
      { label: "Conversion", value: "7.0%", delta: "+1%", detail: "Subscribers / downloads" },
    ],
    activity: [
      { label: "Jan", value: 320 },
      { label: "Mar", value: 390 },
      { label: "May", value: 442 },
      { label: "Jul", value: 486 },
      { label: "Sep", value: 530 },
      { label: "Nov", value: 612 },
    ],
    funnel: [
      { label: "Song Plays", value: "28.6k" },
      { label: "Downloads", value: "5.9k" },
      { label: "Subscribers", value: "412" },
    ],
    songs: [
      { title: "Afterglow Drift", artist: "Filmwave", plays: "6.2k", downloads: "702", conversion: "11.3%" },
      { title: "Signal Bloom", artist: "Filmwave", plays: "5.8k", downloads: "610", conversion: "10.5%" },
      { title: "Golden Pull", artist: "Filmwave", plays: "5.4k", downloads: "554", conversion: "10.3%" },
      { title: "Northline", artist: "Filmwave", plays: "4.9k", downloads: "501", conversion: "10.2%" },
      { title: "Soft Cut", artist: "Filmwave", plays: "4.7k", downloads: "464", conversion: "9.9%" },
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
      { label: "Downloads", value: "12.2k", delta: "+100%", detail: "Lifetime downloads" },
      { label: "Song Plays", value: "61.4k", delta: "+100%", detail: "Lifetime playback" },
      { label: "Subscribers", value: "1.1k", delta: "+100%", detail: "Total subscribers" },
      { label: "Conversion", value: "9.2%", delta: "+100%", detail: "Subscribers / downloads" },
    ],
    activity: [
      { label: "2022", value: 420 },
      { label: "2023", value: 610 },
      { label: "2024", value: 870 },
      { label: "2025", value: 1120 },
      { label: "2026", value: 1450 },
    ],
    funnel: [
      { label: "Song Plays", value: "61.4k" },
      { label: "Downloads", value: "12.2k" },
      { label: "Subscribers", value: "1.1k" },
    ],
    songs: [
      { title: "Afterglow Drift", artist: "Filmwave", plays: "12.5k", downloads: "1.5k", conversion: "11.9%" },
      { title: "Northline", artist: "Filmwave", plays: "11.1k", downloads: "1.2k", conversion: "10.9%" },
      { title: "Signal Bloom", artist: "Filmwave", plays: "10.9k", downloads: "1.2k", conversion: "10.7%" },
      { title: "Golden Pull", artist: "Filmwave", plays: "10.4k", downloads: "1.1k", conversion: "10.3%" },
      { title: "Soft Cut", artist: "Filmwave", plays: "9.9k", downloads: "992", conversion: "10.0%" },
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

function MetricCardBlock({ metric }: { metric: Metric }) {
  return (
    <div className="filmwave-backend-section flex min-h-[104px] flex-col justify-between p-4">
      <div className="text-[11px] font-[320] text-[var(--text-secondary)]">
        {metric.label}
      </div>
      <div>
        <div className="font-[family-name:var(--font-zalando-sans)] text-[24px] font-[200] leading-none tracking-[-0.04em] text-[var(--text-primary)]">
          {metric.value}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-[320]">
          <span className="text-[var(--text-muted)]">{metric.detail}</span>
          <span className="text-[var(--text-secondary)]">
            {metric.delta} vs previous
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const width = 1000;
  const height = 210;
  const top = 16;
  const right = 14;
  const bottom = 32;
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
    <div className="border-t border-[var(--border-subtle)] px-5 pb-4 pt-5">
      <div className="relative h-[220px] w-full text-[var(--text-primary)]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="none"
          aria-label="Platform activity"
          role="img"
        >
          {yValues.map((tick, index) => (
            <line
              key={`horizontal-${index}`}
              x1={left}
              y1={tick.y}
              x2={width - right}
              y2={tick.y}
              stroke="var(--border-subtle)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {yValues.map((tick) => (
          <div
            key={`y-label-${tick.value}`}
            className="pointer-events-none absolute -translate-y-1/2 text-right text-[10px] font-[320] text-[var(--text-muted)]"
            style={{
              left: `calc(${(left / width) * 100}% - 25px)`,
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
            className="pointer-events-none absolute h-[5px] w-[5px] rounded-full bg-[var(--text-primary)]"
            style={{
              left: `${point.xPercent}%`,
              top: `${point.yPercent}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {points.map((point) => (
          <div
            key={`x-label-${point.label}`}
            className="pointer-events-none absolute -translate-x-1/2 text-[10px] font-[320] text-[var(--text-muted)]"
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
    <section className="filmwave-backend-section">
      <div className="filmwave-backend-section-header-bordered">
        <h2 className="filmwave-backend-section-title">{title}</h2>
      </div>
      <div className="px-5 py-2">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={`flex min-h-10 items-center justify-between gap-3 py-2 text-xs font-[320] ${
              index < items.length - 1
                ? "border-b border-[var(--border-subtle)]"
                : ""
            }`}
          >
            <span className="truncate text-[var(--text-secondary)]">
              {item.label}
            </span>
            <span className="text-[var(--text-primary)]">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopSongsCard({ songs }: { songs: SongRow[] }) {
  return (
    <section className="filmwave-backend-section">
      <div className="filmwave-backend-section-header-bordered">
        <div>
          <h2 className="filmwave-backend-section-title">Top performing songs</h2>
          <div className="mt-1 text-[11px] font-[320] text-[var(--text-muted)]">
            Strongest play and download activity in the selected range
          </div>
        </div>
        <Link
          href="/admin/music-library"
          className="text-[11px] font-[320] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          View Library
        </Link>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[minmax(280px,1fr)_90px_100px_90px] items-center border-b border-[var(--border-subtle)] px-5 py-3 text-[10px] font-[320] text-[var(--text-secondary)]">
            <span>Track</span>
            <span className="text-right">Plays</span>
            <span className="text-right">Downloads</span>
            <span className="text-right">Rate</span>
          </div>

          {songs.map((song, index) => (
            <div
              key={song.title}
              className={`grid min-h-[60px] grid-cols-[minmax(280px,1fr)_90px_100px_90px] items-center px-5 py-2 ${
                index < songs.length - 1
                  ? "border-b border-[var(--border-subtle)]"
                  : ""
              }`}
            >
              <div className="min-w-0 pr-4">
                <div className="truncate text-xs font-[400] text-[var(--text-primary)]">
                  {song.title}
                </div>
                <div className="mt-1 truncate text-[10px] font-[320] text-[var(--text-muted)]">
                  {song.artist}
                </div>
              </div>
              <div className="text-right text-xs font-[320] text-[var(--text-secondary)]">
                {song.plays}
              </div>
              <div className="text-right text-xs font-[320] text-[var(--text-secondary)]">
                {song.downloads}
              </div>
              <div className="text-right text-xs font-[320] text-[var(--text-secondary)]">
                {song.conversion}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AdminEngagementPage() {
  const [range, setRange] = useState<RangeKey>("month");
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;
  const data = useMemo(() => DATASETS[range], [range]);

  return (
    <AdminContentPage
      label="Engagement"
      title="Engagement"
      compactHeader
      hideIntro
      contentAreaClassName="bg-[var(--filmwave-admin-canvas)]"
      contentStyle={{
        paddingBottom: playerVisible ? "104px" : "32px",
      }}
    >
      <div className="grid gap-4">
        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <MetricCardBlock key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="filmwave-backend-section">
          <div className="filmwave-backend-section-header-bordered flex-wrap">
            <div>
              <h2 className="filmwave-backend-section-title">Platform activity</h2>
              <div className="mt-1 text-[11px] font-[320] text-[var(--text-muted)]">
                {data.metrics[0].label} activity across the selected range
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setRange(option.key)}
                  className={`filmwave-backend-choice-button ${
                    range === option.key ? "is-active" : ""
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3">
            {data.funnel.map((item, index) => (
              <div
                key={item.label}
                className={`px-5 py-4 ${
                  index < data.funnel.length - 1
                    ? "border-b border-[var(--border-subtle)] sm:border-b-0 sm:border-r"
                    : ""
                }`}
              >
                <div className="text-[11px] font-[320] text-[var(--text-secondary)]">
                  {item.label}
                </div>
                <div className="mt-2 font-[family-name:var(--font-zalando-sans)] text-[18px] font-[200] tracking-[-0.03em] text-[var(--text-primary)]">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <ActivityChart data={data.activity} />

          <div className="border-t border-[var(--border-subtle)] px-5 py-3 text-[11px] font-[320] leading-5 text-[var(--text-muted)]">
            Activity follows the same selected period as the summary metrics above.
          </div>
        </section>

        <TopSongsCard songs={data.songs} />

        <div className="grid gap-4 md:grid-cols-3">
          <CompactListCard title="Traffic sources" items={data.trafficSources} />
          <CompactListCard title="Top genres" items={data.topGenres} />
          <CompactListCard title="Top search terms" items={data.topSearchTerms} />
        </div>
      </div>
    </AdminContentPage>
  );
}
