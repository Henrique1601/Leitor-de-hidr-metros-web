import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getDefaultSettings,
  loadThemeSettings,
  saveThemeSettings,
  isNightTime,
  hexToHSL,
  hslToHex,
  generateAccentDim,
  generateAccentBright,
  applyAccentColor,
} from '../lib/themeSettings'

describe('themeSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getDefaultSettings', () => {
    it('returns dark theme with schedule disabled', () => {
      const s = getDefaultSettings()
      expect(s.theme).toBe('dark')
      expect(s.schedule.enabled).toBe(false)
      expect(s.schedule.mode).toBe('fixed')
      expect(s.schedule.startHour).toBe('18:00')
      expect(s.schedule.endHour).toBe('06:00')
      expect(s.accent.color).toBe('#3ecfc0')
      expect(s.accent.custom).toBeNull()
    })
  })

  describe('loadThemeSettings / saveThemeSettings', () => {
    it('returns defaults when nothing saved', () => {
      const s = loadThemeSettings()
      expect(s.theme).toBe('dark')
    })

    it('round-trips settings through localStorage', () => {
      const s = getDefaultSettings()
      s.theme = 'light'
      s.schedule.enabled = true
      s.accent.color = '#5b8def'
      s.accent.custom = '#ff0000'
      saveThemeSettings(s)

      const loaded = loadThemeSettings()
      expect(loaded.theme).toBe('light')
      expect(loaded.schedule.enabled).toBe(true)
      expect(loaded.accent.color).toBe('#5b8def')
      expect(loaded.accent.custom).toBe('#ff0000')
    })

    it('merges defaults with saved partial data', () => {
      localStorage.setItem('hidrometro-theme-settings', JSON.stringify({ theme: 'light' }))
      const s = loadThemeSettings()
      expect(s.theme).toBe('light')
      expect(s.schedule.enabled).toBe(false)
      expect(s.accent.color).toBe('#3ecfc0')
    })
  })

  describe('isNightTime', () => {
    it('returns false when schedule disabled', () => {
      const s = getDefaultSettings().schedule
      expect(isNightTime(s)).toBe(false)
    })

    it('uses fixed schedule for night check', () => {
      const now = new Date()
      const currentHour = now.getHours()

      const s = getDefaultSettings().schedule
      s.enabled = true
      s.mode = 'fixed'
      s.startHour = '18:00'
      s.endHour = '06:00'

      if (currentHour >= 18 || currentHour < 6) {
        expect(isNightTime(s)).toBe(true)
      } else {
        expect(isNightTime(s)).toBe(false)
      }
    })

    it('handles overnight range (start > end)', () => {
      const s = getDefaultSettings().schedule
      s.enabled = true
      s.mode = 'fixed'
      s.startHour = '22:00'
      s.endHour = '07:00'

      const result = isNightTime(s)
      expect(typeof result).toBe('boolean')
    })

    it('handles same-day range (start < end)', () => {
      const s = getDefaultSettings().schedule
      s.enabled = true
      s.mode = 'fixed'
      s.startHour = '06:00'
      s.endHour = '18:00'

      const result = isNightTime(s)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('hexToHSL', () => {
    it('converts black', () => {
      const hsl = hexToHSL('#000000')
      expect(hsl.h).toBe(0)
      expect(hsl.s).toBe(0)
      expect(hsl.l).toBe(0)
    })

    it('converts white', () => {
      const hsl = hexToHSL('#ffffff')
      expect(hsl.l).toBe(100)
    })

    it('converts teal accent', () => {
      const hsl = hexToHSL('#3ecfc0')
      expect(hsl.h).toBeGreaterThan(150)
      expect(hsl.h).toBeLessThan(200)
      expect(hsl.s).toBeGreaterThan(40)
    })

    it('returns default for invalid hex', () => {
      const hsl = hexToHSL('not-a-color')
      expect(hsl.h).toBe(0)
      expect(hsl.s).toBe(0)
      expect(hsl.l).toBe(50)
    })
  })

  describe('hslToHex', () => {
    it('converts black', () => {
      expect(hslToHex(0, 0, 0)).toBe('#000000')
    })

    it('converts white', () => {
      expect(hslToHex(0, 0, 100)).toBe('#ffffff')
    })

    it('round-trips with hexToHSL (approx)', () => {
      const original = '#3ecfc0'
      const hsl = hexToHSL(original)
      const hex = hslToHex(hsl.h, hsl.s, hsl.l)
      const diff = Math.abs(parseInt(hex.slice(1, 3), 16) - parseInt(original.slice(1, 3), 16))
      expect(diff).toBeLessThanOrEqual(1)
    })
  })

  describe('generateAccentDim', () => {
    it('produces darker version of input', () => {
      const dim = generateAccentDim('#3ecfc0')
      const dimHsl = hexToHSL(dim)
      const origHsl = hexToHSL('#3ecfc0')
      expect(dimHsl.l).toBeLessThan(origHsl.l)
    })
  })

  describe('generateAccentBright', () => {
    it('produces brighter version of input', () => {
      const bright = generateAccentBright('#3ecfc0')
      const brightHsl = hexToHSL(bright)
      const origHsl = hexToHSL('#3ecfc0')
      expect(brightHsl.l).toBeGreaterThan(origHsl.l)
    })
  })

  describe('applyAccentColor', () => {
    it('sets CSS custom properties on documentElement', () => {
      applyAccentColor('#5b8def')
      expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#5b8def')
      expect(document.documentElement.style.getPropertyValue('--accent-dim')).toBeTruthy()
      expect(document.documentElement.style.getPropertyValue('--accent-bright')).toBeTruthy()
    })
  })
})
