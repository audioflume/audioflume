"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CreateProjectModal from "@/components/CreateProjectModal";
import EditProjectModal from "@/components/EditProjectModal";
import HeartIcon from "@/components/icons/HeartIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import type { Project } from "@/lib/types";

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

type ProjectMenuState = {
  project: Project;
  top: number;
  left: number;
} | null;

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

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12.5L9.5 17L19 7"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
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

function DragHandleIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 7H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 12H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 17H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HorizontalMoreIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
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

function sortProjectsByName(projects: Project[]) {
  return [...projects].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

function sortProjectsByPosition(projects: Project[]) {
  return [...projects].sort((a, b) => {
    const aPosition = typeof a.position === "number" ? a.position : Infinity;
    const bPosition = typeof b.position === "number" ? b.position : Infinity;

    if (aPosition !== bPosition) return aPosition - bPosition;

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function SidebarTooltipEl({ label, top }: { label: string; top: number }) {
  return (
    <div
      className="pointer-events-none fixed z-[140]"
      style={{
        left: "calc(var(--sidebar-width-collapsed) - 11px)",
        top,
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
            clipPath: "polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)",
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  label,
  collapsed,
  ready,
  icon,
}: {
  label: string;
  collapsed: boolean;
  ready: boolean;
  icon: "library" | "ai";
}) {
  return (
    <div className="mb-2 flex h-[16px] items-center justify-center overflow-hidden">
      <div className="relative flex h-[16px] w-full items-center justify-center">
        <span
          className={`absolute left-2.5 text-[11px] font-medium whitespace-nowrap text-[var(--text-muted)] ${
            ready ? "transition-[opacity,transform] duration-150" : ""
          } ${
            collapsed
              ? "pointer-events-none -translate-x-1 opacity-0"
              : "translate-x-0 opacity-100"
          }`}
        >
          {label}
        </span>

        <span
          className={`absolute left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center text-[var(--text-muted)] ${
            ready ? "transition-[opacity,transform] duration-150" : ""
          } ${
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
  ready,
  onTooltipChange,
}: {
  label: string;
  href: string;
  icon?: string;
  collapsed: boolean;
  ready: boolean;
  onTooltipChange: (tooltip: SidebarTooltip) => void;
}) {
  const pathname = usePathname();

  const active =
    href === "/music"
      ? pathname === "/music"
      : pathname === href || pathname.startsWith(`${href}/`);

  function showTooltip(element: HTMLElement) {
    if (!collapsed) return;

    const rect = element.getBoundingClientRect();

    onTooltipChange({ label, top: rect.top + rect.height / 2 });
  }

  function hideTooltip() {
    onTooltipChange(null);
  }

  return (
    <Link
      href={href}
      aria-label={label}
      onMouseEnter={(event) => showTooltip(event.currentTarget)}
      onMouseLeave={hideTooltip}
      onFocus={(event) => showTooltip(event.currentTarget)}
      onBlur={hideTooltip}
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
        className={`ml-2.5 min-w-0 truncate ${
          ready ? "transition-[opacity,transform,width] duration-150" : ""
        } ${
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

function ProjectMenu({
  menu,
  onEdit,
  onStartReorder,
  onDelete,
  onClose,
}: {
  menu: ProjectMenuState;
  onEdit: (project: Project) => void;
  onStartReorder: () => void;
  onDelete: (project: Project) => void;
  onClose: () => void;
}) {
  if (!menu) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close project menu"
        className="fixed inset-0 z-[149] cursor-default bg-transparent"
        onClick={onClose}
      />

      <div
        className="fixed z-[150] w-[190px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-1 shadow-[var(--shadow-ui)]"
        style={{
          top: menu.top,
          left: menu.left,
        }}
      >
        <button
          type="button"
          className="flex h-9 w-full cursor-pointer items-center rounded-lg px-3 text-left text-[12px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          onClick={() => {
            onClose();
            onEdit(menu.project);
          }}
        >
          Edit details
        </button>

        <button
          type="button"
          className="flex h-9 w-full cursor-pointer items-center rounded-lg px-3 text-left text-[12px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          onClick={() => {
            onClose();
            onStartReorder();
          }}
        >
          Reorder
        </button>

        <button
          type="button"
          className="danger-hover flex h-9 w-full cursor-pointer items-center rounded-lg px-3 text-left text-[12px] font-medium transition"
          onClick={() => {
            onClose();
            onDelete(menu.project);
          }}
        >
          Delete Project
        </button>
      </div>
    </>
  );
}

function ProjectLink({
  project,
  collapsed,
  ready,
  menuOpen,
  onOpenMenu,
  onTooltipChange,
}: {
  project: Project;
  collapsed: boolean;
  ready: boolean;
  menuOpen: boolean;
  onOpenMenu: (project: Project, element: HTMLElement) => void;
  onTooltipChange: (tooltip: SidebarTooltip) => void;
}) {
  const pathname = usePathname();
  const href = `/projects/${project.id}`;
  const active = pathname === href;

  function showTooltip(element: HTMLElement) {
    if (!collapsed) return;

    const rect = element.getBoundingClientRect();

    onTooltipChange({ label: project.name, top: rect.top + rect.height / 2 });
  }

  function hideTooltip() {
    onTooltipChange(null);
  }

  return (
    <div
      className={`group/project-row flex h-7 items-center rounded-md px-2.5 text-[13px] font-medium transition ${
        active
          ? "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
      }`}
      onMouseEnter={(event) => showTooltip(event.currentTarget)}
      onMouseLeave={hideTooltip}
      onFocus={(event) => showTooltip(event.currentTarget)}
      onBlur={hideTooltip}
    >
      <Link
        href={href}
        aria-label={project.name}
        className="flex min-w-0 flex-1 items-center"
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center transition ${
            active
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-muted)] group-hover/project-row:text-[var(--text-primary)]"
          }`}
        >
          <FolderIcon />
        </span>

        <span
          className={`ml-2.5 min-w-0 truncate ${
            ready ? "transition-[opacity,transform,width] duration-150" : ""
          } ${
            collapsed
              ? "w-0 translate-x-1 opacity-0"
              : "w-auto translate-x-0 opacity-100"
          }`}
        >
          {project.name}
        </span>
      </Link>

      {!collapsed && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onOpenMenu(project, event.currentTarget);
          }}
          className={`ml-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center text-[var(--text-muted)] opacity-0 transition group-hover/project-row:opacity-100 hover:text-[var(--text-primary)] ${
            menuOpen ? "text-[var(--text-primary)] opacity-100" : ""
          }`}
          aria-label={`${project.name} options`}
          aria-expanded={menuOpen}
        >
          <HorizontalMoreIcon />
        </button>
      )}
    </div>
  );
}

function SortableProjectLink({
  project,
  ready,
  dragActive,
}: {
  project: Project;
  ready: boolean;
  dragActive: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group/project-row flex h-7 cursor-grab touch-none items-center rounded-md px-2.5 text-[13px] font-medium text-[var(--text-secondary)] transition active:cursor-grabbing ${
        dragActive
          ? ""
          : "hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
      } ${isDragging ? "relative z-50 opacity-45" : "opacity-100"}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center text-[var(--text-muted)] ${
          dragActive ? "" : "group-hover/project-row:text-[var(--text-primary)]"
        }`}
      >
        <DragHandleIcon />
      </span>

      <span
        className={`ml-2.5 min-w-0 flex-1 truncate ${
          ready ? "transition-[opacity,transform,width] duration-150" : ""
        }`}
      >
        {project.name}
      </span>
    </div>
  );
}

export default function Sidebar({
  initialCollapsed = false,
}: {
  initialCollapsed?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [tooltip, setTooltip] = useState<SidebarTooltip>(null);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [forceCollapsed, setForceCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [projectOrder, setProjectOrder] = useState<number[]>([]);
  const [reorderMode, setReorderMode] = useState(false);
  const [projectMenu, setProjectMenu] = useState<ProjectMenuState>(null);
  const [activeDragProjectId, setActiveDragProjectId] = useState<number | null>(
    null,
  );
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(
    null,
  );

  const { currentSong } = usePlayer();
  const { projects, setProjects } = useProjectsContext();
  const { sidebarProjectSortMode, setSidebarProjectSortMode } =
    useUserPreferences();

  const playerVisible = !!currentSong;
  const sidebarCollapsed = collapsed || forceCollapsed;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const displayedProjects = useMemo(() => {
    const projectMap = new Map(
      projects.map((project) => [project.id, project]),
    );

    if (sidebarProjectSortMode === "custom") {
      if (projectOrder.length > 0) {
        const orderedProjects = projectOrder
          .map((projectId) => projectMap.get(projectId))
          .filter((project): project is Project => Boolean(project));

        const missingProjects = projects.filter(
          (project) => !projectOrder.includes(project.id),
        );

        return [...orderedProjects, ...sortProjectsByPosition(missingProjects)];
      }

      return sortProjectsByPosition(projects);
    }

    return sortProjectsByName(projects);
  }, [projectOrder, projects, sidebarProjectSortMode]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    setProjectOrder((current) => {
      const projectIds = projects.map((project) => project.id);
      const projectIdSet = new Set(projectIds);

      const nextOrder = current.filter((projectId) =>
        projectIdSet.has(projectId),
      );

      for (const projectId of projectIds) {
        if (!nextOrder.includes(projectId)) {
          nextOrder.push(projectId);
        }
      }

      if (
        nextOrder.length === current.length &&
        nextOrder.every((projectId, index) => projectId === current[index])
      ) {
        return current;
      }

      return nextOrder;
    });
  }, [projects]);

  useEffect(() => {
    function handleResize() {
      setForceCollapsed(window.innerWidth < 768);
      setProjectMenu(null);
    }

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", sidebarCollapsed);
    localStorage.setItem("filmwave-sidebar-collapsed", String(collapsed));
    document.cookie = `filmwave-sidebar-collapsed=${collapsed};path=/;max-age=31536000`;
  }, [collapsed, sidebarCollapsed]);

  useEffect(() => {
    return () => {
      document.body.classList.remove("sidebar-collapsed");
      setTooltip(null);
    };
  }, []);

  function updateProjectOrder(nextProjects: Project[]) {
    const nextOrder = nextProjects.map((project) => project.id);

    setProjectOrder(nextOrder);
    setSidebarProjectSortMode("custom");
  }

  function saveProjectOrder(nextProjects: Project[]) {
    updateProjectOrder(nextProjects);

    void Promise.all(
      nextProjects.map((project, index) =>
        fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            position: index,
          }),
        }).catch(() => null),
      ),
    );
  }

  function startReorderMode() {
    const currentOrder = displayedProjects.map((project) => project.id);

    setProjectMenu(null);
    setReorderMode(true);
    setSidebarProjectSortMode("custom");
    setProjectOrder(currentOrder);
  }

  function finishReorderMode() {
    saveProjectOrder(displayedProjects);
    setReorderMode(false);
    setActiveDragProjectId(null);
  }

  function restoreAlphabeticalOrder() {
    const alphabeticalProjects = sortProjectsByName(projects);
    const alphabeticalOrder = alphabeticalProjects.map((project) => project.id);

    setReorderMode(false);
    setActiveDragProjectId(null);
    setSidebarProjectSortMode("alphabetical");
    setProjectOrder(alphabeticalOrder);
  }

  function handleProjectDragStart(event: DragStartEvent) {
    setActiveDragProjectId(Number(event.active.id));
  }

  function handleProjectDragEnd(event: DragEndEvent) {
    setActiveDragProjectId(null);

    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = displayedProjects.findIndex(
      (project) => project.id === active.id,
    );
    const newIndex = displayedProjects.findIndex(
      (project) => project.id === over.id,
    );

    if (oldIndex < 0 || newIndex < 0) return;

    const nextProjects = arrayMove(displayedProjects, oldIndex, newIndex);

    updateProjectOrder(nextProjects);
  }

  function handleProjectDragCancel() {
    setActiveDragProjectId(null);
  }

  function openProjectMenu(project: Project, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const menuWidth = 190;

    const left = Math.min(rect.right + 12, window.innerWidth - menuWidth - 12);
    const top = Math.min(rect.top - 4, window.innerHeight - 150);

    setTooltip(null);
    setProjectMenu({
      project,
      left,
      top,
    });
  }

  function openEditProject(project: Project) {
    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
  }

  async function handleSaveProject() {
    if (!editingProject || isSavingProject) return;

    const cleanName = editName.trim();

    if (!cleanName) return;

    setIsSavingProject(true);

    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          description: editDescription.trim() || null,
        }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        console.error("Failed to update project:", data || res.statusText);
        return;
      }

      setProjects((current) =>
        current.map((project) =>
          project.id === editingProject.id
            ? data || {
                ...project,
                name: cleanName,
                description: editDescription.trim() || null,
              }
            : project,
        ),
      );

      setEditingProject(null);
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleDeleteProject(project: Project) {
    if (deletingProjectId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingProjectId(project.id);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        console.error("Failed to delete project:", data || res.statusText);
        return;
      }

      setProjects((current) =>
        current.filter((currentProject) => currentProject.id !== project.id),
      );

      setProjectOrder((current) =>
        current.filter((projectId) => projectId !== project.id),
      );

      if (pathname === `/projects/${project.id}`) {
        router.push("/music");
      }
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <>
      <aside
        className={`group/sidebar fixed left-0 z-30 flex flex-col border-r border-[var(--border)] bg-[var(--bg-primary)] ${
          ready ? "transition-[width] duration-200" : ""
        }`}
        data-sidebar
        style={{ top: "56px", bottom: playerVisible ? "64px" : "0px" }}
      >
        <div className="absolute top-0 right-0 bottom-0 z-20 flex w-4 items-center justify-center">
          <div className="group/collapse-zone flex h-full w-4 items-center justify-center">
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => {
                setCollapsed((value) => !value);
                setTooltip(null);
                setProjectMenu(null);
              }}
              className="flex h-14 w-4 cursor-pointer items-center justify-center text-[var(--text-muted)] opacity-0 transition-opacity duration-150 group-hover/collapse-zone:opacity-35 hover:opacity-55 hover:text-[var(--text-secondary)]"
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              <CollapseIcon collapsed={sidebarCollapsed} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-6 pb-6">
          <div className="border-b border-[var(--border)] pb-5">
            <SectionHeading
              label="Library"
              collapsed={sidebarCollapsed}
              ready={ready}
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
                  ready={ready}
                  onTooltipChange={setTooltip}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 border-b border-[var(--border)] pb-5">
            <SectionHeading
              label="AI Tools"
              collapsed={sidebarCollapsed}
              ready={ready}
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
                  ready={ready}
                  onTooltipChange={setTooltip}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col">
            <div
              className={`relative mb-2 flex h-[24px] items-center rounded-md ${
                ready ? "transition-[padding] duration-200" : ""
              } ${
                sidebarCollapsed
                  ? "justify-center px-0"
                  : "justify-between px-2.5"
              }`}
            >
              <span
                className={`text-[11px] font-medium whitespace-nowrap text-[var(--text-muted)] ${
                  ready ? "transition-[opacity,transform] duration-150" : ""
                } ${
                  sidebarCollapsed
                    ? "pointer-events-none absolute -translate-x-2 opacity-0"
                    : "relative translate-x-0 opacity-100"
                }`}
              >
                Projects
              </span>

              <div className="flex items-center gap-1">
                {!sidebarCollapsed && reorderMode && (
                  <button
                    type="button"
                    onClick={restoreAlphabeticalOrder}
                    className="h-6 cursor-pointer rounded-md px-2 text-[10px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
                  >
                    Alphabetical
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (reorderMode) {
                      finishReorderMode();
                      return;
                    }

                    setProjectMenu(null);
                    setIsCreateProjectOpen(true);
                  }}
                  onMouseEnter={(event) => {
                    if (!sidebarCollapsed) return;

                    const rect = event.currentTarget.getBoundingClientRect();

                    setTooltip({
                      label: reorderMode ? "Save Order" : "New Project",
                      top: rect.top + rect.height / 2,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  className={`flex cursor-pointer items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)] ${
                    sidebarCollapsed ? "h-7 w-full" : "h-6 w-6"
                  }`}
                  aria-label={
                    reorderMode ? "Save project order" : "Create new project"
                  }
                >
                  {reorderMode ? <CheckIcon /> : <PlusIcon />}
                </button>
              </div>
            </div>

            {reorderMode && !sidebarCollapsed ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleProjectDragStart}
                onDragEnd={handleProjectDragEnd}
                onDragCancel={handleProjectDragCancel}
              >
                <SortableContext
                  items={displayedProjects.map((project) => project.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-[2px]">
                    {displayedProjects.map((project) => (
                      <SortableProjectLink
                        key={project.id}
                        project={project}
                        ready={ready}
                        dragActive={activeDragProjectId !== null}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="space-y-[2px]">
                {displayedProjects.map((project) => (
                  <ProjectLink
                    key={project.id}
                    project={project}
                    collapsed={sidebarCollapsed}
                    ready={ready}
                    menuOpen={projectMenu?.project.id === project.id}
                    onOpenMenu={openProjectMenu}
                    onTooltipChange={setTooltip}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      <ProjectMenu
        menu={projectMenu}
        onClose={() => setProjectMenu(null)}
        onEdit={openEditProject}
        onStartReorder={startReorderMode}
        onDelete={handleDeleteProject}
      />

      {tooltip && sidebarCollapsed && (
        <SidebarTooltipEl label={tooltip.label} top={tooltip.top} />
      )}

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={(project) => {
          setProjects((current) => {
            const nextProjects = [...current, project];

            return sidebarProjectSortMode === "custom"
              ? sortProjectsByPosition(nextProjects)
              : sortProjectsByName(nextProjects);
          });

          setProjectOrder((current) => {
            if (sidebarProjectSortMode === "custom") {
              return [...current, project.id];
            }

            return sortProjectsByName([...projects, project]).map(
              (item) => item.id,
            );
          });

          setIsCreateProjectOpen(false);
        }}
      />

      <EditProjectModal
        isOpen={!!editingProject}
        project={editingProject}
        name={editName}
        description={editDescription}
        isSaving={isSavingProject}
        onNameChange={setEditName}
        onDescriptionChange={setEditDescription}
        onSave={handleSaveProject}
        onDelete={() => {
          if (!editingProject) return;
          handleDeleteProject(editingProject);
          setEditingProject(null);
        }}
        onClose={() => setEditingProject(null)}
      />
    </>
  );
}
