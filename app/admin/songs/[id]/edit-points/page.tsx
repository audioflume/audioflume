import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import EditPointWaveformReview from "@/components/admin/EditPointWaveformReview";

type PageProps = {
  params: Promise<{ id: string }>;
};

type SongEditPointRow = {
  id: string;
  song_id: string;
  kind: "point" | "range" | null;
  type: string;
  time_seconds: number | string;
  start_time_seconds: number | string | null;
  end_time_seconds: number | string | null;
  label: string | null;
  confidence: number | string | null;
  source: string | null;
  created_at: string;
};

type SongRow = {
  id: string;
  title: string | null;
  artist: string | null;
  audio_url: string | null;
  cover_url: string | null;
  waveform_peaks: string | null;
  duration: number | null;
  bpm: number | null;
  key: string | null;
};

function formatTime(secondsValue: number | string) {
  const seconds = Number(secondsValue);

  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;

  return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, "0")}`;
}

function getConfidenceValue(confidence: number | string | null) {
  const value = Number(confidence ?? 0);

  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(1, value));
}

function getTypeLabel(type: string) {
  if (type === "drop") return "Main Drop";

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AdminSongEditPointsPage({ params }: PageProps) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
        <div className="px-8 pt-14">
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
            Not authorized
          </h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            You do not have access to this admin page.
          </p>
        </div>
      </main>
    );
  }

  const { id } = await params;

  const { data: song, error: songError } = await supabaseServer
    .from("songs")
    .select("id, title, artist, audio_url, cover_url, waveform_peaks, duration, bpm, key")
    .eq("id", id)
    .single();

  if (songError || !song) {
    notFound();
  }

  const { data: editPoints, error: editPointsError } = await supabaseServer
    .from("song_edit_points")
    .select(
      "id, song_id, kind, type, time_seconds, start_time_seconds, end_time_seconds, label, confidence, source, created_at",
    )
    .eq("song_id", id)
    .order("time_seconds", { ascending: true });

  if (editPointsError) {
    throw new Error(editPointsError.message);
  }

  const typedSong = song as SongRow;
  const typedEditPoints = (editPoints ?? []) as SongEditPointRow[];
  const duration = Number(typedSong.duration ?? 0);
  const markers = typedEditPoints.map((point) => {
    const kind = point.kind === "range" ? "range" : "point";
    const time = Number(point.time_seconds);
    const startTime =
      point.start_time_seconds == null ? null : Number(point.start_time_seconds);
    const endTime =
      point.end_time_seconds == null ? null : Number(point.end_time_seconds);

    return {
      id: point.id,
      kind,
      type: point.type,
      time,
      startTime: kind === "range" ? (Number.isFinite(startTime) ? startTime : 0) : null,
      endTime: kind === "range" ? (Number.isFinite(endTime) ? endTime : time) : null,
      label: point.label || getTypeLabel(point.type),
      confidence: getConfidenceValue(point.confidence),
      source: point.source || "auto",
    };
  });

  return (
    <main className="relative min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <div className="px-8 pt-14 pb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/admin/music-library"
              className="mb-5 inline-flex text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              ← Music Library
            </Link>

            <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
              Edit Points
            </h1>

            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Review, drag, and fine-tune generated edit points and ranges.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/admin/songs/${id}/edit`}
              className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              Edit Details
            </Link>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-4 border-b border-[var(--border)] p-4">
            <div className="h-14 w-14 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]">
              {typedSong.cover_url ? (
                <img
                  src={typedSong.cover_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-base font-medium text-[var(--text-primary)]">
                {typedSong.title || "Untitled Song"}
              </h2>
              <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                {typedSong.artist || "Unknown artist"}
              </p>
            </div>

            <div className="ml-auto hidden items-center gap-2 text-xs text-[var(--text-secondary)] md:flex">
              {typedSong.key ? <span>{typedSong.key}</span> : null}
              {typedSong.bpm ? <span>{typedSong.bpm} BPM</span> : null}
              {duration > 0 ? <span>{formatTime(duration)}</span> : null}
            </div>
          </div>

          <div className="p-4">
            {typedEditPoints.length > 0 ? (
              <EditPointWaveformReview
                songId={id}
                audioUrl={typedSong.audio_url}
                waveformPeaks={typedSong.waveform_peaks || "[]"}
                duration={duration}
                markers={markers}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-primary)] p-8 text-center">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  No generated edit points yet
                </div>
                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[var(--text-secondary)]">
                  Go back to the music library, open this song’s dropdown, and run Analyze Edit Points.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
