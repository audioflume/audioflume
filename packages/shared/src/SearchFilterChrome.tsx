"use client";

import { useEffect, useRef, type ChangeEvent, type CSSProperties, type ReactNode, type Ref } from "react";

type MusicLibraryFrameProps = { children: ReactNode; className?: string };

type SearchFilterChromeProps = {
  search: ReactNode;
  tags?: ReactNode;
  filters: ReactNode;
  clearAll?: ReactNode;
  quickFilters?: ReactNode;
  quickActions?: ReactNode;
  sticky