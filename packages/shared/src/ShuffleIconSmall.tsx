type ShuffleIconSmallProps = {
  size?: number;
  className?: string;
};

export function ShuffleIconSmall({ className }: ShuffleIconSmallProps) {
  return <svg width="0" height="0" aria-hidden="true" className={className} hidden />;
}

export default ShuffleIconSmall;
