"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import CreateProjectModal from "@/components/CreateProjectModal";
import HeartIcon from "@/components/icons/HeartIcon";

const placeholderProjects = [
  "Anian",
  "Brass Monkey Brewing",
  "Luxewell",
  "LYF",
  "Maxwell",
  "Nootka Lodge",
  "Pacific Sunday",
  "WCCH",
];

const mainLinks = [
  { label: "Discover", href: "/music", icon: "music" },
  { label: "Playlists", href: "/playlists", icon: "playlist" },
  { label: "Favorites", href: "/favorites", icon: "heart" },
  { label: "Sound FX", href: "/sound-fx", icon: "waveform" },
];

const aiLinks = [
  { label: "AI Song Match", href: "/ai-song-match", icon: "song-match" },
  { label: "Edit Points", href: "/edit-point-matching", icon: "marker" },
  { label: "Story Match", href: "/scene-mood-finder", icon: "scene" },
];

type SidebarTooltip = {
  label: string;
  top: number;
} | null;

function slugifyProject(project: string) {
  return project.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-");
}

function MusicIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 18.5C9 19.8807 7.65685 21 6 21C4.34315 21 3 19.8807 3 18.5C3 17.1193 4.34315 16 6 16C7.65685 16 9 17.1193 9 18.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M21 16.5C21 17.8807 19.6569 19 18 19C16.3431 19 15 17.8807 15 16.5C15 15.1193 16.3431 14 18 14C19.6569 14 21 15.1193 21 16.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M9 18.5V5.5L21 3.5V16.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 9L21 7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WaveformIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 13V11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M8 17V7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M12 20V4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M16 16V8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M20 13V11"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlaylistIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 12H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 17H12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3L13.8 8.2L19 10L13.8 11.8L12 17L10.2 11.8L5 10L10.2 8.2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M18 15L18.8 17.2L21 18L18.8 18.8L18 21L17.2 18.8L15 18L17.2 17.2L18 15Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SongMatchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.1 17.35C9.1 18.66 7.92 19.7 6.45 19.7C4.98 19.7 3.8 18.66 3.8 17.35C3.8 16.04 4.98 15 6.45 15C7.92 15 9.1 16.04 9.1 17.35Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M9.1 17.35V6.15L15.85 5V7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 8.75L15.85 7.6"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path
        d="M18.8 12.2L19.9 14.8L22.5 15.9L19.9 17L18.8 19.6L17.7 17L15.1 15.9L17.7 14.8L18.8 12.2Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MarkerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 5V19"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M18 5V19"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M9 8.5H15"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M9 15.5H15"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M12 10.5V13.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SceneIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7.5C4 6.67157 4.67157 6 5.5 6H18.5C19.3284 6 20 6.67157 20 7.5V16.5C20 17.3284 19.3284 18 18.5 18H5.5C4.67157 18 4 17.3284 4 16.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7 15L10 12L12.25 14.25L15.5 10.5L17 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 9H8.51"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7.5C4 6.67157 4.67157 6 5.5 6H9.4L11.1 8H18.5C19.3284 8 20 8.67157 20 9.5V17.5C20 18.3284 19.3284 19 18.5 19H5.5C4.67157 19 4 18.3284 4 17.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5V19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LibrarySectionIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 6H18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 11H18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 16H18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="6"
      height="9"
      viewBox="0 0 7 10"
      fill="none"
      aria-hidden="true"
      className={`transition-transform duration-200 ${
        collapsed ? "rotate-180" : ""
      }`}
    >
      <path d="M6.2 1L1.8 5L6.2 9V1Z" fill="currentColor" />
    </svg>
  );
}

function MainIcon({ icon }: { icon: string }) {
  if (icon === "music") return <MusicIcon />;
  if (icon === "playlist") return <PlaylistIcon />;
  if (icon === "heart") return <HeartIcon />;
  if (icon === "spark") return <SparkIcon />;
  if (icon === "song-match") return <SongMatchIcon />;
  if (icon === "marker") return <MarkerIcon />;
  if (icon === "scene") return <SceneIcon />;
  return <WaveformIcon />;
}

function SectionHeading({
  label,
  collapsed,
  icon,
}: {
  label: string;
  collapsed: boolean;
  icon: "library" | "ai";
}) {
  return (
    <div className="mb-2 flex h-[16px] items-center justify-center overflow-hidden">
      <div className="relative flex h-[16px] w-full items-center justify-center">
        <span
          className={`absolute left-2.5 text-[11px] font-medium whitespace-nowrap text-[var(--text-muted)] transition-[opacity,transform] duration-150 ${
            collapsed
              ? "pointer-events-none -translate-x-1 opacity-0"
              : "translate-x-0 opacity-100"
          }`}
        >
          {label}
        </span>

        <span
          className={`absolute left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center text-[var(--text-muted)] transition-[opacity,transform] duration-150 ${
            collapsed
              ? "scale-100 opacity-[0.3]"
              : "pointer-events-none scale-90 opacity-0"
          }`}
          aria-hidden="true"
        >
          {icon === "library" ? <LibrarySectionIcon /> : <SparkIcon />}
        </span>
      </div>
    </div>
  );
}

function SidebarLink({
  label,
  href,
  icon,
  collapsed,
}: {
  label: string;
  href: string;
  icon?: string;
  collapsed: boolean;
}) {
  const pathname = usePathname();

  const active =
    href === "/music"
      ? pathname === "/music"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={label}
      className={`group flex h-8 items-center rounded-md px-2.5 text-[13px] font-medium transition ${
        active
          ? "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
      }`}
    >
      {icon && (
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center transition ${
            active
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
          }`}
        >
          <MainIcon icon={icon} />
        </span>
      )}

      <span
        className={`ml-2.5 min-w-0 truncate transition-[opacity,transform,width] duration-150 ${
          collapsed
            ? "w-0 translate-x-1 opacity-0"
            : "w-auto translate-x-0 opacity-100"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

function ProjectLink({
  project,
  collapsed,
  onTooltipChange,
}: {
  project: string;
  collapsed: boolean;
  onTooltipChange: (tooltip: SidebarTooltip) => void;
}) {
  const pathname = usePathname();
  const href = `/projects/${slugifyProject(project)}`;
  const active = pathname === href;

  function showTooltip(element: HTMLElement) {
    if (!collapsed) return;

    const rect = element.getBoundingClientRect();

    onTooltipChange({
      label: project,
      top: rect.top + rect.height / 2,
    });
  }

  function hideTooltip() {
    onTooltipChange(null);
  }

  return (
    <Link
      href={href}
      title={collapsed ? project : undefined}
      aria-label={project}
      onMouseEnter={(event) => showTooltip(event.currentTarget)}
      onMouseLeave={hideTooltip}
      onFocus={(event) => showTooltip(event.currentTarget)}
      onBlur={hideTooltip}
      className={`group flex h-7 items-center rounded-md px-2.5 text-[13px] font-medium transition ${
        active
          ? "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center transition ${
          active
            ? "text-[var(--text-primary)]"
            : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
        }`}
      >
        <FolderIcon />
      </span>

      <span
        className={`ml-2.5 min-w-0 truncate transition-[opacity,transform,width] duration-150 ${
          collapsed
            ? "w-0 translate-x-1 opacity-0"
            : "w-auto translate-x-0 opacity-100"
        }`}
      >
        {project}
      </span>
    </Link>
  );
}

export default function Sidebar() {
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectTooltip, setProjectTooltip] = useState<SidebarTooltip>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [forceCollapsed, setForceCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;
  const sidebarCollapsed = mounted ? collapsed || forceCollapsed : false;

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem("filmwave-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    if (!mounted) return;

    function handleResize() {
      setForceCollapsed(window.innerWidth < 768);
    }

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    document.body.classList.toggle("sidebar-collapsed", sidebarCollapsed);
    localStorage.setItem("filmwave-sidebar-collapsed", String(collapsed));
  }, [collapsed, sidebarCollapsed, mounted]);

  useEffect(() => {
    return () => {
      document.body.classList.remove("sidebar-collapsed");
      setProjectTooltip(null);
    };
  }, []);

  return (
    <>
      <aside
        className={`group/sidebar fixed left-0 z-30 flex flex-col border-r border-[var(--border)] bg-[var(--bg-primary)] transition-[width] duration-200 ${
          sidebarCollapsed
            ? "w-[var(--sidebar-width-collapsed)]"
            : "w-[var(--sidebar-width-expanded)]"
        }`}
        style={{ top: "56px", bottom: playerVisible ? "64px" : "0px" }}
      >
        <div className="absolute top-0 right-0 bottom-0 z-20 flex w-4 items-center justify-center">
          <div className="group/collapse-zone flex h-full w-4 items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setCollapsed((value) => !value);
                setProjectTooltip(null);
              }}
              className="flex h-14 w-4 cursor-pointer items-center justify-center text-[var(--text-muted)] opacity-0 transition-opacity duration-150 group-hover/collapse-zone:opacity-35 hover:opacity-55 hover:text-[var(--text-secondary)]"
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <CollapseIcon collapsed={sidebarCollapsed} />
            </button>
          </div>
        </div>

        <div
          className={`flex flex-1 flex-col overflow-y-auto pt-6 pb-6 transition-[padding] duration-200 ${
            sidebarCollapsed ? "px-5" : "px-5"
          }`}
        >
          <div className="border-b border-[var(--border)] pb-5">
            <SectionHeading
              label="Library"
              collapsed={sidebarCollapsed}
              icon="library"
            />

            <div className="space-y-[2px]">
              {mainLinks.map((link) => (
                <SidebarLink
                  key={link.href}
                  label={link.label}
                  href={link.href}
                  icon={link.icon}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 border-b border-[var(--border)] pb-5">
            <SectionHeading
              label="AI Tools"
              collapsed={sidebarCollapsed}
              icon="ai"
            />

            <div className="space-y-[2px]">
              {aiLinks.map((link) => (
                <SidebarLink
                  key={link.href}
                  label={link.label}
                  href={link.href}
                  icon={link.icon}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col">
            <div
              className={`relative mb-2 flex h-[24px] items-center rounded-md transition-[padding] duration-200 ${
                sidebarCollapsed
                  ? "justify-center px-0"
                  : "justify-between px-2.5"
              }`}
            >
              <span
                className={`text-[11px] font-medium whitespace-nowrap text-[var(--text-muted)] transition-[opacity,transform] duration-150 ${
                  sidebarCollapsed
                    ? "pointer-events-none absolute -translate-x-2 opacity-0"
                    : "relative translate-x-0 opacity-100"
                }`}
              >
                Projects
              </span>

              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(true)}
                className={`flex cursor-pointer items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)] ${
                  sidebarCollapsed ? "h-7 w-full" : "h-6 w-6"
                }`}
                aria-label="Create new project"
                title="Create new project"
              >
                <PlusIcon />
              </button>
            </div>

            <div className="space-y-[2px]">
              {placeholderProjects.map((project) => (
                <ProjectLink
                  key={project}
                  project={project}
                  collapsed={sidebarCollapsed}
                  onTooltipChange={setProjectTooltip}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      {projectTooltip && sidebarCollapsed && (
        <div
          className="pointer-events-none fixed z-[140]"
          style={{
            left: "calc(var(--sidebar-width-collapsed) - 11px)",
            top: projectTooltip.top,
            transform: "translateY(-50%)",
          }}
        >
          <div
            className="rounded-md bg-[var(--border)] p-px"
            style={{
              clipPath: "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)",
            }}
          >
            <div
              className="rounded-md px-3.5 py-1.5 pl-5 text-[12px] font-medium whitespace-nowrap text-[var(--text-primary)] shadow-[var(--shadow-ui)]"
              style={{
                backgroundColor: "var(--bg-primary)",
                clipPath:
                  "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)",
              }}
            >
              {projectTooltip.label}
            </div>
          </div>
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </>
  );
}
