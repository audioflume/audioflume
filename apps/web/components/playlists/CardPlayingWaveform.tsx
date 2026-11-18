import WaveformIcon from "@/components/icons/WaveformIcon";
import styles from "./CardPlayingWaveform.module.css";

export { styles as cardWaveformStyles };

export default function CardPlayingWaveform({ corner = false, label }: { corner?: boolean; label?: string }) {
  return (
    <span className={`${styles.cardPlayingWaveform}${corner ? ` ${styles.cardCornerWaveform}` : ""}`} aria-label={corner ? label : undefined} role={corner ? "status" : undefined}>
      <WaveformIcon size={18} />
    </span>
  );
}
