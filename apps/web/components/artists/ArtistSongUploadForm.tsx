"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

import AudioFileIcon from "@/components/icons/AudioFileIcon";
import CheckMarkIcon from "@/components/icons/CheckMarkIcon";
import ChevronDownIcon from "@/components/icons/ChevronDownIcon";
import ChevronUpIcon from "@/components/icons/ChevronUpIcon";
import UploadIcon from "@/components/icons/UploadIcon";
import WarningIcon from "@/components/icons/WarningIcon";
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
  "Abmaj",
  "Abmin",
  "Amaj",
  "Amin",
  "Bbmaj",
  "Bbmin",
  "Bmaj",
  "Bmin",
] as const;

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function downsamplePeaks(peaks: Float32Array, targetLength = 1500) {
  if (peaks.length <= targetLength) {
    return Array.from(peaks).map((peak) => Number(peak.toFixed(6)));
  }

  const output: number[] = [];
  const blockSize = Math.max(1, Math.floor(peaks.length / targetLength));

  for (let index = 0; index < targetLength; index += 1) {
    const start = index * blockSize;
    const end = Math.min(peaks.length, start + blockSize);
    let strongestPeak = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const sample = peaks[sampleIndex];
      if (Math.abs(sample) > Math.abs(strongestPeak)) {
        strongestPeak = sample;
      }
    }

    output.push(Number(strongestPeak.toFixed(6)));
  }

  return output;
}

async function analyzeAudioFile(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const peaks = downsamplePeaks(audioBuffer.getChannelData(0));

    return {
      waveformPeaks: JSON.stringify(peaks),
      duration: audioBuffer.duration,
    };
  } finally {
    await audioContext.close();
  }
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
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`filmwave-backend-select filmwave-backend-select-end-control appearance-none ${
          value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
        }`}
      >
        {children}
      </select>
      <ChevronDownIcon
        size={16}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
      />
    </div>
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
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
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
  const [stage, setStage] = useState<"idle" | "analyzing" | "uploading" | "saving">(
    "idle",
  );
  const [saveStatus, setSaveStatus] = useState("");
  const [error, setError] = useState("");
  const [warningsOpen, setWarningsOpen] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const busy = stage !== "idle";

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
    setSaveStatus("");
    setError("");
    setUploadComplete(false);

    if (!file) return;

    if (!title.trim()) {
      setTitle(titleFromFileName(file.name));
    }

    try {
      setStage("analyzing");
      setSaveStatus("Generating waveform and reading duration...");
      const analysis = await analyzeAudioFile(file);
      setWaveformPeaks(analysis.waveformPeaks);
      setDuration(analysis.duration);
      setSaveStatus("Audio ready.");
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? `Audio analysis failed: ${analysisError.message}`
          : "Audio analysis failed.",
      );
    } finally {
      setStage("idle");
    }
  }

  function resetPage() {
    setAudioFile(null);
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
    setSaveStatus("");
    setError("");
    setWarningsOpen(false);
    setUploadComplete(false);
    if (audioInputRef.current) audioInputRef.current.value = "";
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
      formData.append("title", title.trim());
      formData.append("waveformPeaks", waveformPeaks);
      formData.append("duration", String(duration));

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
      <div className="mb-4 flex min-h-10 flex-wrap items-center justify-between gap-3">
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
          <section className="filmwave-backend-section">
            <div className="filmwave-backend-section-header">
              <h2 className="filmwave-backend-section-title">Files</h2>
            </div>

            <div className="px-5 pb-5">
              <div className="grid min-h-10 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3">
                <div className="text-xs font-medium text-[var(--text-primary)]">
                  Audio
                </div>
                <span className="truncate text-xs text-[var(--text-secondary)]">
                  {audioFile ? audioFile.name : "No file chosen"}
                </span>
                {audioFile && !uploadComplete ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAudioFileChange(null)}
                    className="text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--danger)] disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {stage === "analyzing" ? (
                <p className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">
                  Generating waveform and reading duration...
                </p>
              ) : null}
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
    </div>
  );
}
