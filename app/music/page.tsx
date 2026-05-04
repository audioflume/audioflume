import { getSongs } from '@/lib/songs'
import SongCard from '@/components/SongCard'

export default async function MusicPage() {
  const songs = await getSongs()

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-5xl mx-auto py-8">
        <h1 className="text-white text-2xl font-bold mb-6">Music Library</h1>
        {songs.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </div>
    </div>
  )
}