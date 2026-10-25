"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import ArtistSongTagSections from "@/components/artists/ArtistSongTagSections";
import ArtistSongCreditsRightsSections, {
  type ArtistSongCredit as Credit,
  type ArtistSongRightsHolder as RightsHolder,
} from "@/components/artists/ArtistSongCreditsRightsSections";
import {
  BackendCheckbox,
  BackendInput,
  BackendSelect,
} from "@/components/backend/BackendControls";
import ChevronDownIcon from "@/components/icons/ChevronDownIcon";
import ChevronUpIcon from "@/components/icons/ChevronUpIcon";
import WarningIcon from "@/components/icons/WarningIcon";

import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

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
  revision_pending?: boolean;
  error?: string;
};

type ArtistSongEditorProps = {
  artist: ArtistDashboardProfile;
  songId: string;
  onClose: () => void;
  onSaved: (
    song: { id: string; title: string },
    revisionPending?: boolean,
  ) => void;
  beforeContent?: ReactNode;
  songInfoExtra?: ReactNode;
  afterSongInfoContent?: ReactNode;
  afterContent?: ReactNode;
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
      className="h-10 w-full self-end rounded-[var(--filmwave-backend-control-radius)] border-[1.25px] border-[var(--border)] bg-[var(--bg-primary)] px-3"
    />
  );
}

export default function ArtistSongEditor({
  artist,
  songId,
  onClose,
  onSaved,
  beforeContent,
  songInfoExtra,
  afterSongInfoContent,
  afterContent,
}: ArtistSongEditorProps) {
  const canEditMetadata = artist.permissions.includes("catalog:edit");
  const canEditRights = artist.permissions.includes("rights:edit");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [warningsOpen, setWarningsOpen] = useState(false);
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
    setWarningsOpen(false);
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

  const editWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!title.trim()) warnings.push("Song title missing");
    if (!bpm.trim()) warnings.push("BPM missing");
    if (!keyValue.trim()) warnings.push("Key missing");
    if (!duration) warnings.push("Duration missing");
    if (genres.length === 0) warnings.push("Genre tags empty");
    if (moods.length === 0) warnings.push("Mood tags empty");
    if (instruments.length === 0) warnings.push("Instrument tags empty");
    if (builds.length === 0) warnings.push("Build tags empty");
    if (!instrumental && vocals.length === 0) warnings.push("Vocals tags empty");
    if (
      canEditRights &&
      (rightsHolders.length === 0 ||
        Math.abs(ownershipTotals.master - 100) > 0.01 ||
        Math.abs(ownershipTotals.publishing - 100) > 0.01)
    ) {
      warnings.push("Master and publishing ownership must each total 100%");
    }
    return warnings;
  }, [
    title,
    bpm,
    keyValue,
    duration,
    genres,
    moods,
    instruments,
    builds,
    vocals,
    instrumental,
    canEditRights,
    rightsHolders.length,
    ownershipTotals.master,
    ownershipTotals.publishing,
  ]);

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

      const revisionPending = Boolean(result.revision_pending);
      setTitle(result.song.title);
      setMessage(
        revisionPending
          ? "Track details saved. The song has been resubmitted for review."
          : "Track details saved.",
      );
      onSaved(
        { id: result.song.id, title: result.song.title },
        revisionPending,
      );
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
      <form
        onSubmit={handleSubmit}
        className="filmwave-song-form grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="filmwave-song-form-main grid min-w-0 gap-4">
          {beforeContent}

          {reviewFeedback?.notes ? (
            <section className="border-[1.25px] border-[var(--status-warning,var(--border))] bg-[var(--status-warning-soft,var(--bg-secondary))] px-5 py-4">
              <div className="text-xs font-medium text-[var(--status-warning,var(--text-primary))]">
                Review feedback
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-primary)]">
                {reviewFeedback.notes}
              </p>
            </section>
          ) : null}

          <SongFormSection
            title="Song Info"
            bodyClassName="grid gap-3 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4"
          >
              <div>
                <BackendInput
                  aria-label="Song Title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                  placeholder="Song Title"
                  disabled={metadataDisabled}
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
              {songInfoExtra}
              <div>
                <NumericInput
                  value={bpm}
                  onChange={setBpm}
                  placeholder="BPM"
                  disabled={metadataDisabled}
                />
              </div>
              <div>
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
              </div>
              <div>
                <BackendInput
                  aria-label="Duration"
                  value={formatDuration(duration)}
                  placeholder="Duration"
                  readOnly
                />
              </div>
              <div>
                <CheckboxInput
                  checked={instrumental}
                  onChange={setInstrumental}
                  label="Instrumental"
                  disabled={metadataDisabled}
                />
              </div>
              <div>
                <CheckboxInput
                  checked={explicit}
                  onChange={setExplicit}
                  label="Explicit"
                  disabled={metadataDisabled}
                />
              </div>
          </SongFormSection>

          {afterSongInfoContent}

          <ArtistSongTagSections
            genres={genres}
            onGenresChange={setGenres}
            moods={moods}
            onMoodsChange={setMoods}
            regions={regions}
            onRegionsChange={setRegions}
            instruments={instruments}
            onInstrumentsChange={setInstruments}
            builds={builds}
            onBuildsChange={setBuilds}
            vocals={vocals}
            onVocalsChange={setVocals}
            disabled={metadataDisabled}
          />

          <ArtistSongCreditsRightsSections
            credits={credits}
            onCreditsChange={setCredits}
            creditsDisabled={metadataDisabled}
            canAddCredit={canEditMetadata}
            rightsHolders={rightsHolders}
            onRightsHoldersChange={setRightsHolders}
            masterOwner={masterOwner}
            onMasterOwnerChange={setMasterOwner}
            publishingOwner={publishingOwner}
            onPublishingOwnerChange={setPublishingOwner}
            proAffiliation={proAffiliation}
            onProAffiliationChange={setProAffiliation}
            copyrightYear={copyrightYear}
            onCopyrightYearChange={setCopyrightYear}
            isrc={isrc}
            onIsrcChange={setIsrc}
            iswc={iswc}
            onIswcChange={setIswc}
            rightsNotes={rightsNotes}
            onRightsNotesChange={setRightsNotes}
            ownershipTotals={ownershipTotals}
            canEditRights={canEditRights}
            rightsDisabled={!canEditRights || saving}
            canAddRightsHolder={canEditRights}
            rightsReadOnlyMessage="Your artist role can view rights information but cannot edit ownership details."
            rightsReadOnlyClassName="border-[1.25px] border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 text-xs text-[var(--text-muted)]"
          />

          {afterContent}
        </div>

        <aside className="filmwave-song-form-sidebar grid h-fit gap-4 xl:sticky xl:top-[88px] xl:mt-14">
          <div className="grid gap-2">
              {editWarnings.length > 0 ? (
                <>
                  <div className="rounded-[3px] bg-[rgba(220,88,79,0.08)] p-3 text-xs leading-5 text-[#dc584f]">
                    <div className="flex items-center gap-2 font-medium">
                      <WarningIcon />
                      <span>
                        {editWarnings.length} item{editWarnings.length === 1 ? "" : "s"} need attention
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">
                      {editWarnings[0]}
                      {editWarnings.length > 1 ? ` + ${editWarnings.length - 1} more` : ""}
                    </div>
                    {editWarnings.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setWarningsOpen((current) => !current)}
                        className="mt-2 text-[11px] font-medium text-[var(--text-secondary)] underline-offset-4 transition hover:text-[var(--text-primary)] hover:underline"
                      >
                        {warningsOpen ? "Hide warnings" : "Show warnings"}
                      </button>
                    ) : null}
                  </div>
                  {warningsOpen && editWarnings.length > 1 ? (
                    <ul className="grid gap-1.5 rounded-[3px] border-[1.25px] border-[var(--border)] bg-[var(--bg-primary)] p-3 text-[11px] leading-5 text-[var(--text-secondary)]">
                      {editWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[3px] bg-[rgba(72,181,113,0.08)] p-3 text-xs font-medium text-[#48b571]">
                  Ready to save
                </div>
              )}
          </div>

          {(message || error) ? (
            <SongFormSection
              title="Save Status"
              divided
              bodyClassName="grid gap-3 px-5 pb-5"
            >
                {error ? (
                  <div className="rounded-[3px] bg-[rgba(220,88,79,0.08)] p-3 text-xs leading-5 text-[#dc584f]">
                    {error}
                  </div>
                ) : null}
                {message ? (
                  <div className="bg-[var(--bg-tertiary)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
                    {message}
                  </div>
                ) : null}
            </SongFormSection>
          ) : null}

          <div className="grid gap-2">
              {canEditMetadata ? (
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="filmwave-backend-button filmwave-backend-button-primary w-full"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="filmwave-backend-button filmwave-backend-button-secondary w-full"
              >
                Back to Music
              </button>
              {!canEditMetadata ? (
                <div className="text-[11px] leading-5 text-[var(--text-muted)]">
                  Your artist role has read-only catalogue access.
                </div>
              ) : null}
          </div>
        </aside>
      </form>
    </div>
  );
}