import type { ReactNode } from "react";

type ListRowStatusCountProps = {
  status?: ReactNode;
  statusLabel?: string;
  count: ReactNode;
  statusClassName?: string;
  countClassName?: string;
};

export default function ListRowStatusCount({
  status,
  statusLabel,
  count,
  statusClassName = "",
  countClassName = "",
}: ListRowStatusCountProps) {
  return (
    <>
      <span
        className={`filmwave-list-row-status ${statusClassName}`.trim()}
        aria-label={status ? statusLabel : undefined}
        title={status ? statusLabel : undefined}
      >
        {status}
      </span>
      <span className={`filmwave-list-row-count ${countClassName}`.trim()}>
        {count}
      </span>
    </>
  );
}
