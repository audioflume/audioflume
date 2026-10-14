import type { ReactNode } from "react";

import styles from "./SectionTitle.module.css";

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "small";
};

export default function SectionTitle({
  children,
  className = "",
  variant = "default",
}: SectionTitleProps) {
  return (
    <h2
      className={`${styles.title}${variant === "small" ? ` ${styles.small}` : ""} ${className}`.trim()}
    >
      {children}
    </h2>
  );
}
