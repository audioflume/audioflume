"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  Card,
  Feedback,
  Info,
  Input,
} from "@/components/account/AccountUI";
import ChevronDownIcon from "@/components/icons/ChevronDownIcon";

type ArtistApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

type ArtistApplication = {
  id: string;
  name: string;
  slug: string;
  status: ArtistApplicationStatus;
  website_url: string | null;
  spotify_url: string | null;
  instagram_url: string | null;
  designation: string | null;
  intro_text: string | null;
  bio: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  created_at: string;
};

type ApplicationResponse = {
  applications?: ArtistApplication[];
  application?: ArtistApplication;
  error?: string;
};

type ApplicationForm = {
  name: string;
  website_url: string;
  spotify_url: string;
  instagram_url: string;
  designation: string;
  intro_text: string;
  bio: string;
};

type ImageUploadResponse = {
  upload?: {
    kind: "profile" | "hero";
    key: string;
    url: string;
  };
  error?: string;
};

type SampleUploadResponse = {
  upload?: {
    key: string;
    url: string;
    file_name: string;
    size_bytes: number;
  };
  error?: string;
};

type UploadedSample = NonNullable<SampleUploadResponse["upload"]>;

const TOTAL_STEPS = 4;
const INTRO_CHARACTER_LIMIT = 114;
const DESCRIPTION_CHARACTER_LIMIT = 383;
const MAX_SAMPLE_FILES = 4;
const MAX_DESIGNATIONS = 3;
const PANEL_FADE_OUT_MS = 140;
const PANEL_FADE_IN_MS = 160;
const ARTIST_DESIGNATION_OPTIONS = [
  "Musician",
  "Producer",
  "Composer",
  "Songwriter",
  "Vocalist",
  "Instrumentalist",
  "Beatmaker",
  "DJ",
  "Sound Designer",
  "Engineer",
] as const;

const EMPTY_FORM: ApplicationForm = {
  name: "",
  website_url: "",
  spotify_url: "",
  instagram_url: "",
  designation: "",
  intro_text: "",
  bio: "",
};

function formatStatus(status: ArtistApplicationStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Changes needed";
  if (status === "suspended") return "Suspended";
  return "Pending review";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function parseDesignationSelections(value: string) {
  return value
    .split(/\s*\/\s*|\s*,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function SpotifyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M32,0C14.3,0,0,14.34,0,32s14.34,32,32,32,32-14.34,32-32S49.66,0,32,0ZM46.68,46.18c-.57.96-1.8,1.22-2.75.65-7.53-4.59-16.98-5.62-28.14-3.1-1.07.23-2.14-.42-2.37-1.49s.42-2.14,1.49-2.37c12.2-2.79,22.67-1.61,31.08,3.56.95.57,1.26,1.79.69,2.74,0,0,0,0,0,.01h0ZM50.58,37.47c-.73,1.19-2.26,1.53-3.44.84-8.6-5.28-21.72-6.81-31.89-3.75-1.34.38-2.71-.34-3.1-1.64-.38-1.34.34-2.71,1.68-3.1,11.62-3.52,26.07-1.83,35.98,4.24,1.15.69,1.49,2.22.76,3.4h0ZM50.92,28.37c-10.32-6.12-27.34-6.69-37.2-3.71-1.57.5-3.25-.42-3.75-1.99s.42-3.25,1.99-3.75c11.32-3.44,30.13-2.75,41.98,4.28,1.42.84,1.87,2.68,1.03,4.09-.76,1.45-2.64,1.91-4.05,1.07h0Z"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="4.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="17.4" cy="6.7" r="1" fill="currentColor" />
    </svg>
  );
}

function RequiredMark() {
  return (
    <span className="text-[9px] font-normal text-[var(--text-muted)]">
      Required
    </span>
  );
}

export default function ArtistApplicationForm() {
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [applications, setApplications] = useState<ArtistApplication[]>([]);
  const [submittedApplication, setSubmittedApplication] =
    useState<ArtistApplication | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [step, setStep] = useState(1);
  const [panelVisible, setPanelVisible] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [designationQuery, setDesignationQuery] = useState("");
  const [designationDropdownOpen, setDesignationDropdownOpen] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [sampleFiles, setSampleFiles] = useState<File[]>([]);
  const [showSampleRequirementWarning, setShowSampleRequirementWarning] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);
  const designationFieldRef = useRef<HTMLDivElement>(null);

  const pendingApplication = useMemo(
    () => applications.find((application) => application.status === "pending") ?? null,
    [applications],
  );
  const hasMusicLink = Boolean(
    form.website_url.trim() ||
      form.spotify_url.trim() ||
      form.instagram_url.trim(),
  );
  const selectedDesignations = parseDesignationSelections(form.designation).filter(
    (item) =>
      ARTIST_DESIGNATION_OPTIONS.includes(
        item as (typeof ARTIST_DESIGNATION_OPTIONS)[number],
      ),
  );
  const availableDesignations = ARTIST_DESIGNATION_OPTIONS.filter((option) => {
    const query = designationQuery.trim().toLowerCase();
    return (
      !selectedDesignations.includes(option) &&
      (!query || option.toLowerCase().includes(query))
    );
  });
  const profileImagePreviewUrl = useMemo(
    () => (profileImageFile ? URL.createObjectURL(profileImageFile) : null),
    [profileImageFile],
  );
  const heroImagePreviewUrl = useMemo(
    () => (heroImageFile ? URL.createObjectURL(heroImageFile) : null),
    [heroImageFile],
  );

  useEffect(() => {
    return () => {
      if (profileImagePreviewUrl) URL.revokeObjectURL(profileImagePreviewUrl);
    };
  }, [profileImagePreviewUrl]);

  useEffect(() => {
    return () => {
      if (heroImagePreviewUrl) URL.revokeObjectURL(heroImagePreviewUrl);
    };
  }, [heroImagePreviewUrl]);

  useEffect(() => {
    if (!designationDropdownOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (designationFieldRef.current?.contains(event.target as Node)) return;
      setDesignationDropdownOpen(false);
      setDesignationQuery("");
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [designationDropdownOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      try {
        const response = await fetch("/api/artists/apply", { cache: "no-store" });
        const body = (await response.json().catch(() => ({}))) as ApplicationResponse;

        if (!response.ok) {
          throw new Error(body.error || "Failed to load artist applications");
        }

        if (!cancelled) {
          setApplications(Array.isArray(body.applications) ? body.applications : []);
          setLoadState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState("error");
          setMessage({
            tone: "error",
            text:
              error instanceof Error
                ? error.message
                : "Failed to load artist applications",
          });
        }
      }
    }

    void loadApplications();

    return () => {
      cancelled = true;
    };
  }, []);

  async function uploadImage(file: File, kind: "profile" | "hero") {
    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("kind", kind);

    const response = await fetch("/api/artists/apply/images", {
      method: "POST",
      body: uploadData,
    });
    const body = (await response.json().catch(() => ({}))) as ImageUploadResponse;

    if (!response.ok || !body.upload) {
      throw new Error(body.error || "Failed to upload artist image");
    }

    return body.upload;
  }

  async function uploadSample(file: File) {
    const uploadData = new FormData();
    uploadData.append("file", file);

    const response = await fetch("/api/artists/apply/samples", {
      method: "POST",
      body: uploadData,
    });
    const body = (await response.json().catch(() => ({}))) as SampleUploadResponse;

    if (!response.ok || !body.upload) {
      throw new Error(body.error || "Failed to upload sample song");
    }

    return body.upload;
  }

  async function cleanupUploads(imageKeys: string[], sampleKeys: string[]) {
    try {
      await Promise.all([
        imageKeys.length > 0
          ? fetch("/api/artists/apply/images", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ keys: imageKeys }),
            })
          : Promise.resolve(),
        sampleKeys.length > 0
          ? fetch("/api/artists/apply/samples", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ keys: sampleKeys }),
            })
          : Promise.resolve(),
      ]);
    } catch (cleanupError) {
      console.error("Failed to clean up artist application uploads:", cleanupError);
    }
  }

  async function submitApplication() {
    if (submitting || step !== TOTAL_STEPS) return;

    if (pendingApplication) {
      setMessage({
        tone: "error",
        text: "You already have an artist application pending review.",
      });
      return;
    }

    if (
      !form.name.trim() ||
      !form.intro_text.trim() ||
      !form.bio.trim() ||
      form.intro_text.length > INTRO_CHARACTER_LIMIT ||
      form.bio.length > DESCRIPTION_CHARACTER_LIMIT ||
      !profileImageFile ||
      !heroImageFile
    ) {
      setMessage({
        tone: "error",
        text: "Complete all required application fields before submitting.",
      });
      return;
    }

    if (!hasMusicLink && sampleFiles.length === 0) {
      setShowSampleRequirementWarning(true);
      return;
    }

    setShowSampleRequirementWarning(false);
    setSubmitting(true);
    setMessage(null);
    const imageKeys: string[] = [];
    const sampleKeys: string[] = [];

    try {
      const profileUpload = await uploadImage(profileImageFile, "profile");
      imageKeys.push(profileUpload.key);

      const heroUpload = await uploadImage(heroImageFile, "hero");
      imageKeys.push(heroUpload.key);

      const uploadedSamples: UploadedSample[] = [];
      for (const file of sampleFiles) {
        const upload = await uploadSample(file);
        sampleKeys.push(upload.key);
        uploadedSamples.push(upload);
      }

      const response = await fetch("/api/artists/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          profile_image_url: profileUpload.url,
          hero_image_url: heroUpload.url,
          samples: uploadedSamples.map((sample) => ({
            file_name: sample.file_name,
            audio_url: sample.url,
            size_bytes: sample.size_bytes,
          })),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ApplicationResponse;

      if (!response.ok) {
        if (body.application) {
          setApplications((current) => {
            const withoutExisting = current.filter(
              (application) => application.id !== body.application?.id,
            );
            return [body.application as ArtistApplication, ...withoutExisting];
          });
        }
        throw new Error(body.error || "Failed to submit artist application");
      }

      if (!body.application) {
        throw new Error("Artist application was created without a response record");
      }

      const application = body.application;
      setApplications((current) => [application, ...current]);
      setSubmittedApplication(application);
      setForm(EMPTY_FORM);
      setDesignationQuery("");
      setDesignationDropdownOpen(false);
      setProfileImageFile(null);
      setHeroImageFile(null);
      setSampleFiles([]);
      setShowSampleRequirementWarning(false);
      setStep(1);
      setMessage({
        tone: "success",
        text: "Application submitted. Your artist profile is now pending review.",
      });
    } catch (error) {
      await cleanupUploads(imageKeys, sampleKeys);
      setMessage({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to submit artist application",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function transitionToStep(nextStep: number) {
    if (
      submitting ||
      transitioning ||
      nextStep < 1 ||
      nextStep > TOTAL_STEPS ||
      nextStep === step
    ) {
      return;
    }

    setMessage(null);
    setTransitioning(true);
    setPanelVisible(false);

    window.setTimeout(() => {
      setStep(nextStep);
      window.requestAnimationFrame(() => {
        setPanelVisible(true);
        window.setTimeout(() => setTransitioning(false), PANEL_FADE_IN_MS);
      });
    }, PANEL_FADE_OUT_MS);
  }

  function goBack() {
    if (step <= 1) return;
    if (step === TOTAL_STEPS) setShowSampleRequirementWarning(false);
    transitionToStep(step - 1);
  }

  function goNext() {
    if (step >= TOTAL_STEPS) return;
    transitionToStep(step + 1);
  }

  function selectDesignation(value: string) {
    if (selectedDesignations.length >= MAX_DESIGNATIONS) return;

    setForm((current) => ({
      ...current,
      designation: [...selectedDesignations, value].join(" / "),
    }));
    setDesignationQuery("");
    setDesignationDropdownOpen(selectedDesignations.length + 1 < MAX_DESIGNATIONS);
  }

  function removeDesignation(value: string) {
    setForm((current) => ({
      ...current,
      designation: selectedDesignations
        .filter((item) => item !== value)
        .join(" / "),
    }));
  }

  function addSampleFiles(files: FileList | null) {
    if (!files) return;
    const nextFiles = Array.from(files);

    if (sampleFiles.length + nextFiles.length > MAX_SAMPLE_FILES) {
      setMessage({
        tone: "error",
        text: `Upload no more than ${MAX_SAMPLE_FILES} sample songs.`,
      });
      return;
    }

    if (nextFiles.some((file) => !file.type.startsWith("audio/"))) {
      setMessage({ tone: "error", text: "Sample files must be audio files." });
      return;
    }

    setMessage(null);
    setShowSampleRequirementWarning(false);
    setSampleFiles((current) => [...current, ...nextFiles]);
  }

  const stepOneComplete = Boolean(form.name.trim());
  const stepTwoComplete = Boolean(
    form.intro_text.trim() &&
      form.bio.trim() &&
      form.intro_text.length <= INTRO_CHARACTER_LIMIT &&
      form.bio.length <= DESCRIPTION_CHARACTER_LIMIT,
  );
  const stepThreeComplete = Boolean(profileImageFile && heroImageFile);
  const nextDisabled =
    loadState === "loading" ||
    (step === 1 && !stepOneComplete) ||
    (step === 2 && !stepTwoComplete) ||
    (step === 3 && !stepThreeComplete);

  if (submittedApplication) {
    return (
      <Card>
        <div className="grid gap-3 p-4">
          <Info label="Artist" value={submittedApplication.name} />
          <Info label="Status" value={formatStatus(submittedApplication.status)} />
          <Info label="Submitted" value={formatDate(submittedApplication.created_at)} />
          {message ? <Feedback tone={message.tone} message={message.text} /> : null}
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <section className="filmwave-backend-section flex h-[420px] flex-col p-[50px]">
        <div
          className="min-h-0 flex-1 overflow-y-auto pb-px"
          style={{
            opacity: panelVisible ? 1 : 0,
            transition: `opacity ${
              panelVisible ? PANEL_FADE_IN_MS : PANEL_FADE_OUT_MS
            }ms ease`,
          }}
        >
          {step === 1 ? (
            <>
              <p className="m-0 max-w-[560px] text-[18px] font-[300] leading-[1.35] tracking-normal text-[var(--text-primary)]">
                Create your artist profile and submit it for review. Once approved, this profile will become the home for your catalogue, releases, playlists, and artist tools.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="flex items-baseline gap-1.5">
                    Artist Name
                    <RequiredMark />
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    placeholder="Artist name"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="filmwave-backend-input"
                  />
                </label>
                <Input
                  label="Website"
                  type="url"
                  value={form.website_url}
                  placeholder="https://"
                  onChange={(value) =>
                    setForm((current) => ({ ...current, website_url: value }))
                  }
                />
                <label className="grid gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <SpotifyIcon />
                    Spotify
                  </span>
                  <input
                    type="url"
                    value={form.spotify_url}
                    placeholder="https://open.spotify.com/..."
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        spotify_url: event.target.value,
                      }))
                    }
                    className="filmwave-backend-input"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="flex items-center gap-1.5">
                    <InstagramIcon />
                    Instagram
                  </span>
                  <input
                    type="url"
                    value={form.instagram_url}
                    placeholder="https://instagram.com/..."
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        instagram_url: event.target.value,
                      }))
                    }
                    className="filmwave-backend-input"
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-2 pb-2">
              <label className="grid gap-1.5">
                <span className="flex items-center justify-between gap-4">
                  <span className="flex items-baseline gap-1.5">
                    <span>Intro Text</span>
                    <RequiredMark />
                  </span>
                  <span className="text-[10px] font-normal text-[var(--text-muted)]">
                    {form.intro_text.length} / {INTRO_CHARACTER_LIMIT}
                  </span>
                </span>
                <textarea
                  value={form.intro_text}
                  maxLength={INTRO_CHARACTER_LIMIT}
                  rows={3}
                  placeholder="A short introduction to the artist."
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      intro_text: event.target.value,
                    }))
                  }
                  className="filmwave-backend-textarea"
                />
              </label>

              <div className="grid gap-1.5">
                <span className="flex items-center justify-between gap-4">
                  <span>Designation</span>
                  <span className="text-[10px] font-normal text-[var(--text-muted)]">
                    {selectedDesignations.length} / {MAX_DESIGNATIONS}
                  </span>
                </span>

                <div ref={designationFieldRef} className="relative">
                  <div className="flex h-10 min-w-0 items-center rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]">
                    <input
                      type="text"
                      value={designationQuery}
                      onChange={(event) => {
                        setDesignationQuery(event.target.value);
                        setDesignationDropdownOpen(true);
                      }}
                      onFocus={() => setDesignationDropdownOpen(true)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.preventDefault();
                      }}
                      disabled={selectedDesignations.length >= MAX_DESIGNATIONS}
                      placeholder={
                        selectedDesignations.length >= MAX_DESIGNATIONS
                          ? "3 designations selected"
                          : "Search designations"
                      }
                      className="h-full w-full min-w-0 flex-1 bg-transparent px-3 py-0 text-xs text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDesignationDropdownOpen((current) => !current)
                      }
                      disabled={selectedDesignations.length >= MAX_DESIGNATIONS}
                      className="flex h-full w-7 shrink-0 items-center justify-center text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Show designation options"
                    >
                      <ChevronDownIcon size={14} />
                    </button>
                  </div>

                  {designationDropdownOpen && availableDesignations.length > 0 ? (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-1 shadow-lg">
                      {availableDesignations.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectDesignation(option)}
                          className="block w-full px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {selectedDesignations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedDesignations.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => removeDesignation(option)}
                        className="filmwave-backend-choice-button is-active"
                      >
                        {option} ×
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="grid gap-1.5">
                <span className="flex items-center justify-between gap-4">
                  <span className="flex items-baseline gap-1.5">
                    <span>Description</span>
                    <RequiredMark />
                  </span>
                  <span className="text-[10px] font-normal text-[var(--text-muted)]">
                    {form.bio.length} / {DESCRIPTION_CHARACTER_LIMIT}
                  </span>
                </span>
                <textarea
                  value={form.bio}
                  maxLength={DESCRIPTION_CHARACTER_LIMIT}
                  rows={4}
                  placeholder="Tell us about the artist and the music you make."
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bio: event.target.value }))
                  }
                  className="filmwave-backend-textarea"
                />
              </label>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-5">
              <div>
                <div className="text-[18px] font-[300] leading-[1.35] text-[var(--text-primary)]">
                  Add the images that will shape your artist profile.
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  Both images are required. Images are optimized automatically after upload.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-[7px] border border-[var(--border)] bg-[var(--bg-tertiary)] bg-cover bg-center"
                    style={
                      profileImagePreviewUrl
                        ? { backgroundImage: `url(${profileImagePreviewUrl})` }
                        : undefined
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                      <span>Artist Thumbnail</span>
                      <RequiredMark />
                    </div>
                    <label className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary mt-3 inline-flex">
                      Choose image
                      <input
                        type="file"
                        accept="image/*"
                        disabled={submitting}
                        className="hidden"
                        onChange={(event) =>
                          setProfileImageFile(event.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className="h-14 w-24 shrink-0 overflow-hidden rounded-[7px] border border-[var(--border)] bg-[var(--bg-tertiary)] bg-cover bg-center"
                    style={
                      heroImagePreviewUrl
                        ? { backgroundImage: `url(${heroImagePreviewUrl})` }
                        : undefined
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                      <span>Feature Image</span>
                      <RequiredMark />
                    </div>
                    <label className="filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary mt-3 inline-flex">
                      Choose image
                      <input
                        type="file"
                        accept="image/*"
                        disabled={submitting}
                        className="hidden"
                        onChange={(event) =>
                          setHeroImageFile(event.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-4">
              <div>
                <div className="text-[18px] font-[300] leading-[1.35] text-[var(--text-primary)]">
                  Share a few samples of your music.
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  Upload up to four sample songs so our team can hear your music. If you have an active website, Spotify, or Instagram profile where your music can be heard, these uploads are optional.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="filmwave-backend-button filmwave-backend-button-secondary inline-flex">
                  Choose audio files
                  <input
                    type="file"
                    accept="audio/*"
                    multiple
                    disabled={submitting || sampleFiles.length >= MAX_SAMPLE_FILES}
                    className="hidden"
                    onChange={(event) => addSampleFiles(event.target.files)}
                  />
                </label>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {sampleFiles.length} / {MAX_SAMPLE_FILES} files
                </span>
              </div>

              {sampleFiles.length > 0 ? (
                <div className="grid gap-1.5">
                  {sampleFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex min-h-8 items-center justify-between gap-3 rounded-[7px] border border-[var(--border)] px-3 py-1.5"
                    >
                      <span className="min-w-0 truncate text-[11px] text-[var(--text-secondary)]">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          setSampleFiles((current) =>
                            current.filter((_, fileIndex) => fileIndex !== index),
                          )
                        }
                        className="shrink-0 border-0 bg-transparent p-0 text-[10px] text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex min-h-10 shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {step > 1 ? (
              <Button
                type="button"
                subtle
                disabled={submitting || transitioning}
                onClick={goBack}
              >
                Back
              </Button>
            ) : null}
            <div className="min-w-0 text-xs">
              {message ? <Feedback tone={message.tone} message={message.text} /> : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {step === TOTAL_STEPS &&
            showSampleRequirementWarning &&
            !hasMusicLink &&
            sampleFiles.length === 0 ? (
              <span className="text-[10px] font-normal text-[var(--status-error)]">
                Add a music link or at least one sample.
              </span>
            ) : null}
            <span className="text-[18px] font-[300] text-[var(--text-primary)]">
              {step}/{TOTAL_STEPS}
            </span>
            {step < TOTAL_STEPS ? (
              <Button
                type="button"
                disabled={submitting || transitioning || nextDisabled}
                onClick={goNext}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitting || transitioning}
                onClick={() => void submitApplication()}
              >
                {submitting ? "Submitting..." : "Submit application"}
              </Button>
            )}
          </div>
        </div>
      </section>
    </form>
  );
}
