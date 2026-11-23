const GLYPHS = {
  home: "\u{f06a1}",
  book: "\u{f05da}",
  cards: "\u{f0639}",
  exam: "\uf19d",
  target: "\u{f04fe}",
  grammar: "\ueb62",
  kanji: "\u{f05ca}",
  clock: "\u{f0150}",
  headphones: "\u{f02cb}",
  notebook: "\u{ebaf}",
  calendar: "\u{f00ef}",
  flame: "\uf490",
  check: "\uf49e",
  alert: "\u{f05d6}",
  terminal: "\uf120",
  settings: "\u{f08bb}",
  search: "\u{f0349}",
  layers: "\u{ebd2}",
  sparkle: "\u{f0068}",
  audio: "\u{f057e}",
  rocket: "\uf427",
} as const

export type NerdIconName = keyof typeof GLYPHS

export function NerdIcon({ name, className = "" }: { name: NerdIconName; className?: string }) {
  return (
    <span aria-hidden="true" className={`nf-glyph ${className}`}>
      {GLYPHS[name]}
    </span>
  )
}
