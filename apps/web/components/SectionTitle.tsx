import type { ReactNode } from "react";

import styles from "./SectionTitle.module.css";

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
};

export default function SectionTitle({
  children,
  className = "",
}: SectionTitleProps) {
  return <h2 className={`${styles.title} ${className}`.trim()}>{children}</h2>;
}
