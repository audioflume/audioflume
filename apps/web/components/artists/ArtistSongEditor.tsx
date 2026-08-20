"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BackendCheckbox,
  BackendChoiceButton,
  BackendInput,
  BackendSelect,
} from "@/components/backend/BackendControls";
import ChevronDownIcon from "@/components/icons/ChevronDownIcon";
import ChevronUpIcon from "@/components/icons/ChevronUpIcon";

import type { ArtistDashboardProfile } from "@/lib/artistDashboard";
import {
  BUILD_OPTIONS,
  GENRE_OPTIONS,
  INSTRUMENT_OPTIONS,
  MOOD_OPTIONS,
  REGION_OPTIONS,
  VOCALS_OPTIONS,
} from "@/lib/constants";

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

type SongDetails = {
  id: string;
  title: string;
  status: string;
  duration: number;
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
  created_at: string;
};

type RightsDetails = {
  master_owner: string | null;
  publishing_owner: string | null;
  pro_affiliation: string | null;
  isrc: string | null;
  iswc: string | null;
  copyright_year: number | null;
  rights_confirmed: boolean;
  notes: string | null;
};

type ReviewFeedback = {
  action: "changes_requested" | "rejected";
  notes: string | null;
  created_at: string;
};

type DetailResponse = {
  song?: SongDetails;
  credits?: Array<Credit & { id?: string; position?: number }>;
  rights?: RightsDetails;
  rights_holders?: Array<{
    id?: string;
    holder_name: string;
    rights_type: "master" | "publishing" | "both";
    ownership_percent: number | string | null;
    pro_affiliation: string | null;
    ipi_cae_number: string | null;
  }>;
  review_feedback?: ReviewFeedback | null;
  error?: string;
};

type ArtistSongEditorProps = {
  artist: ArtistDashboardProfile;
  songId: string;
  onClose: () => void;
  onSaved: (song: { id: string; title: string }) => void;
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

function formatDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-1.5 block text-[11px] font-medium text-[var(--text-secondary)]">
      {children}
    </span>
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
  children: ReactNode;
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
  placeholder: string;
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

export default function ArtistSongEditor({
  artist,
  songId,
  onClose,
  onSaved,
}: ArtistSongEditorProps) {
  const canEditMetadata = artist.permissions.includes("catalog:edit");
  const canEditRights = artist.permissions.includes("rights:edit");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewFeedback, setReviewFeedback] = useState<ReviewFeedback | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(0);
  const [bpm, setBpm] = useState("");
  const [keyValue, setKeyValue] = useState("");
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

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setError("");
    setMessage("");
    setReviewFeedback(null);

    async function loadDetails() {
      try {
        const response = await fetch(
          `/api/artists/${artist.id}/songs/${songId}`,
          { cache: "no-store" },
        );
        const body = (await response.json().catch(() => ({}))) as DetailResponse;

        if (!response.ok || !body.song) {
          throw new Error(body.error || "Failed to load track details");
        }

        if (cancelled) return;

        setReviewFeedback(body.review_feedback ?? null);
        setTitle(body.song.title);
        setDuration(Number(body.song.duration) || 0);
        setBpm(body.song.bpm == null ? "" : String(body.song.bpm));
        setKeyValue(body.song.key ?? "");
        setGenres(body.song.genres ?? []);
        setMoods(body.song.moods ?? []);
        setRegions(body.song.regions ?? []);
        setInstruments(body.song.instruments ?? []);
        setBuilds(body.song.builds ?? []);
        setVocals(body.song.vocals ?? []);
        setInstrumental(Boolean(body.song.instrumental));
        setExplicit(Boolean(body.song.explicit));
        setCredits(
          (body.credits ?? []).map((credit) => ({
            credit_name: credit.credit_name,
            credit_role: credit.credit_role,
          })),
        );

        const rights = body.rights;
        setMasterOwner(rights?.master_owner ?? "");
        setPublishingOwner(rights?.publishing_owner ?? "");
        setProAffiliation(rights?.pro_affiliation ?? "");
        setIsrc(rights?.isrc ?? "");
        setIswc(rights?.iswc ?? "");
        setCopyrightYear(
          rights?.copyright_year == null ? "" : String(rights.copyright_year),
        );
        setRightsNotes(rights?.notes ?? "");
        setRightsHolders(
          (body.rights_holders ?? []).map((holder) => ({
            holder_name: holder.holder_name,
            rights_type: holder.rights_type,
            ownership_percent:
              holder.ownership_percent == null
                ? ""
                : String(holder.ownership_percent),
            pro_affiliation: holder.pro_affiliation ?? "",
            ipi_cae_number: holder.ipi_cae_number ?? "",
          })),
        );
        setLoadState("ready");
      } catch (loadError) {
        if (!cancelled) {
          setLoadState("error");
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load track details",
          );
        }
      }
    }

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [artist.id, songId]);

  const ownershipTotals = useMemo(() => {
    let master = 0;
    let publishing = 0;

    for (const holder of rightsHolders) {
      const percent = Number(holder.ownership_percent) || 0;
      if (holder.rights_type === "master" || holder.rights_type === "both") {
        master += percent;
      }
      if (
        holder.rights_type === "publishing" ||
        holder.rights_type === "both"
      ) {
        publishing += percent;
      }
    }

    return {
      master: Math.round(master * 100) / 100,
      publishing: Math.round(publishing * 100) / 100,
    };
  }, [rightsHolders]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEditMetadata || saving || loadState !== "ready") return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const body: Record<string, unknown> = {
        metadata: {
          title,
          bpm,
          key: keyValue,
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
        body.rights = {
          master_owner: masterOwner,
          publishing_owner: publishingOwner,
          pro_affiliation: proAffiliation,
          isrc,
          iswc,
          copyright_year: copyrightYear,
          notes: rightsNotes,
        };
        body.rights_holders = rightsHolders;
      }

      const response = await fetch(
        `/api/artists/${artist.id}/songs/${songId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = (await response.json().catch(() => ({}))) as DetailResponse;

      if (!response.ok || !result.song) {
        throw new Error(result.error || "Failed to save track details");
      }

      setTitle(result.song.title);
      setMessage("Track details saved.");
      onSaved({ id: result.song.id, title: result.song.title });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save track details",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadState === "loading") {
    return (
      <section className="filmwave-backend-section px-5 py-6 text-xs text-[var(--text-muted)]">
        Loading track details...
      </section>
    );
  }

  if (loadState === "error") {
    return (
      <section className="filmwave-backend-section p-5">
        <div className="text-xs text-[var(--status-error)]">{error}</div>
        <button
          type="button"
          onClick={onClose}
          className="filmwave-backend-button filmwave-backend-button-secondary mt-4"
        >
          Back to Music
        </button>
      </section>
    );
  }

  const metadataDisabled = !canEditMetadata || saving;

  return (
    <div>
      <div className="mb-4 flex min-h-10 flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="filmwave-backend-button filmwave-backend-button-secondary"
        >
          Back to Music
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {reviewFeedback?.notes ? (
          <section className="rounded-[10px] border border-[var(--status-warning,var(--border))] bg-[var(--status-warning-soft,var(--bg-secondary))] px-5 py-4">
            <div className="text-xs font-medium text-[var(--status-warning,var(--text-primary))]">
              Review feedback
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-primary)]">
              {reviewFeedback.notes}
            </p>
          </section>
        ) : null}

        <section className="filmwave-backend-section">
          <div className="filmwave-backend-section-header">
            <h2 className="filmwave-backend-section-title">Song Info</h2>
          </div>

          <div className="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
            <BackendInput
              aria-label="Song Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder="Song Title"
              disabled={metadataDisabled}
            />
            <BackendInput
              aria-label="Artist"
              value={artist.name}
              placeholder="Artist"
              readOnly
            />
            <NumericInput
              value={bpm}
              onChange={setBpm}
              placeholder="BPM"
              disabled={metadataDisabled}
            />
            <SelectInput
              value={keyValue}
              onChange={setKeyValue}
              disabled={metadataDisabled}
            >
              <option value="">Key</option>
              {KEY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
            <BackendInput
              aria-label="Duration"
              value={formatDuration(duration)}
              placeholder="Duration"
              readOnly
            />
            <CheckboxInput
              checked={instrumental}
              onChange={setInstrumental}
              label="Instrumental"
              disabled={metadataDisabled}
            />
            <CheckboxInput
              checked={explicit}
              onChange={setExplicit}
              label="Explicit"
              disabled={metadataDisabled}
            />
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
                  disabled={metadataDisabled}
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
              <div className="text-xs text-[var(--text-muted)]">
                No credits added yet.
              </div>
            ) : null}
            {credits.map((credit, index) => (
              <div
                key={index}
                className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
              >
                <BackendInput
                  value={credit.credit_name}
                  onChange={(event) =>
                    updateCredit(index, { credit_name: event.target.value })
                  }
                  placeholder="Name"
                  disabled={metadataDisabled}
                />
                <BackendInput
                  value={credit.credit_role}
                  onChange={(event) =>
                    updateCredit(index, { credit_role: event.target.value })
                  }
                  placeholder="Role — composer, producer, performer..."
                  disabled={metadataDisabled}
                />
                <button
                  type="button"
                  disabled={metadataDisabled}
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
            {canEditMetadata ? (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setCredits((current) => [...current, emptyCredit()])
                }
                className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary mt-1 w-fit"
              >
                Add credit
              </button>
            ) : null}
          </div>
        </section>

        <section className="filmwave-backend-section">
          <div className="filmwave-backend-section-header">
            <h2 className="filmwave-backend-section-title">
              Rights + Ownership
            </h2>
          </div>

          <div className="grid gap-5 px-5 pb-5">
            {!canEditRights ? (
              <div className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 text-xs text-[var(--text-muted)]">
                Your artist role can view rights information but cannot edit
                ownership details.
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <FieldLabel>Master Owner</FieldLabel>
                <BackendInput
                  value={masterOwner}
                  onChange={(event) => setMasterOwner(event.target.value)}
                  disabled={!canEditRights || saving}
                />
              </div>
              <div>
                <FieldLabel>Publishing Owner</FieldLabel>
                <BackendInput
                  value={publishingOwner}
                  onChange={(event) => setPublishingOwner(event.target.value)}
                  disabled={!canEditRights || saving}
                />
              </div>
              <div>
                <FieldLabel>PRO Affiliation</FieldLabel>
                <BackendInput
                  value={proAffiliation}
                  onChange={(event) => setProAffiliation(event.target.value)}
                  placeholder="SOCAN, ASCAP, BMI..."
                  disabled={!canEditRights || saving}
                />
              </div>
              <div>
                <FieldLabel>Copyright Year</FieldLabel>
                <BackendInput
                  type="number"
                  min={1900}
                  max={2200}
                  value={copyrightYear}
                  onChange={(event) => setCopyrightYear(event.target.value)}
                  disabled={!canEditRights || saving}
                />
              </div>
              <div>
                <FieldLabel>ISRC</FieldLabel>
                <BackendInput
                  value={isrc}
                  onChange={(event) => setIsrc(event.target.value)}
                  disabled={!canEditRights || saving}
                />
              </div>
              <div>
                <FieldLabel>ISWC</FieldLabel>
                <BackendInput
                  value={iswc}
                  onChange={(event) => setIswc(event.target.value)}
                  disabled={!canEditRights || saving}
                />
              </div>
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <FieldLabel>Ownership Splits</FieldLabel>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Master: {ownershipTotals.master}% · Publishing:{" "}
                    {ownershipTotals.publishing}%
                  </div>
                </div>
                {canEditRights ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      setRightsHolders((current) => [
                        ...current,
                        emptyHolder(),
                      ])
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
                  <div
                    key={index}
                    className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] p-3"
                  >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_160px_110px_1fr_1fr_auto]">
                      <BackendInput
                        value={holder.holder_name}
                        onChange={(event) =>
                          updateHolder(index, {
                            holder_name: event.target.value,
                          })
                        }
                        placeholder="Rights holder"
                        disabled={!canEditRights || saving}
                      />
                      <SelectInput
                        value={holder.rights_type}
                        onChange={(value) =>
                          updateHolder(index, {
                            rights_type: value as RightsHolder["rights_type"],
                          })
                        }
                        disabled={!canEditRights || saving}
                      >
                        <option value="both">Master + publishing</option>
                        <option value="master">Master</option>
                        <option value="publishing">Publishing</option>
                      </SelectInput>
                      <BackendInput
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        value={holder.ownership_percent}
                        onChange={(event) =>
                          updateHolder(index, {
                            ownership_percent: event.target.value,
                          })
                        }
                        placeholder="%"
                        disabled={!canEditRights || saving}
                      />
                      <BackendInput
                        value={holder.pro_affiliation}
                        onChange={(event) =>
                          updateHolder(index, {
                            pro_affiliation: event.target.value,
                          })
                        }
                        placeholder="PRO"
                        disabled={!canEditRights || saving}
                      />
                      <BackendInput
                        value={holder.ipi_cae_number}
                        onChange={(event) =>
                          updateHolder(index, {
                            ipi_cae_number: event.target.value,
                          })
                        }
                        placeholder="IPI / CAE"
                        disabled={!canEditRights || saving}
                      />
                      <button
                        type="button"
                        disabled={!canEditRights || saving}
                        onClick={() =>
                          setRightsHolders((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                        className="filmwave-backend-button filmwave-backend-button-secondary"
                      >
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
                disabled={!canEditRights || saving}
                className="filmwave-backend-textarea"
              />
            </div>
          </div>
        </section>

        <section className="filmwave-backend-section">
          <div className="filmwave-backend-section-header">
            <h2 className="filmwave-backend-section-title">Actions</h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5">
            <div className="min-h-5 text-xs">
              {error ? (
                <span className="text-[var(--status-error)]">{error}</span>
              ) : message ? (
                <span className="text-[var(--status-success)]">{message}</span>
              ) : !canEditMetadata ? (
                <span className="text-[var(--text-muted)]">
                  Your artist role has read-only catalogue access.
                </span>
              ) : null}
            </div>
            {canEditMetadata ? (
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="filmwave-backend-button filmwave-backend-button-primary"
              >
                {saving ? "Saving..." : "Save track details"}
              </button>
            ) : null}
          </div>
        </section>
      </form>
    </div>
  );
}
