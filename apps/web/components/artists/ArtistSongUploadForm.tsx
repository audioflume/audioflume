"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import AdminModalShell from "@/components/admin/AdminModalShell";
import AudioFileIcon from "@/components/icons/AudioFileIcon";
import CheckMarkIcon from "@/components/icons/CheckMarkIcon";
import ChevronDownIcon from "@/components/icons/ChevronDownIcon";
import ChevronUpIcon from "@/components/icons/ChevronUpIcon";
import UploadIcon from "@/components/icons/UploadIcon";
import WarningIcon from "@/components/icons/WarningIcon";
import { analyzeArtistSongAudioFile } from "@/lib/artistSongAudioAnalysis";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";
import {
  BUILD_OPTIONS,
  GENRE_OPTIONS,
  INSTRUMENT_OPTIONS,
  MOOD_OPTIONS,
  REGION_OPTIONS,
  VOCALS_OPTIONS,
} from "@/lib/constants";

type ArtistSongSummary = {
  id: string;
  title: string;
  status: string;
  duration: number;
  created_at: string;
};

type ArtistSongsResponse = {
  song?: ArtistSongSummary;
  error?: string;
};

type ReleaseType = "single" | "ep" | "album";

type ArtistReleaseOption = {
  id: string;
  title: string;
  release_type: ReleaseType;
  cover_image_url: string | null;
  release_date: string | null;
  status: string;
  track_ids: string[];
};

type ArtistReleasesResponse = {
  releases?: ArtistReleaseOption[];
  release?: ArtistReleaseOption;
  error?: string;
};

type ArtistArtworkResponse = {
  song?: {
    id: string;
    cover_url: string | null;
  };
  release?: {
    id: string;
    cover_image_url: string | null;
  };
  error?: string;
};

type Credit = {
  credit_name: string;
  credit_role: string;
};

type RightsHolder = {
  holder_name: string;
  rights_type: "master" | "publishing" | "both";
  ownership_percent: string;
  pro_affiliation: string;
  ipi_cae_number: string;
};

type ArtistSongUploadFormProps = {
  artist: ArtistDashboardProfile;
  onClose: () => void;
  onUploaded: (song: ArtistSongSummary) => void;
};

const KEY_OPTIONS = [
  "Cmaj",
  "Cmin",
  "C#maj",
  "C#min",
  "Dbmaj",
  "Dbmin",
  "Dmaj",
  "Dmin",
  "D#maj",
  "D#min",
  "Ebmaj",
  "Ebmin",
  "Emaj",
  "Emin",
  "Fmaj",
  "Fmin",
  "F#maj",
  "F#min",
  "Gbmaj",
  "Gbmin",
  "Gmaj",
  "Gmin",
  "G#maj",
  "G#min",
  "Abmaj",
  "Abmin",
  "Amaj",
  "Amin",
  "A#maj",
  "A#min",
  "Bbmaj",
  "Bbmin",
  "Bmaj",
  "Bmin",
];

const RELEASE_TYPE_OPTIONS: { value: ReleaseType; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "ep", label: "EP" },
  { value: "album", label: "Album" },
];

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="mb-1.5 block text-[11px] font-medium text-[var(--text-secondary)]">
      {children}
    </label>
  );
}

function SelectInput({
  value,
  onChange,
  children,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={`filmwave-backend-select filmwave-backend-select-end-control ${
        value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
      }`}
    >
      {children}
    </select>
  );
}

function NumericInput({
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const currentValue = Number(value || 0);

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="filmwave-backend-input filmwave-backend-input-end-control"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(String(Math.min(400, currentValue + 1)))}
          className="flex h-3.5 w-5 items-center justify-center text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Increase value"
        >
          <ChevronUpIcon />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(String(Math.max(1, currentValue - 1)))}
          className="-mt-0.5 flex h-3.5 w-5 items-center justify-center text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Decrease value"
        >
          <ChevronDownIcon />
        </button>
      </div>
    </div>
  );
}

function CheckboxInput({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled: boolean;
}) {
  return (
    <label
      className={`group flex h-10 items-center gap-2.5 self-end rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs transition hover:text-[var(--text-primary)] ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${checked ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border-[1.5px] border-[var(--border)] bg-[var(--bg-secondary)] transition group-hover:border-[var(--text-secondary)] peer-checked:border-[var(--text-primary)] peer-checked:bg-[var(--text-primary)] peer-checked:[&>svg]:opacity-100">
        <CheckMarkIcon
          size={10}
          strokeWidth={3}
          className="opacity-0 text-[var(--bg-primary)] transition"
        />
      </span>
      {label}
    </label>
  );
}

function MultiSelectPills({
  options,
  selected,
  onChange,
  disabled,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() =>
              onChange(
                active
                  ? selected.filter((item) => item !== option)
                  : [...selected, option],
              )
            }
            className={`filmwave-backend-choice-button ${active ? "is-active" : ""}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function emptyCredit(): Credit {
  return { credit_name: "", credit_role: "" };
}

function emptyHolder(): RightsHolder {
  return {
    holder_name: "",
    rights_type: "both",
    ownership_percent: "",
    pro_affiliation: "",
    ipi_cae_number: "",
  };
}

export default function ArtistSongUploadForm({
  artist,
  onClose,
  onUploaded,
}: ArtistSongUploadFormProps) {
  const canUpload =
    artist.status === "approved" && artist.permissions.includes("catalog:upload");
  const canEditMetadata = artist.permissions.includes("catalog:edit");
  const canEditRights = artist.permissions.includes("rights:edit");
  const canManageReleases =
    artist.status === "approved" && artist.permissions.includes("release:manage");
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const artworkInputRef = useRef<HTMLInputElement | null>(null);
  const stemsInputRef = useRef<HTMLInputElement | null>(null);
  const createReleaseArtworkInputRef = useRef<HTMLInputElement | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState<string | null>(null);
  const [stemFiles, setStemFiles] = useState<File[]>([]);
  const [waveformPeaks, setWaveformPeaks] = useState("");
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [songKey, setSongKey] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [moods, setMoods] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [builds, setBuilds] = useState<string[]>([]);
  const [vocals, setVocals] = useState<string[]>([]);
  const [instrumental, setInstrumental] = useState(false);
  const [explicit, setExplicit] = useState(false);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [masterOwner, setMasterOwner] = useState("");
  const [publishingOwner, setPublishingOwner] = useState("");
  const [proAffiliation, setProAffiliation] = useState("");
  const [isrc, setIsrc] = useState("");
  const [iswc, setIswc] = useState("");
  const [copyrightYear, setCopyrightYear] = useState("");
  const [rightsNotes, setRightsNotes] = useState("");
  const [rightsHolders, setRightsHolders] = useState<RightsHolder[]>([]);
  const [releases, setReleases] = useState<ArtistReleaseOption[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [releaseLoadError, setReleaseLoadError] = useState("");
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [useReleaseArtwork, setUseReleaseArtwork] = useState(false);
  const [createReleaseOpen, setCreateReleaseOpen] = useState(false);
  const [createReleaseTitle, setCreateReleaseTitle] = useState("");
  const [createReleaseType, setCreateReleaseType] =
    useState<ReleaseType>("single");
  const [createReleaseDate, setCreateReleaseDate] = useState("");
  const [createReleaseArtworkFile, setCreateReleaseArtworkFile] =
    useState<File | null>(null);
  const [createReleaseArtworkPreviewUrl, setCreateReleaseArtworkPreviewUrl] =
    useState<string | null>(null);
  const [creatingRelease, setCreatingRelease] = useState(false);
  const [createReleaseError, setCreateReleaseError] = useState("");
  const [stage, setStage] = useState<"idle" | "analyzing" | "uploading" | "saving">(
    "idle",
  );
  const [saveStatus, setSaveStatus] = useState("");
  const [error, setError] = useState("");
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const busy = stage !== "idle";
  const selectedRelease = useMemo(
    () => releases.find((release) => release.id === selectedReleaseId) ?? null,
    [releases, selectedReleaseId],
  );
  const displayedArtworkUrl = useReleaseArtwork
    ? selectedRelease?.cover_image_url ?? null
    : artworkPreviewUrl;

  useEffect(() => {
    if (!canManageReleases) return;

    let cancelled = false;
    setReleasesLoading(true);
    setReleaseLoadError("");

    void fetch(`/api/artists/${artist.id}/releases`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as ArtistReleasesResponse;
        if (!response.ok) {
          throw new Error(body.error || "Failed to load releases");
        }
        if (!cancelled) {
          setReleases(Array.isArray(body.releases) ? body.releases : []);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setReleaseLoadError(
            loadError instanceof Error ? loadError.message : "Failed to load releases",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setReleasesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artist.id, canManageReleases]);

  useEffect(() => {
    if (!artworkFile) {
      setArtworkPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(artworkFile);
    setArtworkPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [artworkFile]);

  useEffect(() => {
    if (!createReleaseArtworkFile) {
      setCreateReleaseArtworkPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(createReleaseArtworkFile);
    setCreateReleaseArtworkPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [createReleaseArtworkFile]);

  useEffect(() => {
    if (useReleaseArtwork && !selectedRelease?.cover_image_url) {
      setUseReleaseArtwork(false);
    }
  }, [selectedRelease, useReleaseArtwork]);

  const ownershipTotals = useMemo(() => {
    let master = 0;
    let publishing = 0;

    for (const holder of rightsHolders) {
      const percent = Number(holder.ownership_percent) || 0;
      if (holder.rights_type === "master" || holder.rights_type === "both") {
        master += percent;
      }
      if (holder.rights_type === "publishing" || holder.rights_type === "both") {
        publishing += percent;
      }
    }

    return {
      master: Math.round(master * 100) / 100,
      publishing: Math.round(publishing * 100) / 100,
    };
  }, [rightsHolders]);

  const rightsComplete =
    !canEditRights ||
    (rightsHolders.length > 0 &&
      Math.abs(ownershipTotals.master - 100) <= 0.01 &&
      Math.abs(ownershipTotals.publishing - 100) <= 0.01);

  const uploadWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!audioFile) warnings.push("Audio file missing");
    if (!title.trim()) warnings.push("Song title missing");
    if (!bpm.trim()) warnings.push("BPM missing");
    if (!songKey.trim()) warnings.push("Key missing");
    if (!duration) warnings.push("Duration missing");
    if (genres.length === 0) warnings.push("Genre tags empty");
    if (moods.length === 0) warnings.push("Mood tags empty");
    if (instruments.length === 0) warnings.push("Instrument tags empty");
    if (builds.length === 0) warnings.push("Build tags empty");
    if (!instrumental && vocals.length === 0) warnings.push("Vocals tags empty");
    if (!rightsComplete) {
      warnings.push("Master and publishing ownership must each total 100%");
    }
    return warnings;
  }, [
    audioFile,
    title,
    bpm,
    songKey,
    duration,
    genres,
    moods,
    instruments,
    builds,
    vocals,
    instrumental,
    rightsComplete,
  ]);

  function updateCredit(index: number, patch: Partial<Credit>) {
    setCredits((current) =>
      current.map((credit, creditIndex) =>
        creditIndex === index ? { ...credit, ...patch } : credit,
      ),
    );
  }

  function updateHolder(index: number, patch: Partial<RightsHolder>) {
    setRightsHolders((current) =>
      current.map((holder, holderIndex) =>
        holderIndex === index ? { ...holder, ...patch } : holder,
      ),
    );
  }

  async function handleAudioFileChange(file: File | null) {
    setAudioFile(file);
    setWaveformPeaks("");
    setDuration(0);
    setBpm("");
    setSongKey("");
    setSaveStatus("");
    setError("");
    setUploadComplete(false);

    if (!file) return;

    if (!title.trim()) {
      setTitle(titleFromFileName(file.name));
    }

    try {
      setStage("analyzing");
      setSaveStatus("Generating waveform peaks and estimating BPM/key...");
      const analysis = await analyzeArtistSongAudioFile(file, artist.id, 1500);
      setWaveformPeaks(analysis.peaksJson);
      setDuration(analysis.duration);

      if (analysis.bpm) {
        setBpm(String(analysis.bpm));
      }

      if (analysis.detectedKey && KEY_OPTIONS.includes(analysis.detectedKey)) {
        setSongKey(analysis.detectedKey);
      }

      setSaveStatus(
        `Generated ${analysis.peakCount.toLocaleString()} peaks${
          analysis.bpm ? ` and suggested ${analysis.bpm} BPM` : ""
        } — key ${analysis.detectedKey ?? "n/a"}, duration ${formatDuration(analysis.duration)}.`,
      );
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? `Failed to generate peaks/BPM/key: ${analysisError.message}`
          : "Failed to generate peaks/BPM/key.",
      );
    } finally {
      setStage("idle");
    }
  }

  function handleArtworkFileChange(file: File | null) {
    setArtworkFile(file);
    if (file) setUseReleaseArtwork(false);
    setError("");
    setSaveStatus("");
  }

  function handleStemFilesChange(files: FileList | null) {
    setStemFiles(files ? Array.from(files) : []);
    setError("");
    setSaveStatus("");
    setUploadComplete(false);
  }

  function clearStemFiles() {
    setStemFiles([]);
    setError("");
    setSaveStatus("");
    setUploadComplete(false);
    if (stemsInputRef.current) stemsInputRef.current.value = "";
  }

  function resetCreateReleaseForm() {
    setCreateReleaseTitle("");
    setCreateReleaseType("single");
    setCreateReleaseDate("");
    setCreateReleaseArtworkFile(null);
    setCreateReleaseError("");
    if (createReleaseArtworkInputRef.current) {
      createReleaseArtworkInputRef.current.value = "";
    }
  }

  function closeCreateReleaseModal() {
    if (creatingRelease) return;
    setCreateReleaseOpen(false);
    resetCreateReleaseForm();
  }

  async function handleCreateRelease() {
    if (
      !canManageReleases ||
      creatingRelease ||
      !createReleaseTitle.trim() ||
      !createReleaseArtworkFile
    ) {
      return;
    }

    try {
      setCreatingRelease(true);
      setCreateReleaseError("");

      const response = await fetch(`/api/artists/${artist.id}/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createReleaseTitle.trim(),
          release_type: createReleaseType,
          release_date: createReleaseDate || null,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ArtistReleasesResponse;

      if (!response.ok || !body.release) {
        throw new Error(body.error || "Failed to create release");
      }

      let release = body.release;

      try {
        const artworkFormData = new FormData();
        artworkFormData.append("file", createReleaseArtworkFile);

        const artworkResponse = await fetch(
          `/api/artists/${artist.id}/releases/${release.id}/artwork`,
          { method: "POST", body: artworkFormData },
        );
        const artworkBody = (await artworkResponse.json().catch(() => ({}))) as ArtistArtworkResponse;

        if (!artworkResponse.ok || !artworkBody.release?.cover_image_url) {
          throw new Error(artworkBody.error || "Failed to upload release artwork");
        }

        release = {
          ...release,
          cover_image_url: artworkBody.release.cover_image_url,
        };
      } catch (artworkError) {
        await fetch(`/api/artists/${artist.id}/releases/${release.id}`, {
          method: "DELETE",
        }).catch(() => undefined);
        throw artworkError;
      }

      setReleases((current) => [
        release,
        ...current.filter((item) => item.id !== release.id),
      ]);
      setSelectedReleaseId(release.id);
      setUseReleaseArtwork(!artworkFile);
      setCreateReleaseOpen(false);
      resetCreateReleaseForm();
    } catch (createError) {
      setCreateReleaseError(
        createError instanceof Error
          ? createError.message
          : "Failed to create release",
      );
    } finally {
      setCreatingRelease(false);
    }
  }

  function resetPage() {
    setAudioFile(null);
    setArtworkFile(null);
    setStemFiles([]);
    setWaveformPeaks("");
    setDuration(0);
    setTitle("");
    setBpm("");
    setSongKey("");
    setGenres([]);
    setMoods([]);
    setRegions([]);
    setInstruments([]);
    setBuilds([]);
    setVocals([]);
    setInstrumental(false);
    setExplicit(false);
    setCredits([]);
    setMasterOwner("");
    setPublishingOwner("");
    setProAffiliation("");
    setIsrc("");
    setIswc("");
    setCopyrightYear("");
    setRightsNotes("");
    setRightsHolders([]);
    setSelectedReleaseId("");
    setUseReleaseArtwork(false);
    setSaveStatus("");
    setError("");
    setWarningsOpen(false);
    setUploadComplete(false);
    if (audioInputRef.current) audioInputRef.current.value = "";
    if (artworkInputRef.current) artworkInputRef.current.value = "";
    if (stemsInputRef.current) stemsInputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (uploadComplete) {
      resetPage();
      return;
    }

    if (!canUpload || !canEditMetadata || busy) return;

    if (!audioFile) {
      setError("Choose an audio file before uploading.");
      return;
    }
    if (!title.trim()) {
      setError("Add a song title before uploading.");
      return;
    }
    if (!waveformPeaks || !duration) {
      setError("Wait for the audio analysis to finish before uploading.");
      return;
    }
    if (!rightsComplete) {
      setError("Master and publishing ownership splits must each total 100% before uploading.");
      return;
    }

    try {
      setError("");
      setSaveStatus("Uploading and processing audio...");
      setStage("uploading");

      const formData = new FormData();
      formData.append("file", audioFile);
      stemFiles.forEach((stemFile) => formData.append("stems", stemFile));
      formData.append("title", title.trim());
      formData.append("waveformPeaks", waveformPeaks);
      formData.append("duration", String(duration));
      if (selectedReleaseId) formData.append("releaseId", selectedReleaseId);
      if (useReleaseArtwork) formData.append("useReleaseArtwork", "true");

      const uploadResponse = await fetch(`/api/artists/${artist.id}/songs`, {
        method: "POST",
        body: formData,
      });
      const uploadBody = (await uploadResponse.json().catch(() => ({}))) as ArtistSongsResponse;

      if (!uploadResponse.ok || !uploadBody.song) {
        throw new Error(uploadBody.error || "Failed to upload song");
      }

      const uploadedSong = uploadBody.song;
      onUploaded(uploadedSong);

      setStage("saving");
      setSaveStatus("Saving metadata, credits, and rights...");

      const detailBody: Record<string, unknown> = {
        metadata: {
          title: title.trim(),
          bpm,
          key: songKey,
          genres,
          moods,
          regions,
          instruments,
          builds,
          vocals,
          instrumental,
          explicit,
        },
        credits,
      };

      if (canEditRights) {
        detailBody.rights = {
          master_owner: masterOwner,
          publishing_owner: publishingOwner,
          pro_affiliation: proAffiliation,
          isrc,
          iswc,
          copyright_year: copyrightYear,
          notes: rightsNotes,
        };
        detailBody.rights_holders = rightsHolders;
      }

      const detailsResponse = await fetch(
        `/api/artists/${artist.id}/songs/${uploadedSong.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(detailBody),
        },
      );
      const detailsBody = (await detailsResponse.json().catch(() => ({}))) as ArtistSongsResponse;

      if (!detailsResponse.ok || !detailsBody.song) {
        throw new Error(
          detailsBody.error ||
            "Audio uploaded, but the track details could not be saved. Return to Music to finish the draft.",
        );
      }

      if (artworkFile && !useReleaseArtwork) {
        setSaveStatus("Uploading song artwork...");
        const artworkFormData = new FormData();
        artworkFormData.append("file", artworkFile);

        const artworkResponse = await fetch(
          `/api/artists/${artist.id}/songs/${uploadedSong.id}/artwork`,
          { method: "POST", body: artworkFormData },
        );
        const artworkBody = (await artworkResponse.json().catch(() => ({}))) as ArtistArtworkResponse;

        if (!artworkResponse.ok || !artworkBody.song?.cover_url) {
          throw new Error(
            artworkBody.error ||
              "Song saved, but its artwork could not be uploaded. Return to Music to finish the draft.",
          );
        }
      }

      setUploadComplete(true);
      setSaveStatus("Song uploaded and saved as a draft.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Failed to upload song",
      );
      setSaveStatus("");
    } finally {
      setStage("idle");
    }
  }

  return (
    <div>
      <style>{`
        .admin-song-form-card {
          overflow: hidden;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--bg-secondary);
        }

        .admin-song-form-card-header {
          display: flex;
          min-height: 40px;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border-bottom: 1px solid var(--border);
          padding: 0 1rem;
        }

        .admin-song-form-kicker {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .admin-song-file-row {
          display: grid;
          grid-template-columns: 150px minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.75rem;
          border-top: 1px solid var(--border-subtle);
          padding: 0.75rem 1rem;
        }

        .admin-song-file-row:first-child {
          border-top: 0;
        }

        @media (max-width: 900px) {
          .admin-song-file-row {
            grid-template-columns: 1fr;
            align-items: start;
          }
        }
      `}</style>

      <div className="mb-4 flex min-h-10 flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={!canUpload || busy || uploadComplete}
          onClick={() => audioInputRef.current?.click()}
          className="filmwave-backend-button filmwave-backend-button-secondary"
        >
          <AudioFileIcon />
          <span>Choose Audio</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="filmwave-backend-button filmwave-backend-button-secondary"
        >
          Back to Music
        </button>
      </div>

      <form
        className="grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
        onSubmit={handleSubmit}
      >
        <div className="grid min-w-0 gap-4">
          <section className="admin-song-form-card">
            <div className="admin-song-form-card-header">
              <div className="admin-song-form-kicker">Files</div>
            </div>

            <div>
              <div className="admin-song-file-row">
                <div>
                  <div className="text-xs font-medium text-[var(--text-primary)]">
                    Audio File
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Main track source
                  </div>
                </div>

                <div className="min-w-0">
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    disabled={!canUpload || busy || uploadComplete}
                    onChange={(event) =>
                      void handleAudioFileChange(event.target.files?.[0] ?? null)
                    }
                    className="hidden"
                  />

                  <div className="flex h-9 min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3">
                    <button
                      type="button"
                      disabled={!canUpload || busy || uploadComplete}
                      onClick={() => audioInputRef.current?.click()}
                      className="h-6 cursor-pointer whitespace-nowrap rounded-full bg-[var(--text-primary)] px-3 text-[11px] font-semibold text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Choose
                    </button>
                    <span className="truncate text-xs text-[var(--text-secondary)]">
                      {audioFile ? audioFile.name : "No file chosen"}
                    </span>
                  </div>

                  {stage === "analyzing" ? (
                    <div className="mt-2 flex items-start gap-2">
                      <div className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border border-[var(--border)] border-t-[var(--text-primary)]" />
                      <p className="text-[11px] leading-5 text-[var(--text-secondary)]">
                        Generating waveform peaks and estimating BPM/key...
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-end">
                  {audioFile && !uploadComplete ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleAudioFileChange(null)}
                      className="text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="admin-song-file-row">
                <div>
                  <div className="text-xs font-medium text-[var(--text-primary)]">
                    Cover Image
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Artwork preview
                  </div>
                </div>

                <div className="min-w-0">
                  <input
                    ref={artworkInputRef}
                    type="file"
                    accept="image/*"
                    disabled={!canEditMetadata || busy || uploadComplete}
                    onChange={(event) =>
                      handleArtworkFileChange(event.target.files?.[0] ?? null)
                    }
                    className="hidden"
                  />

                  <div className="flex h-9 min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3">
                    <button
                      type="button"
                      disabled={!canEditMetadata || busy || uploadComplete}
                      onClick={() => artworkInputRef.current?.click()}
                      className="h-6 cursor-pointer whitespace-nowrap rounded-full bg-[var(--text-primary)] px-3 text-[11px] font-semibold text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Choose
                    </button>
                    <span className="truncate text-xs text-[var(--text-secondary)]">
                      {useReleaseArtwork && selectedRelease
                        ? `${selectedRelease.title} artwork`
                        : artworkFile
                          ? artworkFile.name
                          : "No file chosen"}
                    </span>
                  </div>

                  {selectedRelease?.cover_image_url && !uploadComplete ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setUseReleaseArtwork((current) => !current)}
                      className={`mt-2 text-[11px] font-medium transition hover:text-[var(--text-primary)] disabled:opacity-50 ${
                        useReleaseArtwork
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {useReleaseArtwork
                        ? "Using release artwork"
                        : `Use ${selectedRelease.title} artwork`}
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-3">
                  {displayedArtworkUrl ? (
                    <div className="h-9 w-9 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-primary)]">
                      <img
                        src={displayedArtworkUrl}
                        alt="Cover preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}

                  {(artworkFile || useReleaseArtwork) && !uploadComplete ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setArtworkFile(null);
                        setUseReleaseArtwork(false);
                        if (artworkInputRef.current) artworkInputRef.current.value = "";
                      }}
                      className="text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="admin-song-file-row">
                <div>
                  <div className="text-xs font-medium text-[var(--text-primary)]">
                    Stems
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Alt mixes / instrumentals
                  </div>
                </div>

                <div className="min-w-0">
                  <input
                    ref={stemsInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    disabled={!canUpload || busy || uploadComplete}
                    onChange={(event) => handleStemFilesChange(event.target.files)}
                    className="hidden"
                  />

                  <div className="flex h-9 min-w-0 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3">
                    <button
                      type="button"
                      disabled={!canUpload || busy || uploadComplete}
                      onClick={() => stemsInputRef.current?.click()}
                      className="h-6 cursor-pointer whitespace-nowrap rounded-full bg-[var(--text-primary)] px-3 text-[11px] font-semibold text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Choose
                    </button>
                    <span className="truncate text-xs text-[var(--text-secondary)]">
                      {stemFiles.length > 0
                        ? `${stemFiles.length} file${stemFiles.length === 1 ? "" : "s"} chosen`
                        : "No file chosen"}
                    </span>
                  </div>

                  {stemFiles.length > 0 ? (
                    <div className="mt-2 grid gap-1 text-[11px] text-[var(--text-muted)]">
                      {stemFiles.slice(0, 3).map((file) => (
                        <div key={`${file.name}-${file.size}`} className="truncate">
                          {file.name}
                        </div>
                      ))}
                      {stemFiles.length > 3 ? (
                        <div>+ {stemFiles.length - 3} more</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-end">
                  {stemFiles.length > 0 && !uploadComplete ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={clearStemFiles}
                      className="text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:opacity-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="filmwave-backend-section">
            <div className="filmwave-backend-section-header">
              <h2 className="filmwave-backend-section-title">Song Info</h2>
            </div>

            <div className="grid gap-2 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <input
                  aria-label="Song Title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Song Title"
                  disabled={!canEditMetadata || busy || uploadComplete}
                  className="filmwave-backend-input"
                />
              </div>
              <div>
                <input
                  aria-label="Artist"
                  value={artist.name}
                  readOnly
                  className="filmwave-backend-input"
                />
              </div>
              {canManageReleases ? (
                <div>
                  <SelectInput
                    value={selectedReleaseId}
                    onChange={(value) => {
                      if (value === "__create__") {
                        setCreateReleaseOpen(true);
                        return;
                      }
                      setSelectedReleaseId(value);
                      setUseReleaseArtwork(false);
                    }}
                    disabled={busy || uploadComplete || releasesLoading}
                  >
                    <option value="">
                      {releasesLoading ? "Loading releases..." : "Not part of a release"}
                    </option>
                    {releases.map((release) => (
                      <option key={release.id} value={release.id}>
                        {release.title}
                      </option>
                    ))}
                    <option value="__create__">+ Create new release</option>
                  </SelectInput>
                  {releaseLoadError ? (
                    <div className="mt-1 text-[10px] leading-4 text-[var(--danger)]">
                      {releaseLoadError}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div>
                <NumericInput
                  value={bpm}
                  onChange={setBpm}
                  placeholder="110"
                  disabled={!canEditMetadata || busy || uploadComplete}
                />
              </div>
              <div>
                <SelectInput
                  value={songKey}
                  onChange={setSongKey}
                  disabled={!canEditMetadata || busy || uploadComplete}
                >
                  <option value="">Select key</option>
                  {KEY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <input
                  aria-label="Duration"
                  value={formatDuration(duration)}
                  readOnly
                  placeholder="Auto-detected"
                  className="filmwave-backend-input"
                />
              </div>
              <div>
                <CheckboxInput
                  checked={instrumental}
                  onChange={setInstrumental}
                  label="Instrumental"
                  disabled={!canEditMetadata || busy || uploadComplete}
                />
              </div>
              <div>
                <CheckboxInput
                  checked={explicit}
                  onChange={setExplicit}
                  label="Explicit"
                  disabled={!canEditMetadata || busy || uploadComplete}
                />
              </div>
            </div>
          </section>

          <section className="filmwave-backend-section">
            <div className="filmwave-backend-section-header">
              <h2 className="filmwave-backend-section-title">Tags</h2>
            </div>
            <div className="grid gap-5 px-5 pb-5">
              {[
                ["Genre", GENRE_OPTIONS, genres, setGenres],
                ["Mood", MOOD_OPTIONS, moods, setMoods],
                ["Region", REGION_OPTIONS, regions, setRegions],
                ["Instrument", INSTRUMENT_OPTIONS, instruments, setInstruments],
                ["Build", BUILD_OPTIONS, builds, setBuilds],
                ["Vocals", VOCALS_OPTIONS, vocals, setVocals],
              ].map(([label, options, selected, setter]) => (
                <div key={label as string}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <FieldLabel>{label as string}</FieldLabel>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {(selected as string[]).length} selected
                    </span>
                  </div>
                  <MultiSelectPills
                    options={options as readonly string[]}
                    selected={selected as string[]}
                    onChange={setter as (value: string[]) => void}
                    disabled={!canEditMetadata || busy || uploadComplete}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="filmwave-backend-section">
            <div className="filmwave-backend-section-header">
              <h2 className="filmwave-backend-section-title">Credits</h2>
            </div>
            <div className="grid gap-3 px-5 pb-5">
              {credits.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)]">No credits added yet.</div>
              ) : null}
              {credits.map((credit, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={credit.credit_name}
                    onChange={(event) =>
                      updateCredit(index, { credit_name: event.target.value })
                    }
                    placeholder="Name"
                    disabled={!canEditMetadata || busy || uploadComplete}
                    className="filmwave-backend-input"
                  />
                  <input
                    value={credit.credit_role}
                    onChange={(event) =>
                      updateCredit(index, { credit_role: event.target.value })
                    }
                    placeholder="Role — composer, producer, performer..."
                    disabled={!canEditMetadata || busy || uploadComplete}
                    className="filmwave-backend-input"
                  />
                  <button
                    type="button"
                    disabled={!canEditMetadata || busy || uploadComplete}
                    onClick={() =>
                      setCredits((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    className="filmwave-backend-button filmwave-backend-button-secondary"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {canEditMetadata && !uploadComplete ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setCredits((current) => [...current, emptyCredit()])}
                  className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary mt-1 w-fit"
                >
                  Add credit
                </button>
              ) : null}
            </div>
          </section>

          <section className="filmwave-backend-section">
            <div className="filmwave-backend-section-header">
              <h2 className="filmwave-backend-section-title">Rights + Ownership</h2>
            </div>
            <div className="grid gap-5 px-5 pb-5">
              {!canEditRights ? (
                <div className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-xs leading-5 text-[var(--text-muted)]">
                  Your role cannot edit ownership. You can upload the draft, and a manager or owner can complete rights before submission.
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <FieldLabel>Master Owner</FieldLabel>
                  <input value={masterOwner} onChange={(event) => setMasterOwner(event.target.value)} disabled={!canEditRights || busy || uploadComplete} className="filmwave-backend-input" />
                </div>
                <div>
                  <FieldLabel>Publishing Owner</FieldLabel>
                  <input value={publishingOwner} onChange={(event) => setPublishingOwner(event.target.value)} disabled={!canEditRights || busy || uploadComplete} className="filmwave-backend-input" />
                </div>
                <div>
                  <FieldLabel>PRO Affiliation</FieldLabel>
                  <input value={proAffiliation} onChange={(event) => setProAffiliation(event.target.value)} placeholder="SOCAN, ASCAP, BMI..." disabled={!canEditRights || busy || uploadComplete} className="filmwave-backend-input" />
                </div>
                <div>
                  <FieldLabel>Copyright Year</FieldLabel>
                  <input type="number" min={1900} max={2200} value={copyrightYear} onChange={(event) => setCopyrightYear(event.target.value)} disabled={!canEditRights || busy || uploadComplete} className="filmwave-backend-input" />
                </div>
                <div>
                  <FieldLabel>ISRC</FieldLabel>
                  <input value={isrc} onChange={(event) => setIsrc(event.target.value)} disabled={!canEditRights || busy || uploadComplete} className="filmwave-backend-input" />
                </div>
                <div>
                  <FieldLabel>ISWC</FieldLabel>
                  <input value={iswc} onChange={(event) => setIswc(event.target.value)} disabled={!canEditRights || busy || uploadComplete} className="filmwave-backend-input" />
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <FieldLabel>Ownership Splits</FieldLabel>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Master: {ownershipTotals.master}% · Publishing: {ownershipTotals.publishing}%
                    </div>
                  </div>
                  {canEditRights && !uploadComplete ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setRightsHolders((current) => [...current, emptyHolder()])
                      }
                      className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary"
                    >
                      Add rights holder
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  {rightsHolders.length === 0 ? (
                    <div className="text-xs text-[var(--text-muted)]">
                      No ownership splits added yet.
                    </div>
                  ) : null}
                  {rightsHolders.map((holder, index) => (
                    <div key={index} className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_160px_110px_1fr_1fr_auto]">
                        <input value={holder.holder_name} onChange={(event) => updateHolder(index, { holder_name: event.target.value })} placeholder="Rights holder" disabled={!canEditRights || busy || uploadComplete} className="filmwave-backend-input" />
                        <SelectInput value={holder.rights_type} onChange={(value) => updateHolder(index, { rights_type: value as RightsHolder["rights_type"] })} disabled={!canEditRights || busy || uploadComplete}>
                          <option value="both">Master + publishing</option>
                          <option value="master">Master</option>
                          <option value="publishing">Publishing</option>
                        </SelectInput>
                        <input type="number" min={0} max={100} step="0.01" value={holder.ownership_percent} onChange={(event) => updateHolder(index, { ownership_percent: event.target.value })} placeholder="%" disabled={!canEditRights || busy || uploadComplete} className="filmwave-backend-input" />
                        <input value={holder.pro_affiliation} onChange={(event) => updateHolder(index, { pro_affiliation: event.target.value })} placeholder="PRO" disabled={!canEditRights || busy || uploadComplete} className="filmwave-backend-input" />
                        <input value={holder.ipi_cae_number} onChange={(event) => updateHolder(index, { ipi_cae_number: event.target.value })} placeholder="IPI / CAE" disabled={!canEditRights || busy || uploadComplete} className="filmwave-backend-input" />
                        <button type="button" disabled={!canEditRights || busy || uploadComplete} onClick={() => setRightsHolders((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="filmwave-backend-button filmwave-backend-button-secondary">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>Rights Notes</FieldLabel>
                <textarea
                  value={rightsNotes}
                  onChange={(event) => setRightsNotes(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  disabled={!canEditRights || busy || uploadComplete}
                  className="filmwave-backend-textarea"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="grid h-fit gap-4 xl:sticky xl:top-[24px]">
          <section className="filmwave-backend-section">
            <div className="filmwave-backend-section-header">
              <h2 className="filmwave-backend-section-title">Checklist</h2>
            </div>
            <div className="grid gap-2 px-5 pb-5">
              {uploadWarnings.length > 0 && !uploadComplete ? (
                <>
                  <div className="rounded-[7px] bg-[var(--status-error-soft,rgba(220,88,79,0.08))] p-3 text-xs leading-5 text-[var(--status-error,#dc584f)]">
                    <div className="flex items-center gap-2 font-medium">
                      <WarningIcon />
                      <span>
                        {uploadWarnings.length} item{uploadWarnings.length === 1 ? "" : "s"} need attention
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">
                      {uploadWarnings[0]}
                      {uploadWarnings.length > 1 ? ` + ${uploadWarnings.length - 1} more` : ""}
                    </div>
                    {uploadWarnings.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setWarningsOpen((current) => !current)}
                        className="mt-2 text-[11px] font-medium text-[var(--text-secondary)] underline-offset-4 transition hover:text-[var(--text-primary)] hover:underline"
                      >
                        {warningsOpen ? "Hide warnings" : "Show warnings"}
                      </button>
                    ) : null}
                  </div>
                  {warningsOpen && uploadWarnings.length > 1 ? (
                    <ul className="grid gap-1.5 rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] p-3 text-[11px] leading-5 text-[var(--text-secondary)]">
                      {uploadWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[7px] bg-[var(--status-success-soft,rgba(72,181,113,0.08))] p-3 text-xs font-medium text-[var(--status-success,#48b571)]">
                  Ready to save
                </div>
              )}
            </div>
          </section>

          {(saveStatus || error) ? (
            <section className="filmwave-backend-section">
              <div className="filmwave-backend-section-header">
                <h2 className="filmwave-backend-section-title">Upload Status</h2>
              </div>
              <div className="grid gap-3 px-5 pb-5">
                {error ? (
                  <div className="rounded-[7px] bg-[var(--status-error-soft,rgba(220,88,79,0.08))] p-3 text-xs leading-5 text-[var(--status-error,#dc584f)]">
                    {error}
                  </div>
                ) : null}
                {saveStatus ? (
                  <div className="rounded-[7px] bg-[var(--bg-tertiary)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
                    {saveStatus}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="filmwave-backend-section">
            <div className="filmwave-backend-section-header">
              <h2 className="filmwave-backend-section-title">Actions</h2>
            </div>
            <div className="grid gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="filmwave-backend-button filmwave-backend-button-secondary w-full"
              >
                Back to Music
              </button>
              <button
                type="submit"
                disabled={!canUpload || !canEditMetadata || busy}
                className="filmwave-backend-button filmwave-backend-button-primary w-full"
              >
                {!busy ? <UploadIcon size={15} /> : null}
                <span>
                  {uploadComplete
                    ? "Upload Another Song"
                    : stage === "analyzing"
                      ? "Analyzing..."
                      : stage === "uploading"
                        ? "Uploading..."
                        : stage === "saving"
                          ? "Saving..."
                          : "Upload Song"}
                </span>
              </button>
            </div>
          </section>
        </aside>
      </form>

      <AdminModalShell
        isOpen={createReleaseOpen}
        title="Create release"
        onClose={closeCreateReleaseModal}
        closeLabel="Close create release"
        footer={
          <>
            <button
              type="button"
              onClick={closeCreateReleaseModal}
              disabled={creatingRelease}
              className="filmwave-backend-button filmwave-backend-button-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateRelease()}
              disabled={
                creatingRelease ||
                !createReleaseTitle.trim() ||
                !createReleaseArtworkFile
              }
              className="filmwave-backend-button filmwave-backend-button-primary"
            >
              {creatingRelease ? "Creating..." : "Create Release"}
            </button>
          </>
        }
      >
        <div className="grid gap-4 pb-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-[var(--text-secondary)]">
              Release title
            </span>
            <input
              type="text"
              value={createReleaseTitle}
              onChange={(event) => setCreateReleaseTitle(event.target.value)}
              maxLength={180}
              disabled={creatingRelease}
              className="filmwave-backend-input"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-[var(--text-secondary)]">
                Type
              </span>
              <SelectInput
                value={createReleaseType}
                onChange={(value) => setCreateReleaseType(value as ReleaseType)}
                disabled={creatingRelease}
              >
                {RELEASE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-medium text-[var(--text-secondary)]">
                Release date
              </span>
              <input
                type="date"
                value={createReleaseDate}
                onChange={(event) => setCreateReleaseDate(event.target.value)}
                disabled={creatingRelease}
                className="filmwave-backend-input"
              />
            </label>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-medium text-[var(--text-secondary)]">
              <span>Cover artwork</span>
              <span className="text-[var(--text-muted)]">Required</span>
            </div>
            <input
              ref={createReleaseArtworkInputRef}
              type="file"
              accept="image/*"
              disabled={creatingRelease}
              onChange={(event) =>
                setCreateReleaseArtworkFile(event.target.files?.[0] ?? null)
              }
              className="hidden"
            />
            <div className="flex h-10 min-w-0 items-center gap-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3">
              <button
                type="button"
                disabled={creatingRelease}
                onClick={() => createReleaseArtworkInputRef.current?.click()}
                className="h-6 cursor-pointer whitespace-nowrap rounded-full bg-[var(--text-primary)] px-3 text-[11px] font-semibold text-[var(--bg-primary)] transition hover:opacity-80 disabled:opacity-50"
              >
                Choose
              </button>
              <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-secondary)]">
                {createReleaseArtworkFile
                  ? createReleaseArtworkFile.name
                  : "No file chosen"}
              </span>
              {createReleaseArtworkPreviewUrl ? (
                <div className="h-7 w-7 overflow-hidden rounded-[5px] border border-[var(--border)]">
                  <img
                    src={createReleaseArtworkPreviewUrl}
                    alt="Release artwork preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          </div>

          {createReleaseError ? (
            <div className="text-xs leading-5 text-[var(--danger)]">
              {createReleaseError}
            </div>
          ) : null}
        </div>
      </AdminModalShell>
    </div>
  );
}
