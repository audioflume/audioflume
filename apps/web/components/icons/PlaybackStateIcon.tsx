import PlayIconSmall from "./PlayIconSmall";
import PauseIcon from "./PauseIcon";
import WaveformIcon from "./WaveformIcon";
import { cardWaveformStyles } from "@/components/playlists/CardPlayingWaveform";
import styles from "./PlaybackStateIcon.module.css";

export default function PlaybackStateIcon({ playing, size = 14 }: { playing: boolean; size?: number }) {
  return (
    <span className={`${styles.icon}${playing ? ` ${styles.playing}` : ""}`} aria-hidden="true">
      {playing ? (
        <>
          <span className={`${styles.waveform} ${cardWaveformStyles.cardPlayingWaveform}`}>
            <WaveformIcon size={size} />
          </span>
          <span className={styles.pause}>
            <PauseIcon size={size} />
          </span>
        </>
      ) : (
        <PlayIconSmall size={size} />
      )}
    </span>
  );
}
