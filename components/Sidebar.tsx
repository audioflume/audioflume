'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import CreateProjectModal from '@/components/CreateProjectModal'

const placeholderProjects = [
  'Anian',
  'Brass Monkey Brewing',
  'Luxewell',
  'LYF',
  'Maxwell',
  'Nootka Lodge',
  'Pacific Sunday',
  'WCCH',
]

const collectionLinks = [
  { label: 'Music Library', href: '/music' },
  { label: 'Playlists', href: '/playlists' },
  { label: 'Favorites', href: '/favorites' },
  { label: 'Sound FX', href: '/sound-fx' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const { currentSong } = usePlayer()
  const playerVisible = !!currentSong

  return (
    <>
      <aside
        className="fixed left-0 z-30 hidden w-[280px] md:flex md:flex-col bg-[var(--bg-primary)] border-r border-[var(--border)]"
        style={{ top: '56px', bottom: playerVisible ? '64px' : '0px' }}
      >
        <div className="flex flex-col overflow-y-auto px-8 pt-[45px] pb-6 flex-1">
          {/* Collections */}
          <div className="shrink-0">
            <div className="mb-4 text-sm font-medium leading-none text-[var(--text-muted)]">
              Collections
            </div>

            <div className="space-y-3">
              {collectionLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex h-4 items-center justify-between text-sm font-medium leading-none text-[var(--text-primary)] transition hover:text-[var(--text-secondary)]"
                >
                  <span>{link.label}</span>

                  {pathname === link.href && (
                    <span className="text-xl leading-none text-[var(--text-primary)]">›</span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="mt-8 flex min-h-0 flex-1 flex-col">
            <div className="mb-4 flex shrink-0 items-center justify-between">
              <div className="text-sm font-medium leading-none text-[var(--text-muted)]">
                Projects
              </div>

              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-xl leading-none text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                aria-label="Create new project"
              >
                +
              </button>
            </div>

            <div className="space-y-3 pr-2">
              {placeholderProjects.map((project) => (
                <Link
                  key={project}
                  href={`/projects/${project.toLowerCase().replaceAll(' ', '-').replaceAll('/', '-')}`}
                  className="flex items-baseline gap-2 text-sm font-medium leading-none text-[var(--text-primary)] transition hover:text-[var(--text-secondary)]"
                >
                  <svg
                    width="15"
                    height="13"
                    viewBox="0 0 17 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="relative top-[1px] shrink-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M1.5 3.5C1.5 2.94772 1.94772 2.5 2.5 2.5H6.2L7.7 4.5H14.5C15.0523 4.5 15.5 4.94772 15.5 5.5V12.5C15.5 13.0523 15.0523 13.5 14.5 13.5H2.5C1.94772 13.5 1.5 13.0523 1.5 12.5V3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>

                  <span className="truncate">{project}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </>
  )
}