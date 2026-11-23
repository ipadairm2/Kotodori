import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ExamQuestionVisual } from '@/types/exams'
import { useTranslation } from '@/lib/useTranslation'
import { NerdIcon } from '@/components/ui/NerdIcon'
import { ListeningDiagram } from './ListeningDiagrams'

interface ListeningVisualProps {
  visual: ExamQuestionVisual
  selectedIndex?: number
  answerIndex?: number
  revealed?: boolean
  onSelectChoice?: (index: number) => void
}

function VisualSurface({
  visual,
  selectedIndex,
  answerIndex,
  revealed,
  onSelectChoice,
  altText,
}: {
  visual: ExamQuestionVisual
  selectedIndex?: number
  answerIndex?: number
  revealed?: boolean
  onSelectChoice?: (index: number) => void
  altText: string
}) {
  if (visual.diagramId) {
    return (
      <ListeningDiagram
        diagramId={visual.diagramId}
        selectedIndex={selectedIndex}
        answerIndex={answerIndex}
        revealed={revealed}
        onSelectIndex={onSelectChoice}
      />
    )
  }

  if (!visual.imageSrc) return null

  return (
    <div className="relative">
      <img
        src={visual.imageSrc}
        alt={altText}
        loading="lazy"
        className="w-full h-auto block select-none"
      />
      {visual.layout === 'quad' && (
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {[0, 1, 2, 3].map(idx => {
            const isSelected = selectedIndex === idx
            const isKey = answerIndex === idx
            let cellCls = 'border-transparent hover:bg-accent/5'
            let badgeCls = 'bg-white/95 text-neutral-900 border-neutral-400 shadow-xs'
            let mark = ''

            if (revealed) {
              if (isKey) {
                cellCls = 'ring-3 ring-inset ring-green/80 bg-green/10'
                badgeCls = 'bg-green text-white border-green'
                mark = ' ✓'
              } else if (isSelected) {
                cellCls = 'ring-3 ring-inset ring-red/80 bg-red/10'
                badgeCls = 'bg-red text-white border-red'
                mark = ' ✕'
              }
            } else if (isSelected) {
              cellCls = 'ring-3 ring-inset ring-accent bg-accent/10'
              badgeCls = 'bg-accent text-accent-fg border-accent'
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={onSelectChoice ? () => onSelectChoice(idx) : undefined}
                aria-label={`${idx + 1}`}
                aria-pressed={isSelected}
                className={`relative text-left p-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${cellCls}`}
              >
                <span
                  className={`inline-flex items-center justify-center min-w-7 h-7 px-1.5 rounded-lg border font-mono text-xs font-bold ${badgeCls}`}
                >
                  {idx + 1}{mark}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ListeningVisual({
  visual,
  selectedIndex,
  answerIndex,
  revealed,
  onSelectChoice,
}: ListeningVisualProps) {
  const { localize } = useTranslation()
  const l = (en: string, vi: string) => localize({ en, vi })
  const [zoomed, setZoomed] = useState(false)
  const altText = localize(visual.alt)

  useEffect(() => {
    if (!zoomed) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  const lightbox = zoomed ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={altText}
      onClick={() => setZoomed(false)}
    >
      <div
        className="w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-structural bg-card p-3 sm:p-4 shadow-2xl space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-muted uppercase tracking-[0.06em] inline-flex items-center gap-1.5">
            <NerdIcon name="cards" className="text-accent text-xs" />
            {l('Exam-sheet illustration', 'Tranh minh họa đề nghe')}
          </span>
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="min-h-9 px-3 rounded-lg border border-structural bg-surface hover:bg-card text-xs font-semibold cursor-pointer"
          >
            × {l('Close', 'Đóng')}
          </button>
        </div>
        <div className="rounded-xl border border-black/15 bg-white text-neutral-900 overflow-hidden">
          <VisualSurface
            visual={visual}
            selectedIndex={selectedIndex}
            answerIndex={answerIndex}
            revealed={revealed}
            onSelectChoice={onSelectChoice}
            altText={altText}
          />
        </div>
      </div>
    </div>
  ) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-muted inline-flex items-center gap-1.5">
          <NerdIcon name="cards" className="text-accent text-xs" />
          <span>{l('Exam-sheet illustration', 'Tranh minh họa đề nghe')}</span>
        </span>
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="min-h-8 px-2.5 rounded-lg border border-structural bg-card hover:bg-surface text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <NerdIcon name="search" className="text-xs text-accent" />
          <span>{l('Zoom', 'Phóng to')}</span>
        </button>
      </div>

      <div className="rounded-xl border border-structural bg-white text-neutral-900 shadow-sm overflow-hidden max-w-xl">
        <VisualSurface
          visual={visual}
          selectedIndex={selectedIndex}
          answerIndex={answerIndex}
          revealed={revealed}
          onSelectChoice={onSelectChoice}
          altText={altText}
        />
      </div>

      {zoomed && typeof document !== 'undefined' && createPortal(lightbox, document.body)}
    </div>
  )
}
