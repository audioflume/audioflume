import { useEffect, useMemo, useRef, useState } from "react";
import DownloadIconSmall from "../icons/DownloadIconSmall";
import FunnelIcon from "../icons/FunnelIcon";
import HeartIcon from "../icons/HeartIcon";
import MoreIcon from "../icons/MoreIcon";
import SearchIconSmall from "../icons/SearchIconSmall";
import { desktopSongs, type DesktopSong } from "../../lib/desktopSongs";
import "./DesktopMusicLibraryView.css";

const filterGroups = ["Playlists","Mood","Genre","Instruments","Vocals","Build","BPM","Key","Duration","Cue Points","Markers"] as const;

export default function DesktopMusicLibraryView() {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [openMenuSongId, setOpenMenuSongId] = useState<string | null>(null);

  const filteredSongs = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return desktopSongs.filter((song) => {
      const bySearch = !lowered || song.title.toLowerCase().includes(lowered) || song.artist.toLowerCase().includes(lowered);
      const byTags = activeTags.length === 0 || activeTags.every((tag) => [song.genre, song.mood, song.vocals, song.build, ...song.playlists, ...song.instruments].includes(tag));
      return bySearch && byTags;
    });
  }, [query, activeTags]);

  function toggleTag(tag: string) { setActiveTags((cur) => cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]); }

  return (
    <section className="desktop-view desktop-music-view">
      <div className="desktop-view-header"><div><div className="desktop-view-eyebrow">Library</div><h1 className="desktop-view-title">Music Library</h1></div></div>
      <div className="desktop-music-search-row">
        <label className="desktop-music-search"><SearchIconSmall size={13} className="desktop-music-search-icon" /><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search songs, artists, moods, genres" /></label>
        <button type="button" className="desktop-music-filter-button"><FunnelIcon size={14}/>Filters</button>
      </div>
      <div className="desktop-music-filter-row">{filterGroups.map((name)=><button key={name} type="button" className="desktop-music-filter-pill">{name}</button>)}</div>
      <div className="desktop-music-active-tags">
        {(["Ambient","Instrumental","Low","Documentary"] as const).map((tag)=><button key={tag} type="button" onClick={()=>toggleTag(tag)} className={`desktop-music-tag${activeTags.includes(tag)?" is-active":""}`}>{tag}</button>)}
      </div>
      <div className="desktop-music-list" role="list">{filteredSongs.map((song)=><DesktopSongRow key={song.id} song={song} isMenuOpen={openMenuSongId===song.id} onToggleMenu={()=>setOpenMenuSongId((cur)=>cur===song.id?null:song.id)} onCloseMenu={()=>setOpenMenuSongId(null)} />)}</div>
    </section>
  );
}

function DesktopSongRow({ song, isMenuOpen, onToggleMenu, onCloseMenu }: { song: DesktopSong; isMenuOpen: boolean; onToggleMenu: () => void; onCloseMenu: () => void; }) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isMenuOpen) return;
    function onEsc(event: KeyboardEvent) { if (event.key === "Escape") onCloseMenu(); }
    function onPointerDown(event: MouseEvent) { if (menuRef.current && !menuRef.current.contains(event.target as Node)) onCloseMenu(); }
    window.addEventListener("keydown", onEsc);
    window.addEventListener("mousedown", onPointerDown);
    return () => { window.removeEventListener("keydown", onEsc); window.removeEventListener("mousedown", onPointerDown); };
  }, [isMenuOpen, onCloseMenu]);

  return <article className="desktop-music-song-row" role="listitem" tabIndex={0}>
    <button type="button" className="desktop-music-song-main"><div><h3>{song.title}</h3><p>{song.artist}</p></div></button>
    <div className="desktop-music-waveform">{song.waveform.map((h,i)=><span key={i} style={{height:`${h}%`}}/>)}</div>
    <div className="desktop-music-meta"><span>{song.genre}</span><span>{song.bpm} BPM</span><span>{song.key}</span><span>{song.duration}</span></div>
    <div className="desktop-music-actions">
      <button type="button" aria-label="Favorite"><HeartIcon filled={song.isFavorite} size={14} /></button>
      <button type="button" aria-label="Download"><DownloadIconSmall size={13} /></button>
      <div className="desktop-music-more-wrap" ref={menuRef}><button type="button" aria-label="More" onClick={onToggleMenu}><MoreIcon size={15}/></button>{isMenuOpen && <div className="desktop-music-more-menu"><button type="button">Add to playlist</button><button type="button">Add to project</button><button type="button">View details</button></div>}</div>
    </div>
  </article>;
}
