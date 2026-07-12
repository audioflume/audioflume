type FooterBottomProps = {
  className?: string;
};

export default function FooterBottom({ className = "" }: FooterBottomProps) {
  return (
    <div
      className={`flex min-h-9 items-center justify-between border-t border-[var(--border-subtle)] text-[9px] font-normal leading-none text-[var(--text-muted)] ${className}`}
    >
      <span>© 2026 Filmwave</span>
      <span>All rights reserved</span>
    </div>
  );
}
