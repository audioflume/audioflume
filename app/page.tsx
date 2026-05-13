import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-8 text-[var(--text-primary)]">
      <div className="max-w-[520px] text-center">
        <h1 className="font-[family-name:var(--font-instrument-sans)] text-[44px] font-medium leading-none tracking-[-0.055em]">
          Filmwave
        </h1>

        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          Music and creative assets for filmmakers.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/music"
            className="flex h-9 items-center justify-center rounded-full bg-[var(--text-primary)] px-5 text-xs font-semibold text-[var(--bg-primary)] transition hover:opacity-80"
          >
            Enter Library
          </Link>
        </div>
      </div>
    </main>
  );
}
