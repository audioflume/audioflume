import { SongActionButton, type SongActionButtonActiveMode } from "@filmwave/shared";

export default function IconButton({
  children,
  label,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const isCueMarkerToggle = label === "Hide cue markers" || label === "Show cue markers";
  const isFavoriteToggle =
    label === "Remove song from favorites" || label === "Favorite song";
  const activeMode: SongActionButtonActiveMode =
    isCueMarkerToggle || isFavoriteToggle ? "plain-icon" : "background";

  return (
    <SongActionButton
      label={label}
      active={active}
      activeMode={activeMode}
      onClick={onClick}
    >
      {children}
    </SongActionButton>
  );
}
