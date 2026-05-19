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
  type: string;
  time_seconds: number | string;
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

function formatSeconds(secondsValue: number | string) {
  const seconds = Number(secondsValue);

  if (!Number.isFinite(seconds)) return "0.00s";

  return `${seconds.toFixed(2)}s`;
}

function getConfidenceValue(confidence: number | string | null) {
  const value = Number(confidence ?? 0);

  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(1, value));
}

function getConfidenceLabel(confidence: number | string | null) {
  const value = getConfidenceValue(confidence);

  if (value >= 0.75) return "High";
  if (value >= 0.45) return "Medium";
  if (value > 0) return "Low";

  return "Unknown";
}

function getTypeLabel(type: string) {
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
    .select("id, song_id, type, time_seconds, label, confidence, source, created_at")
    .eq("song_id", id)
    .order("time_seconds", { ascending: true });

  if (editPointsError) {
    throw new Error(editPointsError.message);
  }

  const typedSong = song as SongRow;
  const typedEditPoints = (editPoints ?? []) as SongEditPointRow[];
  const duration = Number(typedSong.duration ?? 0);
  const markers = typedEditPoints.map((point) => ({
    id: point.id,
    type: point.type,
    time: Number(point.time_seconds),
    label: point.label || getTypeLabel(point.type),
    confidence: getConfidenceValue(point.confidence),
    source: point.source || "auto",
  }));

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
              Review generated edit-point markers, play the song, and jump to detected cues.
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
              <>
                <div className="mb-4">
                  <EditPointWaveformReview
                    audioUrl={typedSong.audio_url}
                    waveformPeaks={typedSong.waveform_peaks || "[]"}
                    duration={duration}
                    markers={markers}
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                  <div className="grid grid-cols-[minmax(0,1.4fr)_100px_110px_90px] border-b border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    <div>Marker</div>
                    <div>Time</div>
                    <div>Confidence</div>
                    <div>Source</div>
                  </div>

                  {typedEditPoints.map((point) => {
                    const confidence = getConfidenceValue(point.confidence);
                    const confidenceLabel = getConfidenceLabel(point.confidence);

                    return (
                      <div
                        key={point.id}
                        className="grid grid-cols-[minmax(0,1.4fr)_100px_110px_90px] items-center border-b border-[var(--border-subtle)] px-4 py-3 text-xs last:border-b-0"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-[var(--text-primary)]">
                            {point.label || getTypeLabel(point.type)}
                          </div>
                          <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                            {point.type}
                          </div>
                        </div>

                        <div className="font-mono text-[12px] text-[var(--text-secondary)]">
                          {formatSeconds(point.time_seconds)}
                        </div>

                        <div>
                          <span className="inline-flex rounded-full border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--text-secondary)]">
                            {confidenceLabel} · {Math.round(confidence * 100)}%
                          </span>
                        </div>

                        <div className="text-[11px] capitalize text-[var(--text-muted)]">
                          {point.source || "auto"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
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
