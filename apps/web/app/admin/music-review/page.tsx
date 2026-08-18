"use client";

import { useEffect, useMemo, useState } from "react";

import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import ApprovedSongPublishButton from "@/components/admin/ApprovedSongPublishButton";
import Toast from "@/components/Toast";

type ReviewStatus =
  | "submitted"
  | "changes_requested"
  | "rejected"
  | "approved"
  | "published";

type ReviewFilter = "all" | ReviewStatus;
type ReviewAction = "request_changes" | "reject" | "approve" | "publish";

type ArtistProfileSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  profile_image_url?: string | null;
};

type SubmissionSummary = {
  id: string;
  title: string;
  artist: string;
  status: ReviewStatus;
  duration: number;
  created_at: string;
  artist_profile: ArtistProfileSummary | null;
};

type SubmissionSong = SubmissionSummary & {
  bpm: number | null;
  key: string | null;
  genres: string[];
  moods: string[];
  regions: string[];
  instruments: string[];
  builds: string[];
  vocals: string[];
  instrumental: boolean;
  explicit: boolean;
  audio_url: string | null;
  playback_url: string | null;
  hls_url: string | null;
  cover_url: string | null;
};

type Credit = {
  id: string;
  credit_name: string;
  credit_role: string;
  position: number;
};

type Rights = {
  master_owner: string | null;
  publishing_owner: string | null;
  pro_affiliation: string | null;
  isrc: string | null;
  iswc: string | null;
  copyright_year: number | null;
  rights_confirmed: boolean;
  notes: string | null;
};

type RightsHolder = {
  id: string;
  holder_name: string;
  rights_type: "master" | "publishing" | "both";
  ownership_percent: number | string | null;
  pro_affiliation: string | null;
  ipi_cae_number: string | null;
};

type ReviewEvent = {
  id: string;
  action: "changes_requested" | "rejected" | "approved" | "published";
  notes: string | null;
  reviewed_by_clerk_user_id: string | null;
  created_at: string;
};

type QueueResponse = {
  songs?: SubmissionSummary[];
  error?: string;
};

type DetailsResponse = {
  song?: SubmissionSong;
  artist?: ArtistProfileSummary;
  credits?: Credit[];
  rights?: Rights | null;
  rights_holders?: RightsHolder[];
  reviews?: ReviewEvent[];
  error?: string;
};

const FILTERS: { value: ReviewFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "changes_requested", label: "Changes" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "published", label: "Published" },
];

function formatStatus(status: ReviewStatus | ReviewEvent["action"]) {
  if (status === "changes_requested") return "Changes requested";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusStyle(status: ReviewStatus) {
  if (status === "published" || status === "approved") {
    return {
      color: "var(--status-success, #48b571)",
      background: "var(--status-success-soft, rgba(72, 181, 113, 0.12))",
    };
  }

  if (status === "submitted" || status === "changes_requested") {
    return {
      color: "var(--status-warning, #d9a441)",
      background: "var(--status-warning-soft, rgba(217, 164, 65, 0.12))",
    };
  }

  return {
    color: "var(--status-error, #dc584f)",
    background: "var(--status-error-soft, rgba(220, 88, 79, 0.12))",
  };
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <span
      className="inline-flex h-6 items-center rounded-full px-2.5 text-[10px] font-medium uppercase tracking-[0.05em]"
      style={statusStyle(status)}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function TagGroup({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;

  return (
    <div>
      <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex h-7 items-center rounded-full bg-[var(--bg-tertiary)] px-2.5 text-[11px] text-[var(--text-secondary)]"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1.5 text-xs text-[var(--text-primary)]">{value || "—"}</div>
    </div>
  );
}

export default function AdminMusicReviewPage() {
  const [songs, setSongs] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewFilter>("submitted");
  const [selectedSongId, setSelectedSongId] = useState("");
  const [details, setDetails] = useState<DetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState<ReviewAction | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  async function loadQueue() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/song-reviews", { cache: "no-store" });
      const body = (await response.json().catch(() => ({}))) as QueueResponse;

      if (!response.ok) {
        throw new Error(body.error || "Failed to load music review queue");
      }

      setSongs(Array.isArray(body.songs) ? body.songs : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load music review queue",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  const counts = useMemo(() => {
    return {
      all: songs.length,
      submitted: songs.filter((song) => song.status === "submitted").length,
      changes_requested: songs.filter((song) => song.status === "changes_requested").length,
      approved: songs.filter((song) => song.status === "approved").length,
      rejected: songs.filter((song) => song.status === "rejected").length,
      published: songs.filter((song) => song.status === "published").length,
    };
  }, [songs]);

  const visibleSongs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return songs.filter((song) => {
      if (statusFilter !== "all" && song.status !== statusFilter) return false;
      if (!query) return true;

      return [song.title, song.artist, song.artist_profile?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [songs, search, statusFilter]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2200);
  }

  async function openReview(songId: string) {
    try {
      setSelectedSongId(songId);
      setDetailsLoading(true);
      setDetails(null);
      setFeedback("");
      setError("");

      const response = await fetch(`/api/admin/song-reviews/${songId}`, {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => ({}))) as DetailsResponse;

      if (!response.ok || !body.song) {
        throw new Error(body.error || "Failed to load submission details");
      }

      setDetails(body);
    } catch (loadError) {
      showToast(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load submission details",
      );
      setSelectedSongId("");
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeReview() {
    if (actionLoading) return;
    setSelectedSongId("");
    setDetails(null);
    setFeedback("");
  }

  async function runAction(action: ReviewAction) {
    const song = details?.song;
    if (!song || actionLoading) return;

    if (action === "request_changes" && !feedback.trim()) {
      showToast("Add review feedback first");
      return;
    }

    if (
      action === "reject" &&
      !window.confirm(`Reject ${song.title}? The artist will not be able to resubmit it.`)
    ) {
      return;
    }

    if (
      action === "publish" &&
      !window.confirm(`Publish ${song.title} to the public music library?`)
    ) {
      return;
    }

    try {
      setActionLoading(action);

      const response = await fetch(`/api/admin/song-reviews/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: feedback }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        song?: SubmissionSummary;
        review?: ReviewEvent;
        error?: string;
      };

      if (!response.ok || !body.song) {
        throw new Error(body.error || "Failed to update submission");
      }

      setSongs((current) =>
        current.map((item) =>
          item.id === song.id ? { ...item, status: body.song!.status } : item,
        ),
      );

      showToast(`${song.title}: ${formatStatus(body.song.status)}`);

      if (action === "approve") {
        setDetails((current) => {
          if (!current?.song) return current;

          return {
            ...current,
            song: { ...current.song, status: body.song!.status },
            reviews: body.review
              ? [body.review, ...(current.reviews ?? [])]
              : current.reviews,
          };
        });
        setFeedback("");
        return;
      }

      setSelectedSongId("");
      setDetails(null);
      setFeedback("");
    } catch (actionError) {
      showToast(
        actionError instanceof Error
          ? actionError.message
          : "Failed to update submission",
      );
    } finally {
      setActionLoading(null);
    }
  }

  const song = details?.song;
  const artist = details?.artist;
  const rights = details?.rights ?? null;
  const rightsHolders = details?.rights_holders ?? [];
  const credits = details?.credits ?? [];
  const reviews = details?.reviews ?? [];

  return (
    <AdminContentPage
      section="Database"
      label="Music Review"
      title="Music Review"
      description="Review artist submissions before they enter the Audioflume catalogue."
      compactHeader
      hideIntro
      contentAreaClassName="bg-[var(--filmwave-neutral-surface)]"
    >
      {selectedSongId ? (
        <div className="grid gap-4">
          <button
            type="button"
            onClick={closeReview}
            disabled={Boolean(actionLoading)}
            className="inline-flex h-9 w-fit cursor-pointer items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-4 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back to Queue
          </button>

          {detailsLoading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
              Loading submission...
            </div>
          ) : song ? (
            <>
              <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                      {artist?.name || song.artist}
                    </div>
                    <h2 className="mt-1 text-xl font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                      {song.title}
                    </h2>
                  </div>
                  <StatusBadge status={song.status} />
                </div>

                <div className="grid gap-5 p-5">
                  {song.playback_url || song.audio_url ? (
                    <audio
                      controls
                      preload="metadata"
                      src={song.playback_url || song.audio_url || undefined}
                      className="w-full"
                    />
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <DetailValue label="Duration" value={formatDuration(Number(song.duration))} />
                    <DetailValue label="BPM" value={song.bpm == null ? "—" : String(song.bpm)} />
                    <DetailValue label="Key" value={song.key ?? "—"} />
                    <DetailValue label="Instrumental" value={song.instrumental ? "Yes" : "No"} />
                    <DetailValue label="Explicit" value={song.explicit ? "Yes" : "No"} />
                    <DetailValue label="Uploaded" value={formatDate(song.created_at)} />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <TagGroup label="Genres" values={song.genres ?? []} />
                    <TagGroup label="Moods" values={song.moods ?? []} />
                    <TagGroup label="Regions" values={song.regions ?? []} />
                    <TagGroup label="Instruments" values={song.instruments ?? []} />
                    <TagGroup label="Build" values={song.builds ?? []} />
                    <TagGroup label="Vocals" values={song.vocals ?? []} />
                  </div>
                </div>
              </section>

              <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
                <div className="border-b border-[var(--border)] px-5 py-4">
                  <h3 className="text-base font-medium text-[var(--text-primary)]">Credits</h3>
                </div>
                <div className="p-5">
                  {credits.length === 0 ? (
                    <div className="text-xs text-[var(--text-muted)]">No credits supplied.</div>
                  ) : (
                    <div className="grid gap-2">
                      {credits.map((credit) => (
                        <div
                          key={credit.id}
                          className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2.5 last:border-b-0"
                        >
                          <span className="text-xs text-[var(--text-primary)]">
                            {credit.credit_name}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {credit.credit_role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                  <h3 className="text-base font-medium text-[var(--text-primary)]">
                    Rights + ownership
                  </h3>
                  <span className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                    {rights?.rights_confirmed ? "100% complete" : "Incomplete"}
                  </span>
                </div>

                <div className="grid gap-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailValue label="Master owner" value={rights?.master_owner ?? "—"} />
                    <DetailValue label="Publishing owner" value={rights?.publishing_owner ?? "—"} />
                    <DetailValue label="PRO" value={rights?.pro_affiliation ?? "—"} />
                    <DetailValue
                      label="Copyright"
                      value={rights?.copyright_year == null ? "—" : String(rights.copyright_year)}
                    />
                    <DetailValue label="ISRC" value={rights?.isrc ?? "—"} />
                    <DetailValue label="ISWC" value={rights?.iswc ?? "—"} />
                  </div>

                  <div className="overflow-x-auto rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)]">
                    <div className="grid min-w-[760px] grid-cols-[minmax(180px,1fr)_150px_100px_150px_150px] gap-3 border-b border-[var(--border)] px-4 py-3 text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                      <span>Rights holder</span>
                      <span>Rights</span>
                      <span>Share</span>
                      <span>PRO</span>
                      <span>IPI / CAE</span>
                    </div>
                    {rightsHolders.length === 0 ? (
                      <div className="px-4 py-4 text-xs text-[var(--text-muted)]">
                        No ownership splits supplied.
                      </div>
                    ) : (
                      rightsHolders.map((holder) => (
                        <div
                          key={holder.id}
                          className="grid min-w-[760px] grid-cols-[minmax(180px,1fr)_150px_100px_150px_150px] gap-3 border-b border-[var(--border)] px-4 py-3 text-xs last:border-b-0"
                        >
                          <span className="text-[var(--text-primary)]">{holder.holder_name}</span>
                          <span className="text-[var(--text-secondary)]">
                            {holder.rights_type === "both"
                              ? "Master + publishing"
                              : formatStatus(holder.rights_type as ReviewStatus)}
                          </span>
                          <span className="text-[var(--text-secondary)]">
                            {holder.ownership_percent ?? 0}%
                          </span>
                          <span className="text-[var(--text-secondary)]">
                            {holder.pro_affiliation || "—"}
                          </span>
                          <span className="text-[var(--text-secondary)]">
                            {holder.ipi_cae_number || "—"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {rights?.notes ? (
                    <div className="rounded-[7px] bg-[var(--bg-primary)] px-4 py-3 text-xs leading-5 text-[var(--text-secondary)]">
                      {rights.notes}
                    </div>
                  ) : null}
                </div>
              </section>

              {reviews.length > 0 ? (
                <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
                  <div className="border-b border-[var(--border)] px-5 py-4">
                    <h3 className="text-base font-medium text-[var(--text-primary)]">
                      Review history
                    </h3>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {reviews.map((review) => (
                      <div key={review.id} className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs font-medium text-[var(--text-primary)]">
                            {formatStatus(review.action)}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                        {review.notes ? (
                          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                            {review.notes}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {song.status === "submitted" || song.status === "approved" ? (
                <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                      {song.status === "submitted" ? "Review feedback" : "Publish note (optional)"}
                    </span>
                    <textarea
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      rows={4}
                      maxLength={4000}
                      disabled={Boolean(actionLoading)}
                      placeholder={
                        song.status === "submitted"
                          ? "Required when requesting changes. Optional when rejecting a track."
                          : "Optional internal note for this publish action."
                      }
                      className="w-full resize-y rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] disabled:opacity-60"
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {song.status === "submitted" ? (
                      <>
                        <button
                          type="button"
                          disabled={Boolean(actionLoading)}
                          onClick={() => void runAction("request_changes")}
                          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-4 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === "request_changes" ? "Saving..." : "Request Changes"}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionLoading)}
                          onClick={() => void runAction("reject")}
                          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[7px] border border-[var(--status-error,#dc584f)] px-4 text-xs text-[var(--status-error,#dc584f)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === "reject" ? "Saving..." : "Reject"}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionLoading) || !rights?.rights_confirmed}
                          onClick={() => void runAction("approve")}
                          className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[7px] bg-[var(--text-primary)] px-4 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {actionLoading === "approve" ? "Saving..." : "Approve"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={Boolean(actionLoading) || !rights?.rights_confirmed}
                        onClick={() => void runAction("publish")}
                        className="inline-flex h-9 cursor-pointer items-center justify-center rounded-[7px] bg-[var(--text-primary)] px-4 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {actionLoading === "publish" ? "Publishing..." : "Publish"}
                      </button>
                    )}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <>
          <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <AdminSearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search submissions"
              className="w-full max-w-[500px]"
            />

            <div className="flex shrink-0 flex-nowrap gap-2 overflow-x-auto">
              {FILTERS.map((filter) => {
                const active = statusFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-[7px] border px-3 text-[11px] font-medium transition ${
                      active
                        ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                        : "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span className={active ? "opacity-70" : "text-[var(--text-muted)]"}>
                      {counts[filter.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="overflow-x-auto rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
            <div className="grid min-w-[900px] grid-cols-[minmax(220px,1.4fr)_minmax(160px,1fr)_100px_130px_170px] gap-4 border-b border-[var(--border)] bg-[var(--bg-primary)] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
              <span>Track</span>
              <span>Artist</span>
              <span>Length</span>
              <span>Status</span>
              <span className="text-right">Action</span>
            </div>

            {loading ? (
              <div className="flex min-h-[180px] min-w-[900px] items-center justify-center text-xs text-[var(--text-muted)]">
                Loading submissions...
              </div>
            ) : error ? (
              <div className="flex min-h-[180px] min-w-[900px] flex-col items-center justify-center gap-3 px-5 text-center text-xs text-[var(--text-secondary)]">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => void loadQueue()}
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[11px] font-medium text-[var(--text-primary)]"
                >
                  Try again
                </button>
              </div>
            ) : visibleSongs.length === 0 ? (
              <div className="flex min-h-[180px] min-w-[900px] items-center justify-center px-5 text-xs text-[var(--text-muted)]">
                No submissions match this view.
              </div>
            ) : (
              <div className="min-w-[900px]">
                {visibleSongs.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[minmax(220px,1.4fr)_minmax(160px,1fr)_100px_130px_170px] items-center gap-4 border-b border-[var(--border)] px-5 py-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {item.title}
                      </div>
                      <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                        Uploaded {formatDate(item.created_at)}
                      </div>
                    </div>
                    <div className="truncate text-xs text-[var(--text-secondary)]">
                      {item.artist_profile?.name || item.artist}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {formatDuration(Number(item.duration))}
                    </div>
                    <div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void openReview(item.id)}
                        className="inline-flex h-8 cursor-pointer items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-[11px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                      >
                        Review
                      </button>
                      {item.status === "approved" ? (
                        <ApprovedSongPublishButton
                          songId={item.id}
                          songTitle={item.title}
                          onPublished={(songId) => {
                            setSongs((current) =>
                              current.map((song) =>
                                song.id === songId
                                  ? { ...song, status: "published" }
                                  : song,
                              ),
                            );
                            showToast(`${item.title}: Published`);
                          }}
                          onError={showToast}
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Toast message={toastMessage} />
    </AdminContentPage>
  );
}
