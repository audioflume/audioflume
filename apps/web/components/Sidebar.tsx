"use client";

import {
  SidebarCollapseControl,
  SidebarInner,
  SidebarLinkRow,
  SidebarNav,
  SidebarProjectsHeader,
  SidebarSection,
  SidebarSectionHeading,
  SidebarShell,
  type SidebarTooltipState,
} from "@filmwave/shared";
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
import Toast from "@/components/Toast";
import AiIcon from "@/components/icons/AiIcon";
import CheckIcon from "@/components/icons/CheckIcon";
import DragIconSmall from "@/components/icons/DragIconSmall";
import EditPointsIcon from "@/components/icons/EditPointsIcon";
import FolderIcon from "@/components/icons/FolderIcon";
import HeartIcon from "@/components/icons/HeartIcon";
import LibraryIcon from "@/components/icons/LibraryIcon";
import MusicIcon from "@/components/icons/MusicIcon";
import PlaylistIcon from "@/components/icons/PlaylistIcon";
import PlusIcon from "@/components/icons/PlusIcon";
import SongMatchIcon from "@/components/icons/SongMatchIcon";
import StoryMatchIcon from "@/components/icons/StoryMatchIcon";
import WaveformIcon from "@/components/icons/WaveformIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import type { Project } from "@/lib/types";

const mainLinks = [
  { label: "Music Library", href: "/music", icon: "music" },
  { label: "My Playlists", href: "/playlists", icon: "playlist" },
  { label: "Favorites", href: "/favorites", icon: "heart" },
  { label: "Sound FX", href: "/sound-fx", icon: "waveform" },
];

const aiLinks = [
  { label: "AI Song Match", href: "/ai-song-match", icon: "song-match" },
  { label: "Edit Points", href: "/edit-point-matching", icon: "marker" },
  { label: "Story Match", href: "/scene-mood-finder", icon: "scene" },
];

type ProjectMenuState = {
  project: Project;
  top: number;
  left: number;
} | null;

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="6"
      height="9"
      viewBox="0 0 7 10"
      fill="none"
      aria-hidden="true"
      className={collapsed ? "desktop-sidebar-collapse-icon is-collapsed" : "desktop-sidebar-collapse-icon"}
    >
      <path d="M6.2 1L1.8 5L6.2 9V1Z" fill="currentColor" />
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
  if (icon === "playlist") return <PlaylistIcon size={14} />;
  if (icon === "heart") return <HeartIcon />;
  if (icon === "song-match") return <SongMatchIcon />;
  if (icon === "marker") return <EditPointsIcon />;
  if (icon === "scene") return <StoryMatchIcon />;
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

function isHrefActive(pathname: string, href: string) {
  return href === "/music" ? pathname === "/music" : pathname === href || pathname.startsWith(`${href}/`);
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
        style={{ top: menu.top, left: menu.left }}
      >
        <button
          type="button"
          className="flex h-9 w-full cursor-pointer items-center rounded-lg px-3 text-left text-[12px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          onClick={() => { onClose(); onEdit(menu.project); }}
        >
          Edit details
        </button>

        <button
          type="button"
          className="flex h-9 w-full cursor-pointer items-center rounded-lg px-3 text-left text-[12px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          onClick={() => { onClose(); onStartReorder(); }}
        >
          Reorder
        </button>

        <button
          type="button"
          className="danger-hover flex h-9 w-full cursor-pointer items-center rounded-lg px-3 text-left text-[12px] font-medium transition"
          onClick={() => { onClose(); onDelete(menu.project); }}
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
  menuOpen,
  onOpenMenu,
  onTooltipChange,
}: {
  project: Project;
  collapsed: boolean;
  menuOpen: boolean;
  onOpenMenu: (project: Project, element: HTMLElement) => void;
  onTooltipChange: (tooltip: SidebarTooltipState) => void;
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
      className={`desktop-sidebar-link group/project-row${active ? " is-active" : ""}`}
      onMouseEnter={(event) => showTooltip(event.currentTarget)}
      onMouseLeave={hideTooltip}
      onFocus={(event) => showTooltip(event.currentTarget)}
      onBlur={hideTooltip}
    >
      <Link href={href} aria-label={project.name} className="flex min-w-0 flex-1 items-center">
        <span className="desktop-sidebar-link-icon">
          <FolderIcon />
        </span>

        <span className="desktop-sidebar-link-label">
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
  dragActive,
}: {
  project: Project;
  dragActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`desktop-sidebar-link group/project-row cursor-grab touch-none active:cursor-grabbing ${
        dragActive ? "" : ""
      } ${isDragging ? "relative z-50 opacity-45" : "opacity-100"}`}
    >
      <span className="desktop-sidebar-link-icon">
        <DragIconSmall />
      </span>

      <span className="desktop-sidebar-link-label flex-1">
        {project.name}
      </span>
    </div>
  );
}

export default function Sidebar({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [tooltip, setTooltip] = useState<SidebarTooltipState>(null);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [forceCollapsed, setForceCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [projectOrder, setProjectOrder] = useState<number[]>([]);
  const [reorderMode, setReorderMode] = useState(false);
  const [projectMenu, setProjectMenu] = useState<ProjectMenuState>(null);
  const [activeDragProjectId, setActiveDragProjectId] = useState<number | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { currentSong } = usePlayer();
  const { projects, setProjects } = useProjectsContext();
  const { sidebarProjectSortMode, setSidebarProjectSortMode } = useUserPreferences();

  const playerVisible = !!currentSong;
  const sidebarCollapsed = collapsed || forceCollapsed;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const displayedProjects = useMemo(() => {
    const projectMap = new Map(projects.map((project) => [project.id, project]));

    if (sidebarProjectSortMode === "custom") {
      if (projectOrder.length > 0) {
        const orderedProjects = projectOrder
          .map((projectId) => projectMap.get(projectId))
          .filter((project): project is Project => Boolean(project));
        const missingProjects = projects.filter((project) => !projectOrder.includes(project.id));
        return [...orderedProjects, ...sortProjectsByPosition(missingProjects)];
      }
      return sortProjectsByPosition(projects);
    }

    return sortProjectsByName(projects);
  }, [projectOrder, projects, sidebarProjectSortMode]);

  useEffect(() => { requestAnimationFrame(() => { setReady(true); }); }, []);

  useEffect(() => {
    setProjectOrder((current) => {
      const projectIds = projects.map((project) => project.id);
      const projectIdSet = new Set(projectIds);
      const nextOrder = current.filter((projectId) => projectIdSet.has(projectId));
      for (const projectId of projectIds) {
        if (!nextOrder.includes(projectId)) nextOrder.push(projectId);
      }
      if (nextOrder.length === current.length && nextOrder.every((projectId, index) => projectId === current[index])) return current;
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

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  function updateProjectOrder(nextProjects: Project[]) {
    setProjectOrder(nextProjects.map((project) => project.id));
    setSidebarProjectSortMode("custom");
  }

  function saveProjectOrder(nextProjects: Project[]) {
    updateProjectOrder(nextProjects);
    void Promise.all(
      nextProjects.map((project, index) =>
        fetch(`/api/projects/${project.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: index }),
        }).catch(() => null),
      ),
    );
  }

  function startReorderMode() {
    setProjectMenu(null);
    setReorderMode(true);
    setSidebarProjectSortMode("custom");
    setProjectOrder(displayedProjects.map((project) => project.id));
  }

  function finishReorderMode() {
    saveProjectOrder(displayedProjects);
    setReorderMode(false);
    setActiveDragProjectId(null);
    showToast("Project order saved");
  }

  function restoreAlphabeticalOrder() {
    const alphabeticalProjects = sortProjectsByName(projects);
    setReorderMode(false);
    setActiveDragProjectId(null);
    setSidebarProjectSortMode("alphabetical");
    setProjectOrder(alphabeticalProjects.map((project) => project.id));
    showToast("Projects sorted alphabetically");
  }

  function handleProjectDragStart(event: DragStartEvent) {
    setActiveDragProjectId(Number(event.active.id));
  }

  function handleProjectDragEnd(event: DragEndEvent) {
    setActiveDragProjectId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = displayedProjects.findIndex((project) => project.id === active.id);
    const newIndex = displayedProjects.findIndex((project) => project.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    updateProjectOrder(arrayMove(displayedProjects, oldIndex, newIndex));
  }

  function handleProjectDragCancel() { setActiveDragProjectId(null); }

  function openProjectMenu(project: Project, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const menuWidth = 190;
    const left = Math.min(rect.right + 12, window.innerWidth - menuWidth - 12);
    const top = Math.min(rect.top - 4, window.innerHeight - 150);
    setTooltip(null);
    setProjectMenu({ project, left, top });
  }

  function openEditProject(project: Project) {
    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description ?? "");
  }

  async function handleSaveProject() {
    if (!editingProject || isSavingProject) return;
    const cleanName = editName.trim();
    if (!cleanName) { showToast("Project name required"); return; }
    setIsSavingProject(true);
    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, description: editDescription.trim() || null }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) { showToast("Couldn't save project"); return; }
      setProjects((current) =>
        current.map((project) =>
          project.id === editingProject.id
            ? data || { ...project, name: cleanName, description: editDescription.trim() || null }
            : project,
        ),
      );
      setEditingProject(null);
      showToast("Project saved");
    } catch {
      showToast("Couldn't save project");
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleDeleteProject(project: Project) {
    if (deletingProjectId) return;
    const confirmed = window.confirm(`Are you sure you want to delete "${project.name}"? This cannot be undone.`);
    if (!confirmed) { showToast("Delete cancelled"); return; }
    setDeletingProjectId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) { showToast("Couldn't delete project"); return; }
      setProjects((current) => current.filter((currentProject) => currentProject.id !== project.id));
      setProjectOrder((current) => current.filter((projectId) => projectId !== project.id));
      if (pathname === `/projects/${project.id}`) router.push("/music");
      showToast("Project deleted");
    } catch {
      showToast("Couldn't delete project");
    } finally {
      setDeletingProjectId(null);
    }
  }

  const alphabeticalAction = !sidebarCollapsed && reorderMode ? (
    <button
      type="button"
      onClick={restoreAlphabeticalOrder}
      className="h-6 cursor-pointer rounded-md px-2 text-[10px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
    >
      Alphabetical
    </button>
  ) : null;

  return (
    <>
      <SidebarShell
        collapsed={sidebarCollapsed}
        className={ready ? "desktop-app-shell is-ready" : "desktop-app-shell"}
        tooltip={tooltip}
        sidebarStyle={{ bottom: playerVisible ? "64px" : "0px" }}
      >
        <SidebarCollapseControl
          collapsed={sidebarCollapsed}
          icon={<CollapseIcon collapsed={sidebarCollapsed} />}
          onToggle={() => { setCollapsed((value) => !value); setTooltip(null); setProjectMenu(null); }}
        />

        <SidebarInner>
          <SidebarSection>
            <SidebarSectionHeading label="Library" collapsed={sidebarCollapsed} icon={<LibraryIcon />} />
            <SidebarNav label="Library navigation">
              {mainLinks.map((link) => (
                <SidebarLinkRow
                  key={link.href}
                  label={link.label}
                  icon={<MainIcon icon={link.icon} />}
                  collapsed={sidebarCollapsed}
                  active={isHrefActive(pathname, link.href)}
                  onTooltipChange={setTooltip}
                  onClick={() => router.push(link.href)}
                />
              ))}
            </SidebarNav>
          </SidebarSection>

          <SidebarSection>
            <SidebarSectionHeading label="AI Tools" collapsed={sidebarCollapsed} icon={<AiIcon />} />
            <SidebarNav label="AI tools navigation">
              {aiLinks.map((link) => (
                <SidebarLinkRow
                  key={link.href}
                  label={link.label}
                  icon={<MainIcon icon={link.icon} />}
                  collapsed={sidebarCollapsed}
                  active={isHrefActive(pathname, link.href)}
                  onTooltipChange={setTooltip}
                  onClick={() => router.push(link.href)}
                />
              ))}
            </SidebarNav>
          </SidebarSection>

          <SidebarSection projects>
            <SidebarProjectsHeader
              label="Projects"
              collapsed={sidebarCollapsed}
              actionLabel={reorderMode ? "Save Order" : "New Project"}
              actionIcon={reorderMode ? <CheckIcon /> : <PlusIcon />}
              beforeAction={alphabeticalAction}
              onActionClick={() => {
                if (reorderMode) { finishReorderMode(); return; }
                setProjectMenu(null);
                setIsCreateProjectOpen(true);
              }}
              onTooltipChange={setTooltip}
            />

            {reorderMode && !sidebarCollapsed ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleProjectDragStart}
                onDragEnd={handleProjectDragEnd}
                onDragCancel={handleProjectDragCancel}
              >
                <SortableContext items={displayedProjects.map((project) => project.id)} strategy={verticalListSortingStrategy}>
                  <SidebarNav label="Projects navigation">
                    {displayedProjects.map((project) => (
                      <SortableProjectLink key={project.id} project={project} dragActive={activeDragProjectId !== null} />
                    ))}
                  </SidebarNav>
                </SortableContext>
              </DndContext>
            ) : (
              <SidebarNav label="Projects navigation">
                {displayedProjects.map((project) => (
                  <ProjectLink
                    key={project.id}
                    project={project}
                    collapsed={sidebarCollapsed}
                    menuOpen={projectMenu?.project.id === project.id}
                    onOpenMenu={openProjectMenu}
                    onTooltipChange={setTooltip}
                  />
                ))}
              </SidebarNav>
            )}
          </SidebarSection>
        </SidebarInner>
      </SidebarShell>

      <ProjectMenu menu={projectMenu} onClose={() => setProjectMenu(null)} onEdit={openEditProject} onStartReorder={startReorderMode} onDelete={handleDeleteProject} />

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={(project) => {
          setProjects((current) => {
            const nextProjects = [...current, project];
            return sidebarProjectSortMode === "custom" ? sortProjectsByPosition(nextProjects) : sortProjectsByName(nextProjects);
          });
          setProjectOrder((current) => {
            if (sidebarProjectSortMode === "custom") return [...current, project.id];
            return sortProjectsByName([...projects, project]).map((item) => item.id);
          });
          setIsCreateProjectOpen(false);
          showToast("Project created");
        }}
      />

      <Toast message={toastMessage} bottomOffset={playerVisible ? "88px" : "24px"} />

      <EditProjectModal
        isOpen={!!editingProject}
        project={editingProject}
        name={editName}
        description={editDescription}
        isSaving={isSavingProject}
        onNameChange={setEditName}
        onDescriptionChange={setEditDescription}
        onSave={handleSaveProject}
        onDelete={() => { if (!editingProject) return; handleDeleteProject(editingProject); setEditingProject(null); }}
        onClose={() => setEditingProject(null)}
      />
    </>
  );
}
