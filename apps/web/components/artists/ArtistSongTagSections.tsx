"use client";

import { BackendChoiceButton } from "@/components/backend/BackendControls";
import {
  BUILD_OPTIONS,
  GENRE_OPTIONS,
  INSTRUMENT_OPTIONS,
  MOOD_OPTIONS,
  REGION_OPTIONS,
  VOCALS_OPTIONS,
} from "@/lib/constants";

type ArtistSongTagSectionsProps = {
  genres: string[];
  onGenresChange: (value: string[]) => void;
  moods: string[];
  onMoodsChange: (value: string[]) => void;
  regions: string[];
  onRegionsChange: (value: string[]) => void;
  instruments: string[];
  onInstrumentsChange: (value: string[]) => void;
  builds: string[];
  onBuildsChange: (value: string[]) => void;
  vocals: string[];
  onVocalsChange: (value: string[]) => void;
  disabled: boolean;
};

type TagSectionProps = {
  title: string;
  options: readonly string[];
  selected: string[];
  onChange: (value: string[]) => void;
  disabled: boolean;
};

function TagSection({
  title,
  options,
  selected,
  onChange,
  disabled,
}: TagSectionProps) {
  return (
    <section className="filmwave-backend-section">
      <div className="filmwave-backend-section-header">
        <h2 className="filmwave-backend-section-title">{title}</h2>
        <span className="text-[11px] font-[320] text-[var(--text-muted)]">
          {selected.length} selected
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-5 pb-5">
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
    </section>
  );
}

export default function ArtistSongTagSections({
  genres,
  onGenresChange,
  moods,
  onMoodsChange,
  regions,
  onRegionsChange,
  instruments,
  onInstrumentsChange,
  builds,
  onBuildsChange,
  vocals,
  onVocalsChange,
  disabled,
}: ArtistSongTagSectionsProps) {
  return (
    <>
      <TagSection
        title="Genre"
        options={GENRE_OPTIONS}
        selected={genres}
        onChange={onGenresChange}
        disabled={disabled}
      />
      <TagSection
        title="Region"
        options={REGION_OPTIONS}
        selected={regions}
        onChange={onRegionsChange}
        disabled={disabled}
      />
      <TagSection
        title="Scene"
        options={MOOD_OPTIONS}
        selected={moods}
        onChange={onMoodsChange}
        disabled={disabled}
      />
      <TagSection
        title="Instrument"
        options={INSTRUMENT_OPTIONS}
        selected={instruments}
        onChange={onInstrumentsChange}
        disabled={disabled}
      />
      <TagSection
        title="Build"
        options={BUILD_OPTIONS}
        selected={builds}
        onChange={onBuildsChange}
        disabled={disabled}
      />
      <TagSection
        title="Vocals"
        options={VOCALS_OPTIONS}
        selected={vocals}
        onChange={onVocalsChange}
        disabled={disabled}
      />
    </>
  );
}
