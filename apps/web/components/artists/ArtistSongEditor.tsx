"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
  error?: string;
};

type ArtistSongEditorProps = {
  artist: ArtistDashboardProfile;
  songId: string;
  onClose: () => void;
  onSaved: (song: { id: string; title: string }) => void;
};

const inputClassName =
  "h-10 w-full rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60";

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

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
      {children}
    </span>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
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
              className={`h-7 rounded-full border px-2.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
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
  const [title, setTitle] = useState("");
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
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [rightsNotes, setRightsNotes] = useState("");
  const [rightsHolders, setRightsHolders] = useState<RightsHolder[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setError("");
    setMessage("");

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

        setTitle(body.song.title);
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
        setRightsConfirmed(Boolean(rights?.rights_confirmed));
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
          rights_confirmed: rightsConfirmed,
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
      <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-6 text-xs text-[var(--text-muted)]">
        Loading track details...
      </section>
    );
  }

  if (loadState === "error") {
    return (
      <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] p-5">
        <div className="text-xs text-[var(--status-error)]">{error}</div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex h-9 items-center justify-center rounded-[7px] border border-[var(--border)] px-4 text-xs text-[var(--text-primary)]"
        >
          Back to music
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
              Track details
            </h2>
            <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
              Add the metadata used to organize and describe this track.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center rounded-[7px] border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            Back to uploads
          </button>
        </div>

        <div className="grid gap-5 p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px_160px]">
            <label>
              <FieldLabel>Track title</FieldLabel>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                disabled={!canEditMetadata || saving}
                className={inputClassName}
              />
            </label>
            <label>
              <FieldLabel>BPM</FieldLabel>
              <input
                type="number"
                min={1}
                max={400}
                value={bpm}
                onChange={(event) => setBpm(event.target.value)}
                disabled={!canEditMetadata || saving}
                className={inputClassName}
              />
            </label>
            <label>
              <FieldLabel>Key</FieldLabel>
              <select
                value={keyValue}
                onChange={(event) => setKeyValue(event.target.value)}
                disabled={!canEditMetadata || saving}
                className={inputClassName}
              >
                <option value="">Not set</option>
                {KEY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex min-h-11 items-center gap-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={instrumental}
                onChange={(event) => setInstrumental(event.target.checked)}
                disabled={!canEditMetadata || saving}
              />
              Instrumental
            </label>
            <label className="flex min-h-11 items-center gap-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={explicit}
                onChange={(event) => setExplicit(event.target.checked)}
                disabled={!canEditMetadata || saving}
              />
              Contains explicit content
            </label>
          </div>

          <MultiSelect label="Genres" options={GENRE_OPTIONS} selected={genres} onChange={setGenres} disabled={!canEditMetadata || saving} />
          <MultiSelect label="Moods" options={MOOD_OPTIONS} selected={moods} onChange={setMoods} disabled={!canEditMetadata || saving} />
          <MultiSelect label="Regions" options={REGION_OPTIONS} selected={regions} onChange={setRegions} disabled={!canEditMetadata || saving} />
          <MultiSelect label="Instruments" options={INSTRUMENT_OPTIONS} selected={instruments} onChange={setInstruments} disabled={!canEditMetadata || saving} />
          <MultiSelect label="Build" options={BUILD_OPTIONS} selected={builds} onChange={setBuilds} disabled={!canEditMetadata || saving} />
          <MultiSelect label="Vocals" options={VOCALS_OPTIONS} selected={vocals} onChange={setVocals} disabled={!canEditMetadata || saving} />
        </div>
      </section>

      <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
            Credits
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            List the people who contributed to this recording and what they did.
          </p>
        </div>
        <div className="grid gap-3 p-5">
          {credits.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)]">No credits added yet.</div>
          ) : null}
          {credits.map((credit, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                value={credit.credit_name}
                onChange={(event) => updateCredit(index, { credit_name: event.target.value })}
                placeholder="Name"
                disabled={!canEditMetadata || saving}
                className={inputClassName}
              />
              <input
                value={credit.credit_role}
                onChange={(event) => updateCredit(index, { credit_role: event.target.value })}
                placeholder="Role — composer, producer, performer..."
                disabled={!canEditMetadata || saving}
                className={inputClassName}
              />
              <button
                type="button"
                disabled={!canEditMetadata || saving}
                onClick={() => setCredits((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                className="h-10 rounded-[7px] border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]"
              >
                Remove
              </button>
            </div>
          ))}
          {canEditMetadata ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => setCredits((current) => [...current, emptyCredit()])}
              className="mt-1 inline-flex h-9 w-fit items-center rounded-[7px] border border-[var(--border)] px-4 text-xs text-[var(--text-primary)]"
            >
              Add credit
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
            Rights + ownership
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Record who controls the master and publishing rights before submission.
          </p>
        </div>

        <div className="grid gap-5 p-5">
          {!canEditRights ? (
            <div className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 text-xs text-[var(--text-muted)]">
              Your artist role can view rights information but cannot edit ownership details.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <FieldLabel>Master owner</FieldLabel>
              <input value={masterOwner} onChange={(event) => setMasterOwner(event.target.value)} disabled={!canEditRights || saving} className={inputClassName} />
            </label>
            <label>
              <FieldLabel>Publishing owner</FieldLabel>
              <input value={publishingOwner} onChange={(event) => setPublishingOwner(event.target.value)} disabled={!canEditRights || saving} className={inputClassName} />
            </label>
            <label>
              <FieldLabel>PRO affiliation</FieldLabel>
              <input value={proAffiliation} onChange={(event) => setProAffiliation(event.target.value)} disabled={!canEditRights || saving} placeholder="SOCAN, ASCAP, BMI..." className={inputClassName} />
            </label>
            <label>
              <FieldLabel>Copyright year</FieldLabel>
              <input type="number" min={1900} max={2200} value={copyrightYear} onChange={(event) => setCopyrightYear(event.target.value)} disabled={!canEditRights || saving} className={inputClassName} />
            </label>
            <label>
              <FieldLabel>ISRC</FieldLabel>
              <input value={isrc} onChange={(event) => setIsrc(event.target.value)} disabled={!canEditRights || saving} className={inputClassName} />
            </label>
            <label>
              <FieldLabel>ISWC</FieldLabel>
              <input value={iswc} onChange={(event) => setIswc(event.target.value)} disabled={!canEditRights || saving} className={inputClassName} />
            </label>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <FieldLabel>Ownership splits</FieldLabel>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Master: {ownershipTotals.master}% · Publishing: {ownershipTotals.publishing}%
                </div>
              </div>
              {canEditRights ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setRightsHolders((current) => [...current, emptyHolder()])}
                  className="inline-flex h-9 items-center rounded-[7px] border border-[var(--border)] px-4 text-xs text-[var(--text-primary)]"
                >
                  Add rights holder
                </button>
              ) : null}
            </div>

            <div className="grid gap-3">
              {rightsHolders.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)]">No ownership splits added yet.</div>
              ) : null}
              {rightsHolders.map((holder, index) => (
                <div key={index} className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_160px_130px_1fr_1fr_auto]">
                    <input value={holder.holder_name} onChange={(event) => updateHolder(index, { holder_name: event.target.value })} disabled={!canEditRights || saving} placeholder="Rights holder" className={inputClassName} />
                    <select value={holder.rights_type} onChange={(event) => updateHolder(index, { rights_type: event.target.value as RightsHolder["rights_type"] })} disabled={!canEditRights || saving} className={inputClassName}>
                      <option value="both">Master + publishing</option>
                      <option value="master">Master</option>
                      <option value="publishing">Publishing</option>
                    </select>
                    <input type="number" min={0} max={100} step="0.01" value={holder.ownership_percent} onChange={(event) => updateHolder(index, { ownership_percent: event.target.value })} disabled={!canEditRights || saving} placeholder="%" className={inputClassName} />
                    <input value={holder.pro_affiliation} onChange={(event) => updateHolder(index, { pro_affiliation: event.target.value })} disabled={!canEditRights || saving} placeholder="PRO" className={inputClassName} />
                    <input value={holder.ipi_cae_number} onChange={(event) => updateHolder(index, { ipi_cae_number: event.target.value })} disabled={!canEditRights || saving} placeholder="IPI / CAE" className={inputClassName} />
                    <button type="button" disabled={!canEditRights || saving} onClick={() => setRightsHolders((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="h-10 rounded-[7px] border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)]">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label>
            <FieldLabel>Rights notes</FieldLabel>
            <textarea value={rightsNotes} onChange={(event) => setRightsNotes(event.target.value)} rows={4} maxLength={2000} disabled={!canEditRights || saving} className="w-full resize-y rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60" />
          </label>

          <label className="flex items-start gap-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3 text-xs leading-5 text-[var(--text-secondary)]">
            <input type="checkbox" className="mt-1" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} disabled={!canEditRights || saving} />
            <span>
              I confirm that the ownership information above is accurate and that the listed rights holders control 100% of both the master and publishing rights. Confirmation requires both split totals to equal 100%.
            </span>
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-4">
        <div className="min-h-5 text-xs">
          {error ? (
            <span className="text-[var(--status-error)]">{error}</span>
          ) : message ? (
            <span className="text-[var(--status-success)]">{message}</span>
          ) : !canEditMetadata ? (
            <span className="text-[var(--text-muted)]">Your artist role has read-only catalogue access.</span>
          ) : null}
        </div>
        {canEditMetadata ? (
          <button type="submit" disabled={saving || !title.trim()} className="inline-flex h-9 items-center justify-center rounded-[7px] bg-[var(--text-primary)] px-4 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? "Saving..." : "Save track details"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
