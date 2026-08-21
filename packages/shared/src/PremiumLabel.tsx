import type { CSSProperties } from "react";

const premiumLabelStyle: CSSProperties = {
  display: "inline-flex",
  height: 18,
  flexShrink: 0,
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--border)",
  padding: "0 6px",
  fontFamily: "var(--font-roboto-mono)",
  fontSize: 8,
  fontWeight: 400,
  textTransform: "uppercase",
  lineHeight: 1,
  letterSpacing: "0.04em",
  color: "var(--text-secondary)",
};

export function PremiumLabel({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={className} style={premiumLabelStyle}>
      <span style={{ position: "relative", top: 0.5 }}>Premium</span>
    </span>
  );
}
