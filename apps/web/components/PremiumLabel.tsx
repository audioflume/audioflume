export default function PremiumLabel({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-[18px] shrink-0 items-center justify-center border border-[var(--border)] px-1.5 font-[family-name:var(--font-roboto-mono)] text-[8px] font-normal uppercase leading-none tracking-[0.04em] text-[var(--text-secondary)]${
        className ? ` ${className}` : ""
      }`}
    >
      <span className="relative top-[0.5px]">Premium</span>
    </span>
  );
}
