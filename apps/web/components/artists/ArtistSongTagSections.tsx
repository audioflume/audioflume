"use client";

import { SongFormTagSection } from "@/components/backend/SongFormSection";
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
      <SongFormTagSection
        title="Genre"
        options={GENRE_OPTIONS}
        selected={genres}
        onChange={onGenresChange}
        disabled={disabled}
      />
      <SongFormTagSection
        title="Region"
        options={REGION_OPTIONS}
        selected={regions}
        onChange={onRegionsChange}
        disabled={disabled}
      />
      <SongFormTagSection
        title="Scene"
        options={MOOD_OPTIONS}
        selected={moods}
        onChange={onMoodsChange}
        disabled={disabled}
      />
      <SongFormTagSection
        title="Instrument"
        options={INSTRUMENT_OPTIONS}
        selected={instruments}
        onChange={onInstrumentsChange}
        disabled={disabled}
      />
      <SongFormTagSection
        title="Build"
        options={BUILD_OPTIONS}
        selected={builds}
        onChange={onBuildsChange}
        disabled={disabled}
      />
      <SongFormTagSection
        title="Vocals"
        options={VOCALS_OPTIONS}
        selected={vocals}
        onChange={onVocalsChange}
        disabled={disabled}
      />
    </>
  );
}
