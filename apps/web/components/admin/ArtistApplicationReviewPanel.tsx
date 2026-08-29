type ArtistApplicationSample = {
  id: string;
  file_name: string;
  audio_url: string;
  position: number;
  size_bytes: number | null;
  created_at: string;
};

type ArtistApplicationReviewPanelProps = {
  introText: string | null;
  description: string | null;
  websiteUrl: string | null;
  spotifyUrl: string | null;
  instagramUrl: string | null;
  profileImageUrl: string | null;
  heroImageUrl: string | null;
  samples: ArtistApplicationSample[];
};

function ReviewLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[11px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
    >
      {children}
    </a>
  );
}

export default function ArtistApplicationReviewPanel({
  introText,
  description,
  websiteUrl,
  spotifyUrl,
  instagramUrl,
  profileImageUrl,
  heroImageUrl,
  samples,
}: ArtistApplicationReviewPanelProps) {
  return (
    <section className="col-span-6 grid cursor-auto gap-4 pt-4 lg:grid-cols-[210px_minmax(0,1fr)_minmax(280px,0.9fr)]">
      <div className="grid cursor-auto gap-3">
        <div className="text-[11px] text-[var(--text-secondary)]">
          Profile images
        </div>
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[7px] border border-[var(--border)] bg-[var(--bg-tertiary)]">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="Artist thumbnail"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="h-14 w-24 shrink-0 overflow-hidden rounded-[7px] border border-[var(--border)] bg-[var(--bg-tertiary)]">
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt="Artist feature"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {websiteUrl ? <ReviewLink href={websiteUrl}>Website</ReviewLink> : null}
          {spotifyUrl ? <ReviewLink href={spotifyUrl}>Spotify</ReviewLink> : null}
          {instagramUrl ? <ReviewLink href={instagramUrl}>Instagram</ReviewLink> : null}
        </div>
      </div>

      <div className="grid cursor-auto content-start gap-4">
        <div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Intro text
          </div>
          <p className="mt-2 max-w-[620px] text-xs leading-5 text-[var(--text-primary)]">
            {introText || "—"}
          </p>
        </div>
        <div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Description
          </div>
          <p className="mt-2 max-w-[620px] text-xs leading-5 text-[var(--text-secondary)]">
            {description || "—"}
          </p>
        </div>
      </div>

      <div className="grid cursor-auto content-start gap-2">
        {samples.length > 0 ? (
          samples.map((sample) => (
            <div key={sample.id} className="grid gap-1.5">
              <div className="truncate text-[11px] text-[var(--text-secondary)]">
                {sample.file_name}
              </div>
              <audio
                controls
                preload="none"
                src={sample.audio_url}
                className="h-8 w-full"
              />
            </div>
          ))
        ) : (
          <p className="text-[11px] leading-5 text-[var(--text-muted)]">
            No sample files supplied. Review the external music links when available.
          </p>
        )}
      </div>
    </section>
  );
}
