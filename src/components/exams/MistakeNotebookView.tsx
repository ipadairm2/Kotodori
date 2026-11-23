import { useEffect, useMemo, useState } from 'react'
import type {
  ExamFuriganaMap,
  ExamManifestItem,
  ExamPaper,
  ExamQuestion,
  ExamSectionCode,
} from '@/types/exams'
import { loadExamPaper } from '@/data/exams'
import { useTranslation } from '@/lib/useTranslation'
import { FORMAT_LABELS, SECTION_LABELS } from '@/lib/exam-scoring'
import { mistakeKey, useExamStore, type MistakeEntry } from '@/store/exam-store'
import { ExamText } from './ExamText'
import { QuestionBreakdown } from './QuestionBreakdown'

interface MistakeNotebookViewProps {
  manifest: ExamManifestItem[]
  furiganaMap?: ExamFuriganaMap | null
  onSelectKanji?: (ch: string) => void
  onDrillMistakes: (examId: string, section: ExamSectionCode, questionIds: string[]) => void
}

export function MistakeNotebookView({
  manifest,
  furiganaMap,
  onSelectKanji,
  onDrillMistakes,
}: MistakeNotebookViewProps) {
  const { localize } = useTranslation()
  const l = (en: string, vi: string) => localize({ en, vi })

  const mistakesMap = useExamStore(s => s.mistakes)
  const clearMistake = useExamStore(s => s.clearMistake)
  const showFurigana = useExamStore(s => s.showFurigana)

  const [sectionFilter, setSectionFilter] = useState<'all' | ExamSectionCode>('all')
  const [loadedPapers, setLoadedPapers] = useState<Record<string, ExamPaper>>({})
  const [openKey, setOpenKey] = useState<string | null>(null)

  const entries = useMemo<MistakeEntry[]>(() => {
    return Object.values(mistakesMap)
      .filter(e => sectionFilter === 'all' || e.section === sectionFilter)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [mistakesMap, sectionFilter])

  const examIdsNeeded = useMemo(
    () => [...new Set(entries.map(e => e.examId))],
    [entries]
  )

  useEffect(() => {
    let live = true
    for (const id of examIdsNeeded) {
      if (loadedPapers[id]) continue
      loadExamPaper(id)
        .then(p => {
          if (live) setLoadedPapers(prev => ({ ...prev, [id]: p }))
        })
        .catch(() => {})
    }
    return () => {
      live = false
    }
  }, [examIdsNeeded, loadedPapers])

  const manifestMap = useMemo(() => new Map(manifest.map(m => [m.id, m])), [manifest])

  // Group by examId:section for one-click Drill Mistakes
  const drillGroups = useMemo(() => {
    const groups = new Map<string, { examId: string; section: ExamSectionCode; ids: string[] }>()
    for (const e of entries) {
      const gk = `${e.examId}:${e.section}`
      const g = groups.get(gk) ?? { examId: e.examId, section: e.section, ids: [] }
      g.ids.push(e.questionId)
      groups.set(gk, g)
    }
    return [...groups.values()]
  }, [entries])

  const findQuestion = (entry: MistakeEntry): ExamQuestion | null => {
    const paper = loadedPapers[entry.examId]
    if (!paper) return null
    const mondais = paper.sections[entry.section] ?? []
    for (const m of mondais) {
      const hit = m.questions.find(q => q.id === entry.questionId)
      if (hit) return hit
    }
    return null
  }

  return (
    <div className="space-y-6">
      <section className="glass-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent font-semibold">
              {l('Spaced Error Recovery', 'Sổ lỗi sai & Ôn ngắt quãng')}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold">
              {l('Mistake & Bookmark Notebook', 'Sổ tổng hợp câu sai & câu đã lưu')}
            </h2>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {l(
                'Every wrong answer from Timed Mock submissions and every bookmarked question lands here. Drill a batch and answer a mistake correctly twice in a row to graduate it.',
                'Mọi câu làm sai khi nộp bài hoặc câu bạn bấm Lưu đều được gom về đây. Bấm luyện lại và trả lời đúng 2 lần liên tiếp để xóa lỗi.'
              )}
            </p>
          </div>

          <div className="rounded-xl border border-structural bg-surface px-4 py-2.5 text-center shrink-0">
            <div className="font-mono text-xl font-bold">{Object.keys(mistakesMap).length}</div>
            <div className="text-xs text-muted">{l('Saved items', 'Mục cần ôn')}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-structural">
          {(
            [
              { id: 'all', en: 'All sections', vi: 'Tất cả phần' },
              { id: 'vocab', en: 'Vocabulary', vi: 'Từ vựng' },
              { id: 'grammar', en: 'Grammar', vi: 'Ngữ pháp' },
              { id: 'reading', en: 'Reading', vi: 'Đọc hiểu' },
              { id: 'listening', en: 'Listening', vi: 'Nghe hiểu' },
            ] as const
          ).map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSectionFilter(s.id)}
              aria-pressed={sectionFilter === s.id}
              className={`min-h-10 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                sectionFilter === s.id
                  ? 'bg-accent text-accent-fg border-accent'
                  : 'border-structural bg-card hover:bg-surface'
              }`}
            >
              {localize({ en: s.en, vi: s.vi })}
            </button>
          ))}
        </div>

        {drillGroups.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {drillGroups.map(g => {
              const info = manifestMap.get(g.examId)
              return (
                <button
                  key={`${g.examId}:${g.section}`}
                  type="button"
                  onClick={() => onDrillMistakes(g.examId, g.section, g.ids)}
                  className="min-h-10 px-3.5 rounded-xl bg-accent text-accent-fg text-xs font-bold cursor-pointer hover:opacity-90"
                >
                  {l('Retry mistakes', 'Luyện lại')}: {info ? localize(info.title) : g.examId} · {localize(SECTION_LABELS[g.section])} ({g.ids.length})
                </button>
              )
            })}
          </div>
        )}
      </section>

      {entries.length === 0 ? (
        <div className="glass-card p-6 text-sm text-muted leading-relaxed">
          {l(
            'Your Mistake Notebook is empty. Take any section in Timed Mock mode or tap "Save" on a tricky question to collect items for targeted spaced retry.',
            'Sổ lỗi sai đang trống. Hãy làm thử một phần đề ở chế độ Thi thử hoặc bấm "Lưu câu" ở các câu hay nhầm để gom vào đây luyện lại.'
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            const mk = mistakeKey(entry.examId, entry.section, entry.questionId)
            const q = findQuestion(entry)
            const info = manifestMap.get(entry.examId)
            const expanded = openKey === mk

            return (
              <article key={mk} className="glass-card p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-accent">
                        {info ? localize(info.title) : entry.examId}
                      </span>
                      <span className="font-mono px-2 py-0.5 rounded bg-surface text-[11px]">
                        {localize(SECTION_LABELS[entry.section])} · {localize(FORMAT_LABELS[entry.format] ?? { vi: entry.format, en: entry.format })}
                      </span>
                      {entry.wrongCount > 0 && (
                        <span className="font-mono px-2 py-0.5 rounded bg-red/15 text-red text-[11px]">
                          ×{entry.wrongCount} {l('missed', 'sai')}
                        </span>
                      )}
                      {entry.correctStreak > 0 && (
                        <span className="font-mono px-2 py-0.5 rounded bg-green/15 text-green text-[11px]">
                          {l('Streak', 'Đúng liên tiếp')}: {entry.correctStreak}/2
                        </span>
                      )}
                      {entry.bookmarked && (
                        <span className="font-mono px-2 py-0.5 rounded bg-accent/15 text-accent text-[11px]">
                          ★ {l('Saved', 'Đã lưu')}
                        </span>
                      )}
                    </div>

                    {q ? (
                      <p lang="ja" className="jp text-base sm:text-lg font-medium leading-relaxed pt-1">
                        <span className="font-mono text-xs text-muted mr-2">Q{q.number}.</span>
                        <ExamText text={q.promptJa} furiganaMap={furiganaMap} showFurigana={showFurigana} />
                      </p>
                    ) : (
                      <p className="text-xs text-muted">{l('Loading question...', 'Đang tải câu hỏi...')}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenKey(expanded ? null : mk)}
                      className="min-h-10 px-3 rounded-xl border border-structural bg-card hover:bg-surface text-xs font-semibold cursor-pointer"
                    >
                      {expanded ? l('Hide breakdown', 'Ẩn giải thích') : l('Inspect solution', 'Xem giải chi tiết')}
                    </button>
                    <button
                      type="button"
                      onClick={() => clearMistake(mk)}
                      className="min-h-10 px-3 rounded-xl border border-structural text-xs text-muted hover:text-red cursor-pointer"
                    >
                      {l('Remove', 'Xóa')}
                    </button>
                  </div>
                </div>

                {expanded && q && (
                  <QuestionBreakdown
                    question={q}
                    furiganaMap={furiganaMap}
                    showFurigana={showFurigana}
                    onSelectKanji={onSelectKanji}
                  />
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
