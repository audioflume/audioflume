"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AdminContentPage from "@/components/admin/AdminContentPage";
import DownloadArrowIcon from "@/components/icons/DownloadArrowIcon";
import FunnelIcon from "@/components/icons/FunnelIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import UserIcon from "@/components/icons/UserIcon";
import { pillButtonClass } from "@/components/uiClasses";
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

function MetricCardBlock({ metric, index }: { metric: Metric; index: number }) {
  const Icon =
    index === 0
      ? DownloadArrowIcon
      : index === 1
        ? PlayIconSmall
        : index === 2
          ? UserIcon
          : FunnelIcon;

  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-start justify-between px-4 pt-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {metric.label}
        </div>

        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
          <Icon size={13} />
        </div>
      </div>

      <div className="px-4 pb-4">
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

function ActivityCard({ data }: { data: ActivityPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-[58px] items-center justify-between border-b border-[var(--border)] px-4">
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)]">Activity</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Playback and download trend.</p>
        </div>
      </div>

      <div className="flex h-[220px] items-end gap-2 px-4 py-4">
        {data.map((point) => (
          <div key={point.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
            <div className="flex flex-1 items-end rounded-full bg-[var(--bg-primary)]">
              <div
                className="w-full rounded-full bg-[var(--text-primary)] opacity-80"
                style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}
              />
            </div>
            <div className="truncate text-center text-[10px] font-medium text-[var(--text-muted)]">
              {point.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelCard({ items }: { items: Dataset["funnel"] }) {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-[58px] items-center justify-between border-b border-[var(--border)] px-4">
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)]">Conversion Funnel</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Plays into downloads and subscribers.</p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
          <FunnelIcon size={13} />
        </div>
      </div>

      <div className="grid gap-2 p-4">
        {items.map((item) => (
          <div key={item.label} className="flex h-10 items-center justify-between rounded-xl bg-[var(--bg-primary)] px-3">
            <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactListCard({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-10 items-center border-b border-[var(--border)] px-4 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
        {title}
      </div>
      <div className="px-4 py-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] py-2.5 text-xs last:border-b-0">
            <span className="truncate text-[var(--text-secondary)]">{item.label}</span>
            <span className="text-[var(--text-primary)]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopSongsCard({ songs }: { songs: SongRow[] }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex h-[58px] items-center justify-between border-b border-[var(--border)] px-4">
        <div>
          <h2 className="text-sm font-medium text-[var(--text-primary)]">Top Performing Songs</h2>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Strongest play and download activity.</p>
        </div>
        <Link href="/admin/music-library" className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">
          View Library
        </Link>
      </div>

      <div className="overflow-x-auto overflow-y-hidden">
        <div className="min-w-[680px]">
          <div className="grid h-8 grid-cols-[minmax(220px,1.6fr)_minmax(120px,1fr)_80px_100px_100px] items-center gap-3 border-b border-[var(--border)] px-4 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            <div>Song</div>
            <div>Artist</div>
            <div>Plays</div>
            <div>Downloads</div>
            <div>Rate</div>
          </div>

          {songs.map((song, index) => (
            <div
              key={song.title}
              className="grid min-h-[44px] grid-cols-[minmax(220px,1.6fr)_minmax(120px,1fr)_80px_100px_100px] items-center gap-3 px-4 text-xs"
              style={{ borderBottom: index === songs.length - 1 ? "none" : "1px solid var(--border-subtle)" }}
            >
              <div className="truncate font-medium text-[var(--text-primary)]">{song.title}</div>
              <div className="truncate text-[var(--text-secondary)]">{song.artist}</div>
              <div className="text-[var(--text-secondary)]">{song.plays}</div>
              <div className="text-[var(--text-secondary)]">{song.downloads}</div>
              <div className="text-[var(--text-secondary)]">{song.conversion}</div>
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
    <AdminContentPage
      label="Engagement"
      title="Engagement Overview"
      description="Dense analytics for platform activity, conversion, song performance, and discovery behaviour."
      titleAction={(
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
      )}
      contentStyle={{ paddingBottom: playerVisible ? "104px" : "32px" }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.metrics.map((metric, index) => (
          <MetricCardBlock key={metric.label} metric={metric} index={index} />
        ))}
      </div>

      <div className="mt-3 grid items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <ActivityCard data={data.activity} />
        <FunnelCard items={data.funnel} />
      </div>

      <div className="mt-3 grid items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <TopSongsCard songs={data.songs} />
        <CompactListCard title="Traffic Sources" items={data.trafficSources} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <CompactListCard title="Top Genres" items={data.topGenres} />
        <CompactListCard title="Top Search Terms" items={data.topSearchTerms} />
      </div>
    </AdminContentPage>
  );
}
