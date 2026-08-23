import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import AdminContentPage from "@/components/admin/AdminContentPage";
import CuePointManager from "@/components/admin/CuePointManager";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";

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
      <AdminContentPage
        label="Cue Points"
        title="Not authorized"
        compactHeader
        contentAreaBottomPadding={false}
      >
        <section className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-5 text-xs text-[var(--text-secondary)]">
          You do not have access to this admin page.
        </section>
        <Footer className="!px-0" playerPadding={false} showTopBorder={false} />
      </AdminContentPage>
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
    .neq("type", "intro_end")
    .order("time_seconds", { ascending: true });

  if (editPointsError) {
    throw new Error(editPointsError.message);
  }

  const typedSong = song as SongRow;
  const typedEditPoints = (editPoints ?? []).filter(
    (point) => point.type !== "intro_end",
  ) as SongEditPointRow[];
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
    <AdminContentPage
      label="Cue Points"
      title="Cue Points"
      compactHeader
      contentAreaBottomPadding={false}
    >
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/admin/songs/${id}/edit`}
          className="inline-flex h-10 min-w-[104px] items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-5 text-[12px] font-normal text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          Edit Details
        </Link>
      </div>

      <div className="grid gap-3">
        <section className="flex min-h-[80px] items-center gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-5">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-[7px] bg-[var(--bg-secondary)]">
            {typedSong.cover_url ? (
              <img
                src={typedSong.cover_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <div className="min-w-0">
            <h2 className="truncate font-[family-name:var(--font-aktiv-grotesk)] text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
              {typedSong.title || "Untitled Song"}
            </h2>
            <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
              {typedSong.artist || "Unknown artist"}
            </p>
          </div>

          <div className="ml-auto hidden items-center gap-5 text-xs text-[var(--text-secondary)] md:flex">
            {typedSong.key ? <span>{typedSong.key}</span> : null}
            {typedSong.bpm ? <span>{typedSong.bpm} BPM</span> : null}
            {duration > 0 ? <span>{formatTime(duration)}</span> : null}
          </div>
        </section>

        <CuePointManager
          songId={id}
          audioUrl={typedSong.audio_url}
          waveformPeaks={typedSong.waveform_peaks || "[]"}
          duration={duration}
          markers={markers}
        />
      </div>

      <Footer className="!px-0" playerPadding={false} showTopBorder={false} />
    </AdminContentPage>
  );
}
