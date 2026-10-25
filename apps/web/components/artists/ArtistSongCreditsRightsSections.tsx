"use client";

import {
  BackendButton,
  BackendInput,
  BackendSelect,
  BackendTextarea,
} from "@/components/backend/BackendControls";
import { SongFormSection } from "@/components/backend/SongFormSection";

export type ArtistSongCredit = {
  credit_name: string;
  credit_role: string;
};

export type ArtistSongRightsHolder = {
  holder_name: string;
  rights_type: "master" | "publishing" | "both";
  ownership_percent: string;
  pro_affiliation: string;
  ipi_cae_number: string;
};

type ArtistSongCreditsRightsSectionsProps = {
  credits: ArtistSongCredit[];
  onCreditsChange: (credits: ArtistSongCredit[]) => void;
  creditsDisabled: boolean;
  canAddCredit: boolean;
  rightsHolders: ArtistSongRightsHolder[];
  onRightsHoldersChange: (holders: ArtistSongRightsHolder[]) => void;
  masterOwner: string;
  onMasterOwnerChange: (value: string) => void;
  publishingOwner: string;
  onPublishingOwnerChange: (value: string) => void;
  proAffiliation: string;
  onProAffiliationChange: (value: string) => void;
  copyrightYear: string;
  onCopyrightYearChange: (value: string) => void;
  isrc: string;
  onIsrcChange: (value: string) => void;
  iswc: string;
  onIswcChange: (value: string) => void;
  rightsNotes: string;
  onRightsNotesChange: (value: string) => void;
  ownershipTotals: {
    master: number;
    publishing: number;
  };
  canEditRights: boolean;
  rightsDisabled: boolean;
  canAddRightsHolder: boolean;
  rightsReadOnlyMessage: string;
  rightsReadOnlyClassName: string;
};

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="mb-1.5 block text-[11px] font-medium text-[var(--text-secondary)]">
      {children}
    </label>
  );
}

function RightsTypeSelect({
  value,
  onChange,
  disabled,
}: {
  value: ArtistSongRightsHolder["rights_type"];
  onChange: (value: ArtistSongRightsHolder["rights_type"]) => void;
  disabled: boolean;
}) {
  return (
    <BackendSelect
      value={value}
      onChange={(event) =>
        onChange(event.target.value as ArtistSongRightsHolder["rights_type"])
      }
      disabled={disabled}
      className={[
        "filmwave-backend-select-end-control",
        value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
      ].join(" ")}
    >
      <option value="both">Master + publishing</option>
      <option value="master">Master</option>
      <option value="publishing">Publishing</option>
    </BackendSelect>
  );
}

function emptyCredit(): ArtistSongCredit {
  return { credit_name: "", credit_role: "" };
}

function emptyHolder(): ArtistSongRightsHolder {
  return {
    holder_name: "",
    rights_type: "both",
    ownership_percent: "",
    pro_affiliation: "",
    ipi_cae_number: "",
  };
}

export default function ArtistSongCreditsRightsSections({
  credits,
  onCreditsChange,
  creditsDisabled,
  canAddCredit,
  rightsHolders,
  onRightsHoldersChange,
  masterOwner,
  onMasterOwnerChange,
  publishingOwner,
  onPublishingOwnerChange,
  proAffiliation,
  onProAffiliationChange,
  copyrightYear,
  onCopyrightYearChange,
  isrc,
  onIsrcChange,
  iswc,
  onIswcChange,
  rightsNotes,
  onRightsNotesChange,
  ownershipTotals,
  canEditRights,
  rightsDisabled,
  canAddRightsHolder,
  rightsReadOnlyMessage,
  rightsReadOnlyClassName,
}: ArtistSongCreditsRightsSectionsProps) {
  function updateCredit(index: number, patch: Partial<ArtistSongCredit>) {
    onCreditsChange(
      credits.map((credit, creditIndex) =>
        creditIndex === index ? { ...credit, ...patch } : credit,
      ),
    );
  }

  function updateHolder(
    index: number,
    patch: Partial<ArtistSongRightsHolder>,
  ) {
    onRightsHoldersChange(
      rightsHolders.map((holder, holderIndex) =>
        holderIndex === index ? { ...holder, ...patch } : holder,
      ),
    );
  }

  return (
    <>
      <SongFormSection title="Credits" bodyClassName="grid gap-3 px-5 pb-5">
        {credits.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)]">
            No credits added yet.
          </div>
        ) : null}

        {credits.map((credit, index) => (
          <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <BackendInput
              value={credit.credit_name}
              onChange={(event) =>
                updateCredit(index, { credit_name: event.target.value })
              }
              placeholder="Name"
              disabled={creditsDisabled}
            />
            <BackendInput
              value={credit.credit_role}
              onChange={(event) =>
                updateCredit(index, { credit_role: event.target.value })
              }
              placeholder="Role — composer, producer, performer..."
              disabled={creditsDisabled}
            />
            <BackendButton
              type="button"
              disabled={creditsDisabled}
              onClick={() =>
                onCreditsChange(
                  credits.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              Remove
            </BackendButton>
          </div>
        ))}

        {canAddCredit ? (
          <BackendButton
            type="button"
            compact
            disabled={creditsDisabled}
            onClick={() => onCreditsChange([...credits, emptyCredit()])}
            className="mt-1 w-fit"
          >
            Add credit
          </BackendButton>
        ) : null}
      </SongFormSection>

      <SongFormSection
        title="Rights + Ownership"
        bodyClassName="grid gap-5 px-5 pb-5"
      >
        {!canEditRights ? (
          <div className={rightsReadOnlyClassName}>{rightsReadOnlyMessage}</div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <FieldLabel>Master Owner</FieldLabel>
            <BackendInput
              value={masterOwner}
              onChange={(event) => onMasterOwnerChange(event.target.value)}
              disabled={rightsDisabled}
            />
          </div>
          <div>
            <FieldLabel>Publishing Owner</FieldLabel>
            <BackendInput
              value={publishingOwner}
              onChange={(event) => onPublishingOwnerChange(event.target.value)}
              disabled={rightsDisabled}
            />
          </div>
          <div>
            <FieldLabel>PRO Affiliation</FieldLabel>
            <BackendInput
              value={proAffiliation}
              onChange={(event) => onProAffiliationChange(event.target.value)}
              placeholder="SOCAN, ASCAP, BMI..."
              disabled={rightsDisabled}
            />
          </div>
          <div>
            <FieldLabel>Copyright Year</FieldLabel>
            <BackendInput
              type="number"
              min={1900}
              max={2200}
              value={copyrightYear}
              onChange={(event) => onCopyrightYearChange(event.target.value)}
              disabled={rightsDisabled}
            />
          </div>
          <div>
            <FieldLabel>ISRC</FieldLabel>
            <BackendInput
              value={isrc}
              onChange={(event) => onIsrcChange(event.target.value)}
              disabled={rightsDisabled}
            />
          </div>
          <div>
            <FieldLabel>ISWC</FieldLabel>
            <BackendInput
              value={iswc}
              onChange={(event) => onIswcChange(event.target.value)}
              disabled={rightsDisabled}
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

            {canAddRightsHolder ? (
              <BackendButton
                type="button"
                compact
                disabled={rightsDisabled}
                onClick={() =>
                  onRightsHoldersChange([...rightsHolders, emptyHolder()])
                }
              >
                Add rights holder
              </BackendButton>
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
                className="border-[1.25px] border-[var(--border)] bg-[var(--bg-primary)] p-3"
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_160px_110px_1fr_1fr_auto]">
                  <BackendInput
                    value={holder.holder_name}
                    onChange={(event) =>
                      updateHolder(index, { holder_name: event.target.value })
                    }
                    placeholder="Rights holder"
                    disabled={rightsDisabled}
                  />
                  <RightsTypeSelect
                    value={holder.rights_type}
                    onChange={(value) =>
                      updateHolder(index, { rights_type: value })
                    }
                    disabled={rightsDisabled}
                  />
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
                    disabled={rightsDisabled}
                  />
                  <BackendInput
                    value={holder.pro_affiliation}
                    onChange={(event) =>
                      updateHolder(index, {
                        pro_affiliation: event.target.value,
                      })
                    }
                    placeholder="PRO"
                    disabled={rightsDisabled}
                  />
                  <BackendInput
                    value={holder.ipi_cae_number}
                    onChange={(event) =>
                      updateHolder(index, {
                        ipi_cae_number: event.target.value,
                      })
                    }
                    placeholder="IPI / CAE"
                    disabled={rightsDisabled}
                  />
                  <BackendButton
                    type="button"
                    disabled={rightsDisabled}
                    onClick={() =>
                      onRightsHoldersChange(
                        rightsHolders.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      )
                    }
                  >
                    Remove
                  </BackendButton>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Rights Notes</FieldLabel>
          <BackendTextarea
            value={rightsNotes}
            onChange={(event) => onRightsNotesChange(event.target.value)}
            rows={4}
            maxLength={2000}
            disabled={rightsDisabled}
          />
        </div>
      </SongFormSection>
    </>
  );
}
