import { Fragment } from 'react'
import type { ExamFuriganaMap } from '@/types/exams'

interface ExamTextProps {
  text: string
  furiganaMap?: ExamFuriganaMap | null
  showFurigana?: boolean
  /** Suppresses furigana inside `<u>...</u>` spans so kanji reading/writing items don't spoil answers. */
  hideUnderlineFurigana?: boolean
  className?: string
}

const TOKEN_RE = /(<u>[\s\S]*?<\/u>|＿★＿|★|\[[0-9０-９]{1,2}\])/g

/**
 * Parses `<u>...</u>` markers into underline spans over the plain-text string,
 * preserving full-sentence context for furigana lookups.
 */
function extractUnderlineRanges(raw: string): {
  plain: string
  ranges: Array<[number, number]>
} {
  let plain = ''
  const ranges: Array<[number, number]> = []
  let i = 0
  let ulStart: number | null = null

  while (i < raw.length) {
    if (raw.startsWith('<u>', i)) {
      ulStart = plain.length
      i += 3
    } else if (raw.startsWith('</u>', i)) {
      if (ulStart !== null && plain.length > ulStart) {
        ranges.push([ulStart, plain.length])
      }
      ulStart = null
      i += 4
    } else {
      plain += raw[i]
      i++
    }
  }
  if (ulStart !== null && plain.length > ulStart) {
    ranges.push([ulStart, plain.length])
  }
  return { plain, ranges }
}

function renderMarkerText(text: string): React.ReactNode {
  const parts = text.split(TOKEN_RE)
  return parts.map((part, idx) => {
    if (!part) return null
    if (part === '★' || part === '＿★＿') {
      return (
        <span
          key={idx}
          className="inline-flex items-center justify-center min-w-7 px-1.5 mx-1 rounded-md border border-accent bg-accent/10 text-accent font-bold text-[0.9em] align-baseline"
        >
          ★
        </span>
      )
    }
    if (/^\[[0-9０-９]{1,2}\]$/.test(part)) {
      const num = part.slice(1, -1)
      return (
        <span
          key={idx}
          className="inline-flex items-center justify-center min-w-8 px-1.5 mx-1 rounded-md border border-structural bg-surface font-mono text-[0.85em] font-semibold align-baseline"
        >
          {num}
        </span>
      )
    }
    return <Fragment key={idx}>{part}</Fragment>
  })
}

export function ExamText({
  text,
  furiganaMap,
  showFurigana = false,
  hideUnderlineFurigana = false,
  className = '',
}: ExamTextProps) {
  if (!text) return null
  const { plain, ranges } = extractUnderlineRanges(text)
  const segments = showFurigana && furiganaMap ? furiganaMap[plain] : undefined

  if (!segments) {
    // Fallback without ruby map: split cleanly on <u>...</u>, ★, and [num]
    const parts = text.split(TOKEN_RE)
    return (
      <span className={className}>
        {parts.map((part, idx) => {
          if (!part) return null
          if (part.startsWith('<u>') && part.endsWith('</u>')) {
            return (
              <span
                key={idx}
                className="underline decoration-2 decoration-accent underline-offset-[5px] font-semibold px-0.5"
              >
                {part.slice(3, -4)}
              </span>
            )
          }
          return <Fragment key={idx}>{renderMarkerText(part)}</Fragment>
        })}
      </span>
    )
  }

  // Render segment-by-segment using exact character offsets against `ranges`
  const nodes: React.ReactNode[] = []
  let pos = 0

  const isInsideUnderline = (start: number, end: number) =>
    ranges.some(([rs, re]) => start < re && end > rs)

  segments.forEach((seg, idx) => {
    if (Array.isArray(seg)) {
      const [kanji, kana] = seg
      const start = pos
      const end = pos + kanji.length
      pos = end
      const underlined = isInsideUnderline(start, end)
      const hideRuby = underlined && hideUnderlineFurigana
      const content = hideRuby ? (
        kanji
      ) : (
        <ruby>
          {kanji}
          <rt>{kana}</rt>
        </ruby>
      )
      nodes.push(
        underlined ? (
          <span
            key={idx}
            className="underline decoration-2 decoration-accent underline-offset-[5px] font-semibold px-0.5"
          >
            {content}
          </span>
        ) : (
          <Fragment key={idx}>{content}</Fragment>
        )
      )
      return
    }

    // String segment: split cleanly at any underline boundaries inside [pos, pos + seg.length)
    const segStart = pos
    const segEnd = pos + seg.length
    pos = segEnd
    const cutPoints = new Set<number>([segStart, segEnd])
    for (const [rs, re] of ranges) {
      if (rs > segStart && rs < segEnd) cutPoints.add(rs)
      if (re > segStart && re < segEnd) cutPoints.add(re)
    }
    const sorted = [...cutPoints].sort((a, b) => a - b)
    for (let k = 0; k < sorted.length - 1; k++) {
      const a = sorted[k]
      const b = sorted[k + 1]
      const slice = seg.slice(a - segStart, b - segStart)
      if (!slice) continue
      const underlined = isInsideUnderline(a, b)
      nodes.push(
        underlined ? (
          <span
            key={`${idx}-${k}`}
            className="underline decoration-2 decoration-accent underline-offset-[5px] font-semibold px-0.5"
          >
            {renderMarkerText(slice)}
          </span>
        ) : (
          <Fragment key={`${idx}-${k}`}>{renderMarkerText(slice)}</Fragment>
        )
      )
    }
  })

  return <span className={className}>{nodes}</span>
}
