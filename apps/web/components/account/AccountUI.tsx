"use client";

import type React from "react";
import type { HeroConfig } from "./accountTypes";
import { supportImages } from "./accountData";

export function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DiagonalArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 17L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 7H17V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20H8.5L19 9.5L14.5 5L4 15.5V20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 6L18 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TicketIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8.5V6.5C4 5.4 4.9 4.5 6 4.5H18C19.1 4.5 20 5.4 20 6.5V8.5C18.6 8.5 17.5 9.6 17.5 11C17.5 12.4 18.6 13.5 20 13.5V17.5C20 18.6 19.1 19.5 18 19.5H6C4.9 19.5 4 18.6 4 17.5V13.5C5.4 13.5 6.5 12.4 6.5 11C6.5 9.6 5.4 8.5 4 8.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 8H14M10 14H14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 7.5C4.5 6.4 5.4 5.5 6.5 5.5H17.5C18.6 5.5 19.5 6.4 19.5 7.5V16.5C19.5 17.6 18.6 18.5 17.5 18.5H6.5C5.4 18.5 4.5 17.6 4.5 16.5V7.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M5.5 7L12 12.25L18.5 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LicenseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.5H14L18 8.5V19.5H7V4.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M14 4.5V8.5H18" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M9.5 13H15.5M9.5 16H13.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function ThemeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 18.5C15.6 18.5 18.5 15.6 18.5 12C18.5 8.4 15.6 5.5 12 5.5V18.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M12 18.5C8.4 18.5 5.5 15.6 5.5 12C5.5 8.4 8.4 5.5 12 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function PlaylistViewIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5.5H10V10.5H5V5.5ZM14 5.5H19V10.5H14V5.5ZM5 14H10V19H5V14ZM14 14H19V19H14V14Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

export function PlaylistSortIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 6H17M7 12H14M7 18H11M18 13V19" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M15.5 16.5L18 19L20.5 16.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SidebarSortIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5.5H9V18.5H5V5.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M13 7H19M13 12H17M13 17H15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`filmwave-backend-section ${className}`}>{children}</div>;
}

export function CardTitle({ title }: { title: string; description?: string }) {
  return (
    <div className="filmwave-backend-section-header-bordered">
      <h2 className="filmwave-backend-section-title">{title}</h2>
    </div>
  );
}

export function Input({ label, value, placeholder, onChange, readOnly = false, type = "text" }: { label: string; value?: string; placeholder?: string; onChange?: (value: string) => void; readOnly?: boolean; type?: string }) {
  return (
    <label className="grid gap-1.5">
      <span>{label}</span>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className="filmwave-backend-input read-only:cursor-default read-only:bg-[var(--bg-secondary)]"
      />
    </label>
  );
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--filmwave-backend-control-radius)] border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-3">
      <div className="text-[11px] font-normal text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 truncate text-[12px] font-medium text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

export function Button({ children, subtle = false, dark = false, disabled = false, type = "button", onClick }: { children: React.ReactNode; subtle?: boolean; dark?: boolean; disabled?: boolean; type?: "button" | "submit"; onClick?: () => void }) {
  const variant = subtle
    ? "filmwave-backend-button-secondary"
    : "filmwave-backend-button-primary";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`filmwave-backend-button ${dark ? "filmwave-backend-button-primary" : variant}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="filmwave-backend-button filmwave-backend-button-secondary-danger">
      {children}
    </button>
  );
}

export function Option<T extends string>({ label, value, active, onClick }: { label: string; value: T; active: boolean; onClick: (value: T) => void }) {
  return (
    <button type="button" onClick={() => onClick(value)} className={`filmwave-backend-choice-button ${active ? "is-active" : ""}`}>
      {active ? <CheckIcon /> : null}
      {label}
    </button>
  );
}

export function Row({ title, description, icon, children }: { title: string; description: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center">
      <div className="flex gap-3">
        {icon ? <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">{icon}</div> : null}
        <div>
          <div className="text-[13px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">{title}</div>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">{children}</div>
    </div>
  );
}

export function Feedback({ message, tone }: { message: string; tone: "success" | "error" }) {
  return (
    <div className={`rounded-[7px] border px-3 py-2 text-xs ${tone === "success" ? "border-[rgba(72,181,113,0.35)] bg-[rgba(72,181,113,0.08)] text-[#48b571]" : "border-[rgba(220,88,79,0.35)] bg-[rgba(220,88,79,0.08)] text-[#dc584f]"}`}>
      {message}
    </div>
  );
}

export function AccountHero({ config }: { config: HeroConfig }) {
  return (
    <section className="mb-8 flex min-h-[58px] items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-[family-name:var(--font-aktiv-grotesk)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
          {config.title}
        </h1>
        <p className="mt-2 max-w-[620px] text-sm leading-6 text-[var(--text-secondary)]">
          {config.description}
        </p>
      </div>
    </section>
  );
}

export function VisualPanel({ image, index }: { image?: string; index?: number }) {
  const src = image || supportImages[(index || 0) % supportImages.length];
  return (
    <div className="relative h-32 overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
      <img src={src} alt="" className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:opacity-100" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.16))]" />
    </div>
  );
}

export function ProfileImageUploader({ initials, value, onChange }: { initials: string; value: string; onChange: (value: string) => void }) {
  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === "string" ? reader.result : "";
      onChange(image);
      localStorage.setItem("filmwave-profile-image", image);
      window.dispatchEvent(new Event("filmwave-profile-image-change"));
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    onChange("");
    localStorage.removeItem("filmwave-profile-image");
    window.dispatchEvent(new Event("filmwave-profile-image-change"));
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <label className="group relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-visible rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]">
        <span className="absolute inset-0 overflow-hidden rounded-full">{value ? <img src={value} alt="Profile" className="h-full w-full object-cover" /> : null}</span>
        {!value ? <span>{initials || "A"}</span> : null}
        <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] shadow-sm transition group-hover:text-[var(--text-primary)]"><PencilIcon /></span>
        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      </label>
      {value ? <button type="button" onClick={removeImage} className="text-[11px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">Remove photo</button> : null}
    </div>
  );
}
