import PlayIconSmall from "./PlayIconSmall";
import PauseIcon from "./PauseIcon";
import ListViewIcon from "./ListViewIcon";
import WaveformIcon from "./WaveformIcon";
import { cardWaveformStyles } from "@/components/playlists/CardPlayingWaveform";
import styles from "./PlaybackStateIcon.module.css";

export default function PlaybackStateIcon({ playing, size = 14, hoverIcon = "pause" }: { playing: boolean; size?: number; hoverIcon?: "pause" | "list" }) {
  return (
    <span className={`${styles.icon}${playing ? ` ${styles.playing}` : ""}`} aria-hidden="true">
      {playing ? (
        <>
          <span className={`${styles.waveform} ${cardWaveformStyles.cardPlayingWaveform}`}>
            <WaveformIcon size={size} />
          </span>
          <span className={styles.pause}>
            {hoverIcon === "list" ? <ListViewIcon size={size} /> : <PauseIcon size={size} />}
          </span>
        </>
      ) : (
        <PlayIconSmall size={size} />
      )}
    </span>
  );
}
