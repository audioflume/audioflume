'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useUserPreferences, type ThemeMode } from '@/context/UserPreferencesContext'

type Theme = ThemeMode

const OLD_THEME_STORAGE_KEY = 'filmwave-theme'
const THEME_STORAGE_KEY = 'filmwave-theme-mode'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeMode, setThemeMode, preferencesLoaded } = useUserPreferences()
  const [theme, setThemeState] = useState<Theme>('dark')

  const applyTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    window.localStorage.setItem(OLD_THEME_STORAGE_KEY, nextTheme)
    document.documentElement.classList.toggle('light', nextTheme === 'light')
  }

  useEffect(() => {
    const saved =
      window.localStorage.getItem(THEME_STORAGE_KEY) ||
      window.localStorage.getItem(OLD_THEME_STORAGE_KEY)

    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved)
    }
  }, [])

  useEffect(() => {
    if (!preferencesLoaded) return
    applyTheme(themeMode)
  }, [themeMode, preferencesLoaded])

  const setTheme = (nextTheme: Theme) => {
    applyTheme(nextTheme)
    setThemeMode(nextTheme)
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}