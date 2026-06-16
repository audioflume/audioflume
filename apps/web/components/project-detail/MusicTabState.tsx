import SkeletonSongList from "@/components/SkeletonSongCard";
import SongCard from "@/components/SongCard";
import type { ProjectSong } from "@/lib/project-detail/projectDetailTypes";
import { MusicListShell } from "@filmwave/shared";

type MusicTabStateProps = {
  projectId: string;
  songs: ProjectSong[];
  loading: boolean;
  error: string | null;
  onRemoveFromProject: (songId: string) => void;
};

export default function MusicTabState({
  projectId,
  songs,
  loading,
  error,
  onRemoveFromProject,
}: MusicTabStateProps) {
  if (loading) return <SkeletonSongList />;

  if (error) {
    return (
      <div className="project-empty">
        <h2>Couldn&apos;t load project songs</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="project-empty">
        <h2>No songs yet</h2>
        <p>
          Add songs from the music library, then they will appear here in this
          project.
        </p>
      </div>
    );
  }

  return (
    <MusicListShell
      title="Music"
      meta={`${songs.length} ${songs.length === 1 ? "track" : "tracks"}`}
    >
      {songs.map((song, index) => (
        <SongCard
          key={song.id}
          song={song}
          isFirst={index === 0}
          isLast={index === songs.length - 1}
          projectId={projectId}
          onRemoveFromProject={onRemoveFromProject}
        />
      ))}
    </MusicListShell>
  );
}
