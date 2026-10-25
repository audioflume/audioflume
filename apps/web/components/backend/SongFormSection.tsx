"use client";

import type { ReactNode } from "react";
import { BackendChoiceButton } from "@/components/backend/BackendControls";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type SongFormSectionProps = {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  divided?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
};

export function SongFormSection({
  title,
  action,
  children,
  divided = false,
  className = "",
  headerClassName = "",
  bodyClassName = "",
}: SongFormSectionProps) {
  return (
    <section
      className={joinClasses(
        "filmwave-backend-section",
        "filmwave-song-form-card",
        divided && "filmwave-song-form-card-divided",
        className,
      )}
    >
      <div
        className={joinClasses(
          "filmwave-song-form-header",
          headerClassName,
        )}
      >
        <h2 className="filmwave-backend-section-title">{title}</h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={joinClasses("filmwave-song-form-body", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

type SongFormTagSectionProps = {
  title: string;
  options: readonly string[];
  selected: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function SongFormTagSection({
  title,
  options,
  selected,
  onChange,
  disabled = false,
  className = "",
}: SongFormTagSectionProps) {
  return (
    <SongFormSection
      title={title}
      action={
        <span className="text-[11px] text-[var(--text-muted)]">
          {selected.length} selected
        </span>
      }
      className={className}
      bodyClassName="flex flex-wrap gap-1.5"
    >
      {options.map((option) => {
        const active = selected.includes(option);

        return (
          <BackendChoiceButton
            key={option}
            type="button"
            disabled={disabled}
            active={active}
            onClick={() =>
              onChange(
                active
                  ? selected.filter((item) => item !== option)
                  : [...selected, option],
              )
            }
          >
            {option}
          </BackendChoiceButton>
        );
      })}
    </SongFormSection>
  );
}
