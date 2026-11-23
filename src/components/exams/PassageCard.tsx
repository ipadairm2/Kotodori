import { useState } from 'react'
import type { ExamFuriganaMap, ExamPassage } from '@/types/exams'
import { useTranslation } from '@/lib/useTranslation'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { ExamText } from './ExamText'

interface PassageCardProps {
  passage: ExamPassage
  furiganaMap?: ExamFuriganaMap | null
  showFurigana: boolean
  activeEvidenceQuotes?: string[]
  showTranslationByDefault?: boolean
}

export function PassageCard({
  passage,
  furiganaMap,
  showFurigana,
  activeEvidenceQuotes = [],
  showTranslationByDefault = false,
}: PassageCardProps) {
  const { localize } = useTranslation()
  const l = (en: string, vi: string) => localize({ en, vi })
  const [showTrans, setShowTrans] = useState(showTranslationByDefault)

  const stripHtml = (s: string) => s.replace(/<\/?u>/g, '')
  const speakableBody = passage.paragraphs.map(stripHtml).join(' ')
  const norm = (s: string) => s.replace(/<\/?u>/g, '').replace(/\s+/g, '')
  const normQuotes = activeEvidenceQuotes.map(norm).filter(Boolean)
  const matchesEvidence = (text: string) => {
    if (normQuotes.length === 0) return false
    const hay = norm(text)
    return normQuotes.some(q => hay.includes(q))
  }

  return (
    <article className="glass-card p-5 sm:p-6 mb-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-structural">
        <div className="min-w-0">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent font-semibold">
            {l('Reading Passage', 'Đoạn văn')}
          </span>
          {passage.title && (
            <h3 className="jp text-lg sm:text-xl font-bold mt-0.5 break-words">
              <ExamText text={passage.title} furiganaMap={furiganaMap} showFurigana={showFurigana} />
            </h3>
          )}
          {passage.author && (
            <p className="jp text-xs text-muted mt-0.5">{passage.author}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SpeakButton text={speakableBody} size="sm" />
          <button
            type="button"
            onClick={() => setShowTrans(v => !v)}
            aria-expanded={showTrans}
            className="min-h-11 px-3 rounded-lg border border-structural text-xs font-semibold hover:bg-surface cursor-pointer transition-colors"
          >
            {showTrans ? l('Hide translation', 'Ẩn bản dịch') : l('Passage translation', 'Dịch đoạn văn')}
          </button>
        </div>
      </div>

      {passage.intro && (
        <p className="jp text-sm text-muted mb-3 leading-relaxed">
          <ExamText text={passage.intro} furiganaMap={furiganaMap} showFurigana={showFurigana} />
        </p>
      )}

      <div className="space-y-3">
        {passage.paragraphs.map((para, idx) => {
          const isHit = matchesEvidence(para)
          return (
            <p
              key={idx}
              lang="ja"
              className={[
                'jp text-[16px] sm:text-[17px] leading-[2.15] break-words rounded-lg px-2 py-1 transition-colors',
                isHit ? 'bg-green/10 border-l-3 border-green' : '',
              ].join(' ')}
            >
              <ExamText text={para} furiganaMap={furiganaMap} showFurigana={showFurigana} />
            </p>
          )
        })}
      </div>

      {passage.tables && passage.tables.length > 0 && (
        <div className="mt-5 space-y-5">
          {passage.tables.map((tbl, ti) => (
            <div key={ti} className="overflow-x-auto rounded-xl border border-structural bg-card/60">
              {tbl.caption && (
                <div className="jp px-4 py-2 text-xs font-bold text-muted border-b border-structural bg-surface/60">
                  <ExamText text={tbl.caption} furiganaMap={furiganaMap} showFurigana={showFurigana} />
                </div>
              )}
              <table className="w-full text-left border-collapse text-sm">
                {tbl.headers.length > 0 && (
                  <thead>
                    <tr className="bg-surface/80 border-b border-structural">
                      {tbl.headers.map((h, hi) => (
                        <th key={hi} className="jp px-3 py-2.5 font-semibold text-xs text-muted whitespace-nowrap">
                          <ExamText text={h} furiganaMap={furiganaMap} showFurigana={showFurigana} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-structural">
                  {tbl.rows.map((row, ri) => {
                    const rowHit = matchesEvidence(row.join(''))
                    return (
                      <tr key={ri} className={rowHit ? 'bg-green/15 ring-1 ring-inset ring-green/40' : ''}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="jp px-3 py-2.5 align-top leading-relaxed whitespace-pre-line">
                            <ExamText text={cell} furiganaMap={furiganaMap} showFurigana={showFurigana} />
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {activeEvidenceQuotes.length > 0 && (
        <div className="mt-4 rounded-xl border border-green/40 bg-green/10 px-4 py-3 text-sm space-y-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] font-semibold text-green block">
            {l('Answer evidence in passage', 'Dẫn chứng trong bài')}
          </span>
          {activeEvidenceQuotes.map((q, qi) => (
            <p key={qi} className="jp font-medium leading-relaxed">「{q}」</p>
          ))}
        </div>
      )}

      {showTrans && (
        <div className="mt-4 pt-4 border-t border-structural text-sm leading-relaxed text-muted">
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink/70 mb-1.5">
            {l('Full passage translation', 'Bản dịch toàn bài')}
          </p>
          <p className="whitespace-pre-line">{localize(passage.translation)}</p>
        </div>
      )}
    </article>
  )
}
