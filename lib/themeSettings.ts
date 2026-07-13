export interface ScheduleConfig {
  enabled: boolean
  mode: 'fixed' | 'geolocation'
  startHour: string
  endHour: string
}

export interface AccentConfig {
  color: string
  custom: string | null
}

export interface ThemeSettings {
  theme: 'dark' | 'light'
  schedule: ScheduleConfig
  accent: AccentConfig
}

export const ACCENT_PALETTE = [
  '#3ecfc0',
  '#5b8def',
  '#9b6dff',
  '#e8a33d',
  '#3ecf6a',
  '#ef5b5b',
  '#dfcf3e',
] as const

const STORAGE_KEY = 'hidrometro-theme-settings'

const DEFAULTS: ThemeSettings = {
  theme: 'dark',
  schedule: {
    enabled: false,
    mode: 'fixed',
    startHour: '18:00',
    endHour: '06:00',
  },
  accent: {
    color: '#3ecfc0',
    custom: null,
  },
}

export function getDefaultSettings(): ThemeSettings {
  return JSON.parse(JSON.stringify(DEFAULTS))
}

export function loadThemeSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultSettings()
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULTS,
      ...parsed,
      schedule: { ...DEFAULTS.schedule, ...parsed.schedule },
      accent: { ...DEFAULTS.accent, ...parsed.accent },
    }
  } catch {
    return getDefaultSettings()
  }
}

export function saveThemeSettings(settings: ThemeSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(':').map(Number)
  return { hours: h, minutes: m || 0 }
}

function timeToMinutes(time: string): number {
  const { hours, minutes } = parseTime(time)
  return hours * 60 + minutes
}

export function isNightTime(settings: ScheduleConfig): boolean {
  if (!settings.enabled) return false

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  if (settings.mode === 'geolocation') {
    const sunTimes = getSunTimesFromCache()
    if (!sunTimes) {
      return currentMinutes >= timeToMinutes(settings.startHour) || currentMinutes < timeToMinutes(settings.endHour)
    }
    return currentMinutes >= sunTimes.sunset || currentMinutes < sunTimes.sunrise
  }

  const start = timeToMinutes(settings.startHour)
  const end = timeToMinutes(settings.endHour)

  if (start > end) {
    return currentMinutes >= start || currentMinutes < end
  }
  return currentMinutes >= start && currentMinutes < end
}

let cachedSunTimes: { date: string; sunrise: number; sunset: number } | null = null

function getSunTimesFromCache(): { sunrise: number; sunset: number } | null {
  if (!cachedSunTimes) return null
  return { sunrise: cachedSunTimes.sunrise, sunset: cachedSunTimes.sunset }
}

function calculateSunTimes(latitude: number, dayOfYear: number): { sunrise: number; sunset: number } {
  const declination = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365) * (Math.PI / 180)
  const latitudeRad = latitude * (Math.PI / 180)

  const cosHourAngle = -Math.tan(latitudeRad) * Math.tan(declination)
  const hourAngle = Math.acos(Math.max(-1, Math.min(1, cosHourAngle))) * (180 / Math.PI)

  const solarNoon = 12
  const sunriseHours = solarNoon - hourAngle / 15
  const sunsetHours = solarNoon + hourAngle / 15

  const sunrise = Math.floor(sunriseHours) * 60 + Math.round((sunriseHours % 1) * 60)
  const sunset = Math.floor(sunsetHours) * 60 + Math.round((sunsetHours % 1) * 60)

  return { sunrise, sunset }
}

export async function getSunTimesAsync(): Promise<{ sunrise: number; sunset: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude } = pos.coords
        const now = new Date()
        const startOfYear = new Date(now.getFullYear(), 0, 0)
        const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000)
        const times = calculateSunTimes(latitude, dayOfYear)

        cachedSunTimes = { date: now.toDateString(), ...times }
        resolve(times)
      },
      () => resolve(null),
      { timeout: 5000 }
    )
  })
}

export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 0, s: 0, l: 50 }

  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function generateAccentDim(hex: string): string {
  const { h, s, l } = hexToHSL(hex)
  return hslToHex(h, Math.min(s + 10, 100), Math.max(l - 15, 10))
}

export function generateAccentBright(hex: string): string {
  const { h, s, l } = hexToHSL(hex)
  return hslToHex(h, Math.min(s + 5, 100), Math.min(l + 30, 95))
}

export function applyAccentColor(hex: string): void {
  const root = document.documentElement
  root.style.setProperty('--accent', hex)
  root.style.setProperty('--accent-dim', generateAccentDim(hex))
  root.style.setProperty('--accent-bright', generateAccentBright(hex))
}
