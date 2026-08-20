"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  BackendCheckbox,
  BackendChoiceButton,
  BackendInput,
  BackendSelect,
} from "@/components/backend/BackendControls";
import BackendSongFileUpload from "@/components/backend/BackendSongFileUpload";
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
    <BackendSelect
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={`filmwave-backend-select-end-control ${
        value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
      }`}
    >
      {children}
    </BackendSelect>
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
      <BackendInput
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="filmwave-backend-input-end-control"
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
    <BackendCheckbox
      checked={checked}
      onChange={onChange}
      label={label}
      disabled={disabled}
      className="h-10 w-full self-end rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3"
    />
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
          <BackendChoiceButton
            key={option}
            type="button"
            disabled={disabled}
            active={active}
            onClick={() =>
              onChange(
                active
                  ? selected.filter((item) => item !== option)
                  : [...selected, option],
              )
            }
          >
            {option}
          </BackendChoiceButton>
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
  const [createReleaseOpen, setCreateReleaseOpen] = useState(false);
  const [createReleaseTitle, setCreateReleaseTitle] = useState("");
  const [createReleaseType, setCreateReleaseType] =
    useState<ReleaseType>("single");
  const [createReleaseDate, setCreateReleaseDate] = useState("");
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
  const releaseArtworkMode = createReleaseOpen || Boolean(selectedReleaseId);
  const releaseArtworkLocked = Boolean(selectedRelease?.cover_image_url);
  const displayedArtworkUrl = selectedRelease?.cover_image_url ?? artworkPreviewUrl;
  const artworkHelp = selectedRelease?.cover_image_url
    ? `This song will use ${selectedRelease.title} release artwork.`
    : releaseArtworkMode
      ? "This image will be used as the release artwork for this song."
      : undefined;

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
    setError("");
    setSaveStatus("");
  }

  function handleStemFilesChange(files: File[]) {
    setStemFiles(files);
    setError("");
    setSaveStatus("");
    setUploadComplete(false);
  }

  function resetCreateReleaseForm() {
    setCreateReleaseTitle("");
    setCreateReleaseType("single");
    setCreateReleaseDate("");
    setCreateReleaseError("");
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
      !artworkFile
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
        artworkFormData.append("file", artworkFile);

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
      setArtworkFile(null);
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
    setCreateReleaseOpen(false);
    resetCreateReleaseForm();
    setSaveStatus("");
    setError("");
    setWarningsOpen(false);
    setUploadComplete(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (uploadComplete) {
      resetPage();
      return;
    }

    if (!canUpload || !canEditMetadata || busy || creatingRelease) return;

    if (createReleaseOpen) {
      setError("Create the release before uploading the song.");
      return;
    }
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
    if (selectedReleaseId && !selectedRelease?.cover_image_url && !artworkFile) {
      setError("Add release artwork before uploading the song.");
      return;
    }

    try {
      setError("");
      setStage("uploading");

      if (selectedReleaseId && !selectedRelease?.cover_image_url && artworkFile) {
        setSaveStatus("Uploading release artwork...");
        const releaseArtworkFormData = new FormData();
        releaseArtworkFormData.append("file", artworkFile);

        const releaseArtworkResponse = await fetch(
          `/api/artists/${artist.id}/releases/${selectedReleaseId}/artwork`,
          { method: "POST", body: releaseArtworkFormData },
        );
        const releaseArtworkBody = (await releaseArtworkResponse
          .json()
          .catch(() => ({}))) as ArtistArtworkResponse;

        if (!releaseArtworkResponse.ok || !releaseArtworkBody.release?.cover_image_url) {
          throw new Error(
            releaseArtworkBody.error || "Failed to upload release artwork",
          );
        }

        setReleases((current) =>
          current.map((release) =>
            release.id === selectedReleaseId
              ? {
                  ...release,
                  cover_image_url: releaseArtworkBody.release?.cover_image_url ?? null,
                }
              : release,
          ),
        );
        setArtworkFile(null);
      }

      setSaveStatus("Uploading and processing audio...");

      const formData = new FormData();
      formData.append("file", audioFile);
      stemFiles.forEach((stemFile) => formData.append("stems", stemFile));
      formData.append("title", title.trim());
      formData.append("waveformPeaks", waveformPeaks);
      formData.append("duration", String(duration));
      if (selectedReleaseId) {
        formData.append("releaseId", selectedReleaseId);
        formData.append("useReleaseArtwork", "true");
      }

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

      if (artworkFile && !selectedReleaseId) {
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
      <form
        className="grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
        onSubmit={handleSubmit}
      >
        <div className="grid min-w-0 gap-4">
          <BackendSongFileUpload
            audioFile={audioFile}
            onAudioFileChange={(file) => void handleAudioFileChange(file)}
            audioStatus={
              stage === "analyzing"
                ? "Generating waveform peaks and estimating BPM/key..."
                : ""
            }
            audioStatusBusy={stage === "analyzing"}
            stemFiles={stemFiles}
            onStemFilesChange={handleStemFilesChange}
            artworkFile={artworkFile}
            artworkPreviewUrl={displayedArtworkUrl}
            onArtworkFileChange={handleArtworkFileChange}
            onRemoveArtwork={() => setArtworkFile(null)}
            artworkTitle={releaseArtworkMode ? "Release image" : "Cover image"}
            artworkActionLabel={
              releaseArtworkMode ? "Choose Release Image" : "Choose Cover Art"
            }
            artworkDisabled={releaseArtworkLocked}
            artworkHelp={artworkHelp}
            topAction={
              <button
                type="button"
                onClick={onClose}
                disabled={busy || creatingRelease}
                className="filmwave-backend-button filmwave-backend-button-secondary"
              >
                Back to Music
              </button>
            }
            disabled={
              !canUpload ||
              !canEditMetadata ||
              busy ||
              creatingRelease ||
              uploadComplete
            }
          />

          <section className="filmwave-backend-section">
            <div className="filmwave-backend-section-header">
              <h2 className="filmwave-backend-section-title">Song Info</h2>
            </div>

            <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <BackendInput
                  aria-label="Song Title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Song Title"
                  disabled={!canEditMetadata || busy || uploadComplete}
                />
              </div>
              <div>
                <BackendInput
                  aria-label="Artist"
                  value={artist.name}
                  placeholder="Artist"
                  readOnly
                />
              </div>
              {canManageReleases ? (
                <div>
                  <SelectInput
                    value={createReleaseOpen ? "__create__" : selectedReleaseId}
                    onChange={(value) => {
                      if (value === "__create__") {
                        resetCreateReleaseForm();
                        setSelectedReleaseId("");
                        setCreateReleaseOpen(true);
                        return;
                      }
                      setCreateReleaseOpen(false);
                      resetCreateReleaseForm();
                      setSelectedReleaseId(value);
                    }}
                    disabled={
                      busy || uploadComplete || releasesLoading || creatingRelease
                    }
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
                  placeholder="BPM"
                  disabled={!canEditMetadata || busy || uploadComplete}
                />
              </div>
              <div>
                <SelectInput
                  value={songKey}
                  onChange={setSongKey}
                  disabled={!canEditMetadata || busy || uploadComplete}
                >
                  <option value="">Key</option>
                  {KEY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <BackendInput
                  aria-label="Duration"
                  value={formatDuration(duration)}
                  readOnly
                  placeholder="Duration"
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

          {createReleaseOpen ? (
            <section className="filmwave-backend-section">
              <div className="filmwave-backend-section-header">
                <h2 className="filmwave-backend-section-title">New Release</h2>
              </div>
              <div className="grid gap-4 px-5 pb-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-[var(--text-secondary)]">
                      Release title
                    </span>
                    <BackendInput
                      type="text"
                      value={createReleaseTitle}
                      onChange={(event) => setCreateReleaseTitle(event.target.value)}
                      maxLength={180}
                      disabled={creatingRelease || busy || uploadComplete}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-medium text-[var(--text-secondary)]">
                      Type
                    </span>
                    <SelectInput
                      value={createReleaseType}
                      onChange={(value) => setCreateReleaseType(value as ReleaseType)}
                      disabled={creatingRelease || busy || uploadComplete}
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
                    <BackendInput
                      type="date"
                      value={createReleaseDate}
                      onChange={(event) => setCreateReleaseDate(event.target.value)}
                      disabled={creatingRelease || busy || uploadComplete}
                    />
                  </label>
                </div>

                {createReleaseError ? (
                  <div className="text-xs leading-5 text-[var(--danger)]">
                    {createReleaseError}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-2">
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
                      busy ||
                      uploadComplete ||
                      !createReleaseTitle.trim() ||
                      !artworkFile
                    }
                    className="filmwave-backend-button filmwave-backend-button-primary"
                  >
                    {creatingRelease ? "Creating..." : "Create Release"}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

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
                  <BackendInput
                    value={credit.credit_name}
                    onChange={(event) =>
                      updateCredit(index, { credit_name: event.target.value })
                    }
                    placeholder="Name"
                    disabled={!canEditMetadata || busy || uploadComplete}
                  />
                  <BackendInput
                    value={credit.credit_role}
                    onChange={(event) =>
                      updateCredit(index, { credit_role: event.target.value })
                    }
                    placeholder="Role — composer, producer, performer..."
                    disabled={!canEditMetadata || busy || uploadComplete}
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
                  <BackendInput value={masterOwner} onChange={(event) => setMasterOwner(event.target.value)} disabled={!canEditRights || busy || uploadComplete} />
                </div>
                <div>
                  <FieldLabel>Publishing Owner</FieldLabel>
                  <BackendInput value={publishingOwner} onChange={(event) => setPublishingOwner(event.target.value)} disabled={!canEditRights || busy || uploadComplete} />
                </div>
                <div>
                  <FieldLabel>PRO Affiliation</FieldLabel>
                  <BackendInput value={proAffiliation} onChange={(event) => setProAffiliation(event.target.value)} placeholder="SOCAN, ASCAP, BMI..." disabled={!canEditRights || busy || uploadComplete} />
                </div>
                <div>
                  <FieldLabel>Copyright Year</FieldLabel>
                  <BackendInput type="number" min={1900} max={2200} value={copyrightYear} onChange={(event) => setCopyrightYear(event.target.value)} disabled={!canEditRights || busy || uploadComplete} />
                </div>
                <div>
                  <FieldLabel>ISRC</FieldLabel>
                  <BackendInput value={isrc} onChange={(event) => setIsrc(event.target.value)} disabled={!canEditRights || busy || uploadComplete} />
                </div>
                <div>
                  <FieldLabel>ISWC</FieldLabel>
                  <BackendInput value={iswc} onChange={(event) => setIswc(event.target.value)} disabled={!canEditRights || busy || uploadComplete} />
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
                        <BackendInput value={holder.holder_name} onChange={(event) => updateHolder(index, { holder_name: event.target.value })} placeholder="Rights holder" disabled={!canEditRights || busy || uploadComplete} />
                        <SelectInput value={holder.rights_type} onChange={(value) => updateHolder(index, { rights_type: value as RightsHolder["rights_type"] })} disabled={!canEditRights || busy || uploadComplete}>
                          <option value="both">Master + publishing</option>
                          <option value="master">Master</option>
                          <option value="publishing">Publishing</option>
                        </SelectInput>
                        <BackendInput type="number" min={0} max={100} step="0.01" value={holder.ownership_percent} onChange={(event) => updateHolder(index, { ownership_percent: event.target.value })} placeholder="%" disabled={!canEditRights || busy || uploadComplete} />
                        <BackendInput value={holder.pro_affiliation} onChange={(event) => updateHolder(index, { pro_affiliation: event.target.value })} placeholder="PRO" disabled={!canEditRights || busy || uploadComplete} />
                        <BackendInput value={holder.ipi_cae_number} onChange={(event) => updateHolder(index, { ipi_cae_number: event.target.value })} placeholder="IPI / CAE" disabled={!canEditRights || busy || uploadComplete} />
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

        <aside className="grid h-fit gap-4 xl:sticky xl:top-[24px] xl:mt-14">
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
                disabled={busy || creatingRelease}
                className="filmwave-backend-button filmwave-backend-button-secondary w-full"
              >
                Back to Music
              </button>
              <button
                type="submit"
                disabled={
                  !canUpload ||
                  !canEditMetadata ||
                  busy ||
                  creatingRelease ||
                  createReleaseOpen
                }
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
    </div>
  );
}