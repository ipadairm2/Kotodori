import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Locale } from "@/lib/i18n"

export type Level = 'N5' | 'N4' | 'all'
export type Paper = 'washi' | 'sumi' | 'gold'
export type Density = 'compact' | 'normal' | 'sparse'
export type MonoFace = 'jetbrains' | 'geist' | 'plex'

interface SettingsStore {
  lang: Locale
  setLang: (lang: Locale) => void
  toggleLang: () => void
  level: Level
  setLevel: (level: Level) => void
  paper: Paper
  setPaper: (paper: Paper) => void
  density: Density
  setDensity: (density: Density) => void
  typeSerif: boolean
  setTypeSerif: (typeSerif: boolean) => void
  mono: MonoFace
  setMono: (mono: MonoFace) => void
  monoUi: boolean
  setMonoUi: (monoUi: boolean) => void
}

const PAPER_CLASS: Record<Paper, string> = {
  washi: '', sumi: 'theme-sumi', gold: 'theme-gold',
}
const ALL_PAPER_CLASSES = Object.values(PAPER_CLASS).filter(Boolean)

function applyPaper(paper: Paper) {
  const h = document.documentElement
  h.classList.add('theme-transition')
  h.classList.remove(...ALL_PAPER_CLASSES)
  const cls = PAPER_CLASS[paper]
  if (cls) h.classList.add(cls)
  // Browser/PWA chrome follows the in-app theme, not just the OS scheme.
  const chrome = paper === 'gold' ? '#000000' : paper === 'sumi' ? '#f6f5f3' : '#f5f5f7'
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', chrome))
  window.setTimeout(() => h.classList.remove('theme-transition'), 260)
}

function applyDensity(density: Density) {
  const h = document.documentElement
  h.classList.remove('density-compact', 'density-sparse')
  if (density !== 'normal') h.classList.add('density-' + density)
}

function applyTypeSerif(typeSerif: boolean) {
  document.documentElement.classList.toggle('type-serif', typeSerif)
}

const VALID_MONOS = new Set<MonoFace>(['jetbrains', 'geist', 'plex'])

function applyMono(mono: MonoFace) {
  const h = document.documentElement
  h.classList.toggle('mono-geist', mono === 'geist')
  h.classList.toggle('mono-plex', mono === 'plex')
}

function applyMonoUi(monoUi: boolean) {
  document.documentElement.classList.toggle('mono-ui', monoUi)
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      lang: 'vi',
      setLang: (lang) => set({ lang }),
      toggleLang: () => set({ lang: get().lang === 'vi' ? 'en' : 'vi' }),
      level: 'N5',
      setLevel: (level) => set({ level }),
      paper: 'washi',
      setPaper: (paper) => {
        applyPaper(paper)
        set({ paper })
      },
      density: 'normal',
      setDensity: (density) => {
        applyDensity(density)
        set({ density })
      },
      // Gothic is the default since the Apple-style redesign; Mincho is the
      // opt-in. A new key (not the old typeSans) so nobody's saved "off"
      // silently flips meaning.
      typeSerif: false,
      setTypeSerif: (typeSerif) => {
        applyTypeSerif(typeSerif)
        set({ typeSerif })
      },
      mono: 'jetbrains',
      setMono: (mono) => {
        applyMono(mono)
        set({ mono })
      },
      monoUi: false,
      setMonoUi: (monoUi) => {
        applyMonoUi(monoUi)
        set({ monoUi })
      },
    }),
    {
      name: 'tori-settings',
      version: 2,
      migrate: (persisted, version) => {
        const saved = (persisted ?? {}) as Record<string, unknown>
        if (version < 2) {
          // Pre-v2 default was 'geist'; upgrade existing users to 'jetbrains'
          // while preserving explicit 'plex' selections.
          const mono: MonoFace = saved.mono === 'plex' ? 'plex' : 'jetbrains'
          return { ...saved, mono, monoUi: Boolean(saved.monoUi) } as SettingsStore
        }
        return saved as unknown as SettingsStore
      },
      // Themes were trimmed to three; anyone who had picked a removed one
      // (matcha, sakura, dusk...) falls back to Washi instead of keeping a
      // paper id that no longer maps to any CSS.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsStore>
        const paper = saved.paper && saved.paper in PAPER_CLASS ? saved.paper : 'washi'
        const mono = saved.mono && VALID_MONOS.has(saved.mono) ? saved.mono : 'jetbrains'
        const monoUi = typeof saved.monoUi === 'boolean' ? saved.monoUi : current.monoUi
        return { ...current, ...saved, paper, mono, monoUi }
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        applyPaper(state.paper)
        applyDensity(state.density)
        applyTypeSerif(state.typeSerif)
        applyMono(state.mono)
        applyMonoUi(state.monoUi)
      },
    }
  )
)
