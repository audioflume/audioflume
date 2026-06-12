"use client";

import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  MusicFilterPanel as BaseMusicFilterPanel,
  MusicLibraryToolbar as BaseMusicLibraryToolbar,
} from "./MusicLibraryRedesign";

type MusicLibraryToolbarProps = ComponentProps<typeof BaseMusicLibraryToolbar>;
type MusicFilterPanelProps = ComponentProps<typeof BaseMusicFilterPanel>;

const ActiveFilterTagsContext = createContext<ReactNode>(null);

export function MusicLibraryToolbar({
  chips,
  children,
  ...props
}: MusicLibraryToolbarProps) {
  return (
    <ActiveFilterTagsContext.Provider value={chips ?? null}>
      <BaseMusicLibraryToolbar {...props} chips={undefined}>
        {children}
      </BaseMusicLibraryToolbar>
    </ActiveFilterTagsContext.Provider>
  );
}

export function MusicFilterPanel(props: MusicFilterPanelProps) {
  const activeFilterTags = useContext(ActiveFilterTagsContext);

  return (
    <div className={`fw-filter-panel-composite${props.open ? " is-open" : ""}`}>
      {props.open && activeFilterTags ? (
        <div className="fw-filter-panel-active-chips">
          <div className="fw-filter-panel-active-chips-label">Active filters</div>
          <div className="fw-filter-panel-active-chips-list">
            {activeFilterTags}
          </div>
        </div>
      ) : null}
      <BaseMusicFilterPanel {...props} />
    </div>
  );
}
