'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Sun, Moon, ArrowsClockwise, MapPin, Clock } from '@phosphor-icons/react'
import { useTheme } from './ThemeProvider'
import { ACCENT_PALETTE } from '../lib/themeSettings'

export default function ThemeSettingsPanel() {
  const { settings, toggle, updateSettings, updateSchedule, updateAccent } = useTheme()
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleThemeChange = useCallback(
    (theme: 'dark' | 'light') => {
      updateSettings({ theme, schedule: { ...settings.schedule, enabled: false } })
    },
    [updateSettings, settings.schedule]
  )

  const handleAutoMode = useCallback(() => {
    updateSchedule({ enabled: !settings.schedule.enabled })
  }, [updateSchedule, settings.schedule.enabled])

  const handleHexSubmit = useCallback(() => {
    const cleaned = hexInput.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      updateAccent({ color: cleaned, custom: cleaned })
    }
  }, [hexInput, updateAccent])

  const handleAccentPalette = useCallback(
    (color: string) => {
      updateAccent({ color, custom: null })
      setHexInput('')
    },
    [updateAccent]
  )

  const icon = settings.theme === 'dark'
    ? <Moon size={16} weight="fill" />
    : <Sun size={16} weight="fill" />

  return (
    <div className="theme-settings-wrapper">
      <button
        ref={buttonRef}
        className="theme-settings-toggle"
        onClick={() => {
          if (!open && settings.accent.custom) setHexInput(settings.accent.custom)
          setOpen(!open)
        }}
        aria-label="Configurações de tema"
        title="Configurações de tema"
      >
        <span className="theme-settings-icon">{icon}</span>
        <span className="theme-settings-caret">▾</span>
      </button>

      {open && (
        <div ref={panelRef} className="theme-dropdown">
          <div className="theme-dropdown-section">
            <div className="theme-pills">
              <button
                className={`theme-pill ${settings.theme === 'light' && !settings.schedule.enabled ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
                aria-label="Tema claro"
              >
                <Sun size={18} weight="fill" />
              </button>
              <button
                className={`theme-pill ${settings.theme === 'dark' && !settings.schedule.enabled ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
                aria-label="Tema escuro"
              >
                <Moon size={18} weight="fill" />
              </button>
              <button
                className={`theme-pill ${settings.schedule.enabled ? 'active' : ''}`}
                onClick={handleAutoMode}
                aria-label="Tema automático"
              >
                <ArrowsClockwise size={18} weight="fill" />
              </button>
            </div>
          </div>

          {settings.schedule.enabled && (
            <div className="theme-dropdown-section">
              <div className="theme-dropdown-label">Schedule</div>
              <div className="theme-schedule-row">
                <label className="theme-schedule-option">
                  <input
                    type="radio"
                    name="schedule-mode"
                    checked={settings.schedule.mode === 'geolocation'}
                    onChange={() => updateSchedule({ mode: 'geolocation' })}
                  />
                  <span><MapPin size={14} weight="light" /> Geolocalização</span>
                </label>
                <label className="theme-schedule-option">
                  <input
                    type="radio"
                    name="schedule-mode"
                    checked={settings.schedule.mode === 'fixed'}
                    onChange={() => updateSchedule({ mode: 'fixed' })}
                  />
                  <span><Clock size={14} weight="light" /> Fixo</span>
                </label>
              </div>
              {settings.schedule.mode === 'fixed' && (
                <div className="theme-schedule-times">
                  <label className="theme-time-field">
                    <span>Início</span>
                    <input
                      type="time"
                      value={settings.schedule.startHour}
                      onChange={(e) => updateSchedule({ startHour: e.target.value })}
                    />
                  </label>
                  <label className="theme-time-field">
                    <span>Fim</span>
                    <input
                      type="time"
                      value={settings.schedule.endHour}
                      onChange={(e) => updateSchedule({ endHour: e.target.value })}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="theme-dropdown-section">
            <div className="theme-dropdown-label">Cor de destaque</div>
            <div className="accent-palette">
              {ACCENT_PALETTE.map((color) => (
                <button
                  key={color}
                  className={`accent-dot ${settings.accent.color === color && !settings.accent.custom ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleAccentPalette(color)}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
            <div className="accent-hex-row">
              <span className="accent-hash">#</span>
              <input
                type="text"
                className="accent-hex-input"
                placeholder="ffffff"
                value={hexInput.replace('#', '')}
                onChange={(e) => setHexInput('#' + e.target.value.replace('#', ''))}
                onBlur={handleHexSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleHexSubmit()
                }}
                maxLength={7}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
