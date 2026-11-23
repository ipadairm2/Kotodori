import { useMemo, useState } from 'react'
import type { ExamAudit202607, ExamFuriganaMap, ExamSectionCode } from '@/types/exams'
import { getGrammarLinks } from '@/data/grammar-links'
import { useTranslation } from '@/lib/useTranslation'
import { useExamStore } from '@/store/exam-store'
import { GrammarHoverLink } from '@/components/ui/GrammarHoverLink'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { ExamText } from './ExamText'

const grammarById = new Map(getGrammarLinks('all').map(g => [g.id, g]))
const KANJI_CHAR_RE = /[一-鿿㐀-䶿]/

interface Audit202607ViewProps {
  audit: ExamAudit202607
  furiganaMap?: ExamFuriganaMap | null
  onSelectKanji?: (ch: string) => void
}

export function Audit202607View({
  audit,
  furiganaMap,
  onSelectKanji,
}: Audit202607ViewProps) {
  const { localize } = useTranslation()
  const l = (en: string, vi: string) => localize({ en, vi })

  const auditStatus = useExamStore(s => s.auditStatus)
  const setAuditStatus = useExamStore(s => s.setAuditStatus)
  const showFurigana = useExamStore(s => s.showFurigana)
  const setShowFurigana = useExamStore(s => s.setShowFurigana)

  const [section, setSection] = useState<ExamSectionCode>('vocab')
  const [statusFilter, setStatusFilter] = useState<'all' | 'review' | 'known' | 'unmarked'>('all')
  const [recallMode, setRecallMode] = useState(true)
  const [revealedIds, setRevealedIds] = useState<Record<string, true>>({})

  const activeSection = useMemo(
    () => audit.sections.find(s => s.code === section) ?? audit.sections[0],
    [audit.sections, section]
  )

  const summary = useMemo(() => {
    let known = 0
    let review = 0
    for (const sec of audit.sections) {
      for (const it of sec.items) {
        const st = auditStatus[it.id]
        if (st === 'known') known++
        else if (st === 'review') review++
      }
    }
    return {
      known,
      review,
      unmarked: Math.max(0, audit.totalItems - known - review),
    }
  }, [audit, auditStatus])

  const filteredItems = useMemo(() => {
    return (activeSection?.items ?? []).filter(it => {
      const st = auditStatus[it.id]
      if (statusFilter === 'known') return st === 'known'
      if (statusFilter === 'review') return st === 'review'
      if (statusFilter === 'unmarked') return !st
      return true
    })
  }, [activeSection, auditStatus, statusFilter])

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Honest Attribution & Summary Card */}
      <section className="glass-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent font-semibold">
              {l(`Latest Sitting Audit · ${audit.examDate}`, `Tổng rà soát kỳ gần nhất · ${audit.examDate}`)}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">{localize(audit.title)}</h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">{localize(audit.disclaimer)}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 shrink-0 w-full sm:w-auto">
            <div className="rounded-xl border border-structural bg-surface px-3 py-2 text-center">
              <div className="font-mono text-base font-bold text-green">{summary.known}</div>
              <div className="text-[11px] text-muted">{l('Known', 'Đã chắc')}</div>
            </div>
            <div className="rounded-xl border border-structural bg-surface px-3 py-2 text-center">
              <div className="font-mono text-base font-bold text-yellow">{summary.review}</div>
              <div className="text-[11px] text-muted">{l('Needs review', 'Cần ôn')}</div>
            </div>
            <div className="rounded-xl border border-structural bg-surface px-3 py-2 text-center">
              <div className="font-mono text-base font-bold">{summary.unmarked}</div>
              <div className="text-[11px] text-muted">{l('Unchecked', 'Chưa rà')}</div>
            </div>
          </div>
        </div>

        {/* Section Tabs + Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-structural">
          <div className="flex flex-wrap gap-2">
            {audit.sections.map(sec => (
              <button
                key={sec.code}
                type="button"
                onClick={() => setSection(sec.code)}
                aria-pressed={sec.code === section}
                className={`min-h-10 px-3.5 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer ${
                  sec.code === section
                    ? 'bg-accent text-accent-fg border-accent'
                    : 'border-structural bg-card hover:bg-surface'
                }`}
              >
                {localize(sec.title)} ({sec.items.length})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRecallMode(v => !v)}
              aria-pressed={recallMode}
              className={`min-h-10 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                recallMode ? 'bg-blue/15 border-blue text-blue' : 'border-structural bg-card hover:bg-surface'
              }`}
            >
              {recallMode
                ? l('Active Recall: Hide answers', 'Truy hồi: Đang ẩn đáp án')
                : l('Browse: All answers shown', 'Xem tự do: Đang mở đáp án')}
            </button>

            <button
              type="button"
              onClick={() => setShowFurigana(!showFurigana)}
              aria-pressed={showFurigana}
              className={`min-h-10 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                showFurigana ? 'bg-accent/15 border-accent text-accent' : 'border-structural bg-card text-muted'
              }`}
            >
              Furigana · {showFurigana ? l('On', 'Bật') : l('Off', 'Tắt')}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'all', en: 'All', vi: 'Tất cả' },
              { id: 'review', en: 'Needs review', vi: 'Cần ôn lại' },
              { id: 'known', en: 'Known', vi: 'Đã chắc' },
              { id: 'unmarked', en: 'Unchecked', vi: 'Chưa rà' },
            ] as const
          ).map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              aria-pressed={statusFilter === f.id}
              className={`min-h-9 px-3 rounded-lg border text-xs font-semibold cursor-pointer ${
                statusFilter === f.id
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-structural bg-card text-muted hover:text-ink'
              }`}
            >
              {localize({ en: f.en, vi: f.vi })}
            </button>
          ))}
        </div>
      </section>

      {/* Audit Items */}
      <div className="space-y-3">
        {filteredItems.map(item => {
          const st = auditStatus[item.id]
          const revealed = !recallMode || !!revealedIds[item.id]
          const kanjis = [...new Set([...item.targetJa].filter(ch => KANJI_CHAR_RE.test(ch)))]
          const grammarPoints = (item.grammarIds ?? [])
            .map(id => grammarById.get(id))
            .filter((g): g is NonNullable<typeof g> => !!g)

          return (
            <article
              key={item.id}
              className={`glass-card p-4 sm:p-5 space-y-3 border-l-4 ${
                st === 'known'
                  ? 'border-l-green'
                  : st === 'review'
                    ? 'border-l-yellow'
                    : 'border-l-transparent'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-surface">
                      M{item.mondaiNumber} · #{item.number}
                    </span>
                    <span className="text-xs text-muted">{localize(item.recallPrompt)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span lang="ja" className="jp text-lg sm:text-xl font-bold break-words">
                      <ExamText
                        text={item.targetJa}
                        furiganaMap={furiganaMap}
                        showFurigana={showFurigana && revealed}
                      />
                    </span>
                    <SpeakButton text={item.kana || item.targetJa.replace(/<\/?u>/g, '')} size="sm" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {recallMode && (
                    <button
                      type="button"
                      onClick={() => toggleReveal(item.id)}
                      className="min-h-10 px-3 rounded-xl border border-structural bg-card hover:bg-surface text-xs font-semibold cursor-pointer"
                    >
                      {revealed ? l('Hide answer', 'Ẩn đáp án') : l('Reveal answer', 'Xem đáp án')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAuditStatus(item.id, st === 'known' ? null : 'known')}
                    aria-pressed={st === 'known'}
                    className={`min-h-10 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                      st === 'known'
                        ? 'border-green bg-green/20 text-green'
                        : 'border-structural bg-card hover:bg-surface text-muted'
                    }`}
                  >
                    {l('Known', 'Đã chắc')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditStatus(item.id, st === 'review' ? null : 'review')}
                    aria-pressed={st === 'review'}
                    className={`min-h-10 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                      st === 'review'
                        ? 'border-yellow bg-yellow/20 text-ink'
                        : 'border-structural bg-card hover:bg-surface text-muted'
                    }`}
                  >
                    {l('Review', 'Cần ôn')}
                  </button>
                </div>
              </div>

              {revealed && (
                <div className="rounded-xl border border-structural bg-surface/70 p-3.5 space-y-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.kana && <span className="jp font-bold text-accent">{item.kana}</span>}
                    {item.hanviet && (
                      <span className="font-mono text-[11px] uppercase px-2 py-0.5 rounded bg-card border border-structural text-muted">
                        {item.hanviet}
                      </span>
                    )}
                    <span className="font-semibold">{localize(item.meaning)}</span>
                  </div>

                  {item.answerPattern && (
                    <p lang="ja" className="jp text-sm font-medium bg-card/70 rounded-lg px-3 py-2 border border-structural">
                      <ExamText text={item.answerPattern} furiganaMap={furiganaMap} showFurigana={showFurigana} />
                    </p>
                  )}

                  {item.usageExample && (
                    <p lang="ja" className="jp text-xs sm:text-sm text-muted">
                      <ExamText text={item.usageExample} furiganaMap={furiganaMap} showFurigana={showFurigana} />
                    </p>
                  )}

                  <p className="text-xs sm:text-sm leading-relaxed">{localize(item.takeaway)}</p>

                  {item.trap && (
                    <p className="text-xs rounded-lg border-l-3 border-yellow bg-yellow/10 px-3 py-2">
                      <strong>{l('Trap:', 'Bẫy:')}</strong> {localize(item.trap)}
                    </p>
                  )}

                  {(grammarPoints.length > 0 || (onSelectKanji && kanjis.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {grammarPoints.map(g => (
                        <GrammarHoverLink
                          key={g.id}
                          g={g}
                          className="jp inline-flex items-center min-h-8 px-2.5 py-1 rounded-lg border border-blue/35 bg-card text-xs font-bold hover:bg-blue/10"
                        >
                          {g.pattern} ↗
                        </GrammarHoverLink>
                      ))}
                      {onSelectKanji &&
                        kanjis.map(ch => (
                          <button
                            key={ch}
                            type="button"
                            data-kanji={ch}
                            onClick={() => onSelectKanji(ch)}
                            title={l(`Inspect ${ch}`, `Xem chữ ${ch}`)}
                            className="jp min-w-9 h-9 px-2 rounded-lg border border-structural bg-card hover:border-accent hover:text-accent text-sm font-bold cursor-pointer"
                          >
                            {ch}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
