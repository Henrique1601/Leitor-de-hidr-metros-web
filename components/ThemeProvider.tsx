'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  type ThemeSettings,
  loadThemeSettings,
  saveThemeSettings,
  isNightTime,
  applyAccentColor,
  getDefaultSettings,
  getSunTimesAsync,
} from '../lib/themeSettings'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: Theme
  settings: ThemeSettings
  toggle: () => void
  updateSettings: (patch: Partial<ThemeSettings>) => void
  updateSchedule: (patch: Partial<ThemeSettings['schedule']>) => void
  updateAccent: (patch: Partial<ThemeSettings['accent']>) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  resolvedTheme: 'dark',
  settings: getDefaultSettings(),
  toggle: () => {},
  updateSettings: () => {},
  updateSchedule: () => {},
  updateAccent: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getInitialSettings(): ThemeSettings {
  if (typeof window === 'undefined') return getDefaultSettings()
  const saved = loadThemeSettings()

  const legacy = localStorage.getItem('hidrometro-theme')
  if (legacy === 'light' || legacy === 'dark') {
    saved.theme = legacy
    localStorage.removeItem('hidrometro-theme')
  } else if (!localStorage.getItem('hidrometro-theme-settings')) {
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      saved.theme = 'light'
    }
  }

  return saved
}

function computeResolvedTheme(settings: ThemeSettings): Theme {
  if (settings.schedule.enabled) {
    return isNightTime(settings.schedule) ? 'dark' : 'light'
  }
  return settings.theme
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(getInitialSettings)
  const resolvedTheme = computeResolvedTheme(settings)
  const scheduleRef = useRef(settings.schedule)

  useEffect(() => {
    scheduleRef.current = settings.schedule
  }, [settings.schedule])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    saveThemeSettings(settings)
  }, [settings])

  useEffect(() => {
    applyAccentColor(settings.accent.custom || settings.accent.color)
  }, [settings.accent])

  useEffect(() => {
    if (settings.schedule.enabled && settings.schedule.mode === 'geolocation') {
      getSunTimesAsync()
    }
  }, [settings.schedule.enabled, settings.schedule.mode])

  useEffect(() => {
    if (!settings.schedule.enabled) return

    const interval = setInterval(() => {
      const current = computeResolvedTheme({ ...settings, schedule: scheduleRef.current })
      document.documentElement.setAttribute('data-theme', current)
    }, 60_000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.schedule.enabled])

  const toggle = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
      schedule: { ...prev.schedule, enabled: false },
    }))
  }, [])

  const updateSettings = useCallback((patch: Partial<ThemeSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const updateSchedule = useCallback((patch: Partial<ThemeSettings['schedule']>) => {
    setSettings((prev) => ({
      ...prev,
      schedule: { ...prev.schedule, ...patch },
    }))
  }, [])

  const updateAccent = useCallback((patch: Partial<ThemeSettings['accent']>) => {
    setSettings((prev) => ({
      ...prev,
      accent: { ...prev.accent, ...patch },
    }))
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        theme: settings.theme,
        resolvedTheme,
        settings,
        toggle,
        updateSettings,
        updateSchedule,
        updateAccent,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
