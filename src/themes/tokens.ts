export type TemplateId = 'ledger' | 'metro'
export type Mode = 'light' | 'dark'

export const COLOR_KEYS = [
  'bg', 'surface', 'tint', 'rule',
  'ink', 'ink-2', 'ink-3',
  'rail', 'rail-ink', 'rail-muted',
  'accent', 'accent-ink', 'signature',
  'due', 'danger', 'success', 'focus',
  'src-winget', 'src-chocolatey', 'src-msstore', 'src-scoop'
] as const

export type ColorKey = typeof COLOR_KEYS[number]
export type Palette = Record<ColorKey, string>

export type Density = 'compact' | 'regular' | 'comfortable'
export type FontPreset = 'segoe' | 'bahnschrift' | 'system'

export interface Scalars {
  radius: number
  fontSize: number
  density: Density
  font: FontPreset
}

export interface ThemeDefinition {
  id: string
  name: string
  template: TemplateId
  light: Palette
  dark: Palette
  scalars: Scalars
}

export const FONT_STACKS: Record<FontPreset, { body: string, display: string }> = {
  segoe: {
    body: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
    display: '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif'
  },
  bahnschrift: {
    body: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
    display: 'Bahnschrift, "DIN Alternate", "Segoe UI", system-ui, sans-serif'
  },
  system: {
    body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    display: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  }
}

export const ROW_HEIGHTS: Record<Density, string> = { compact: '2.25rem', regular: '2.75rem', comfortable: '3.375rem' }

export const BUILTIN_THEMES: ThemeDefinition[] = [
  {
    id: 'ledger',
    name: 'Bakım Defteri',
    template: 'ledger',
    light: {
      bg: '#F5F7F6', surface: '#FFFFFF', tint: '#E3EEEC', rule: '#D3DFDD',
      ink: '#17212B', 'ink-2': '#45535D', 'ink-3': '#5B6870',
      rail: '#123C3F', 'rail-ink': '#FFFFFF', 'rail-muted': '#CFE2DF',
      accent: '#123C3F', 'accent-ink': '#FFFFFF', signature: '#4A3AA6',
      due: '#8A5508', danger: '#B42318', success: '#2F6B3A', focus: '#4A3AA6',
      'src-winget': '#2160A8', 'src-chocolatey': '#8C4A1E', 'src-msstore': '#3C7A2E', 'src-scoop': '#127A7A'
    },
    dark: {
      bg: '#0E1A1C', surface: '#132326', tint: '#1A2F32', rule: '#26403F',
      ink: '#E6EEED', 'ink-2': '#B2C4C2', 'ink-3': '#93A7A5',
      rail: '#0A2326', 'rail-ink': '#FFFFFF', 'rail-muted': '#B7CFCC',
      accent: '#5FB3AA', 'accent-ink': '#06201F', signature: '#B3A6F7',
      due: '#E5AE52', danger: '#F28B7D', success: '#7CC58A', focus: '#B3A6F7',
      'src-winget': '#7DB2F0', 'src-chocolatey': '#E39A68', 'src-msstore': '#8FCB7C', 'src-scoop': '#5CC8C8'
    },
    scalars: { radius: 8, fontSize: 14, density: 'regular', font: 'segoe' }
  },
  {
    id: 'metro',
    name: 'Metro Yönlendirme',
    template: 'metro',
    light: {
      bg: '#FFFFFF', surface: '#FFFFFF', tint: '#F2F3F5', rule: '#DFE2E6',
      ink: '#15171A', 'ink-2': '#464B52', 'ink-3': '#5E646C',
      rail: '#2B2E33', 'rail-ink': '#FFFFFF', 'rail-muted': '#C9CDD3',
      accent: '#15171A', 'accent-ink': '#FFFFFF', signature: '#FFCD00',
      due: '#9A5B00', danger: '#C8102E', success: '#00843D', focus: '#0067B1',
      'src-winget': '#00A651', 'src-chocolatey': '#E2231A', 'src-msstore': '#7B2D8E', 'src-scoop': '#F28C00'
    },
    dark: {
      bg: '#101215', surface: '#171A1E', tint: '#1F2328', rule: '#30353C',
      ink: '#F2F3F5', 'ink-2': '#C2C7CE', 'ink-3': '#A2A8B0',
      rail: '#1F2226', 'rail-ink': '#FFFFFF', 'rail-muted': '#B9BEC5',
      accent: '#F2F3F5', 'accent-ink': '#101215', signature: '#FFCD00',
      due: '#F2B24A', danger: '#FF6B6B', success: '#3CCB7F', focus: '#5AB0F0',
      'src-winget': '#2BC46E', 'src-chocolatey': '#FF5A4E', 'src-msstore': '#B36BC8', 'src-scoop': '#FFA733'
    },
    scalars: { radius: 4, fontSize: 14, density: 'regular', font: 'bahnschrift' }
  }
]

function hexToTriplet(hex: string): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}

export function applyTheme(theme: ThemeDefinition, mode: Mode) {
  const root = document.documentElement
  const palette = theme[mode]
  for (const key of COLOR_KEYS) root.style.setProperty(`--${key}`, hexToTriplet(palette[key]))
  const { radius, fontSize, density, font } = theme.scalars
  root.style.setProperty('--radius', `${radius}px`)
  root.style.setProperty('--font-size', `${fontSize}px`)
  root.style.setProperty('--row', ROW_HEIGHTS[density])
  root.style.setProperty('--font-body', FONT_STACKS[font].body)
  root.style.setProperty('--font-display', FONT_STACKS[font].display)
  root.classList.toggle('dark', mode === 'dark')
  root.dataset.template = theme.template
  root.style.colorScheme = mode
}

const pick = (input: any, fallback: Palette): Palette =>
  Object.fromEntries(COLOR_KEYS.map(k => [k, isHexColor(input?.[k]) ? input[k] : fallback[k]])) as Palette

export function withDefaultColors(theme: ThemeDefinition): ThemeDefinition {
  const base = BUILTIN_THEMES.find(t => t.template === theme.template) ?? BUILTIN_THEMES[0]
  return { ...theme, light: pick(theme.light, base.light), dark: pick(theme.dark, base.dark) }
}

export function parseThemeJson(text: string): ThemeDefinition {
  const data = JSON.parse(text)
  const base = BUILTIN_THEMES.find(t => t.template === data?.template)
  if (!base) throw new Error('template')
  const s = data.scalars ?? {}
  return {
    id: typeof data.id === 'string' && data.id ? data.id : `custom-${Date.now()}`,
    name: typeof data.name === 'string' && data.name ? data.name.slice(0, 60) : base.name,
    template: base.template,
    light: pick(data.light, base.light),
    dark: pick(data.dark, base.dark),
    scalars: {
      radius: Number.isFinite(s.radius) ? Math.min(20, Math.max(0, s.radius)) : base.scalars.radius,
      fontSize: Number.isFinite(s.fontSize) ? Math.min(18, Math.max(12, s.fontSize)) : base.scalars.fontSize,
      density: s.density in ROW_HEIGHTS ? s.density : base.scalars.density,
      font: s.font in FONT_STACKS ? s.font : base.scalars.font
    }
  }
}
