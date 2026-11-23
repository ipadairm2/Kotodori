import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  ExamAudit202607,
  ExamFuriganaMap,
  ExamManifestItem,
  ExamPaper,
  ExamSectionCode,
  StudyPlanData,
} from '@/types/exams'
import {
  loadExamAudit,
  loadExamFurigana,
  loadExamManifest,
  loadExamPaper,
  loadStudyPlan,
} from '@/data/exams'
import { useTranslation } from '@/lib/useTranslation'
import { SECTION_LABELS } from '@/lib/exam-scoring'
import { attemptKey, useExamStore } from '@/store/exam-store'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ToriLoader } from '@/components/ui/ToriLoader'
import { NerdIcon, type NerdIconName } from '@/components/ui/NerdIcon'
import { KanjiDrawer } from '@/components/kanji/KanjiDrawer'
import { StudyRoadmapView } from '@/components/exams/StudyRoadmapView'
import { ExamRunner } from '@/components/exams/ExamRunner'
import { Audit202607View } from '@/components/exams/Audit202607View'
import { MistakeNotebookView } from '@/components/exams/MistakeNotebookView'

type ExamsTab = 'plan' | 'papers' | 'audit' | 'mistakes'

export function Exams() {
  const { localize } = useTranslation()
  const l = (en: string, vi: string) => localize({ en, vi })
  const [params, setParams] = useSearchParams()

  const rawTab = params.get('tab') as ExamsTab | null
  const tab: ExamsTab =
    rawTab === 'papers' || rawTab === 'audit' || rawTab === 'mistakes' ? rawTab : 'plan'
  const examParam = params.get('exam')
  const sectionParam = params.get('section') as ExamSectionCode | null

  const attempts = useExamStore(s => s.attempts)
  const mistakes = useExamStore(s => s.mistakes)

  const [manifest, setManifest] = useState<ExamManifestItem[] | null>(null)
  const [plan, setPlan] = useState<StudyPlanData | null>(null)
  const [audit, setAudit] = useState<ExamAudit202607 | null>(null)
  const [paper, setPaper] = useState<ExamPaper | null>(null)
  const [furiganaMap, setFuriganaMap] = useState<ExamFuriganaMap | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [drawerKanji, setDrawerKanji] = useState<string | null>(null)
  const [mistakeFilterIds, setMistakeFilterIds] = useState<string[] | null>(null)

  useEffect(() => {
    let live = true
    Promise.all([loadExamManifest(), loadStudyPlan(), loadExamFurigana()])
      .then(([m, pl, fg]) => {
        if (!live) return
        setManifest(m)
        setPlan(pl)
        setFuriganaMap(fg)
      })
      .catch(e => {
        if (live) setLoadError(String(e))
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (tab !== 'audit' || audit) return
    let live = true
    loadExamAudit()
      .then(a => {
        if (live) setAudit(a)
      })
      .catch(e => {
        if (live) setLoadError(String(e))
      })
    return () => {
      live = false
    }
  }, [tab, audit])

  useEffect(() => {
    if (tab !== 'papers' || !examParam) {
      setPaper(null)
      return
    }
    let live = true
    setPaper(null)
    loadExamPaper(examParam)
      .then(p => {
        if (live) setPaper(p)
      })
      .catch(e => {
        if (live) setLoadError(String(e))
      })
    return () => {
      live = false
    }
  }, [tab, examParam])

  const activeSection: ExamSectionCode = useMemo(() => {
    if (!paper) return 'vocab'
    if (sectionParam && paper.sections[sectionParam]) return sectionParam
    return paper.sectionMeta[0]?.code ?? 'vocab'
  }, [paper, sectionParam])

  const setTab = (next: ExamsTab) => {
    setMistakeFilterIds(null)
    if (next === 'papers' && examParam) {
      setParams({ tab: 'papers', exam: examParam, ...(sectionParam ? { section: sectionParam } : {}) })
    } else {
      setParams({ tab: next })
    }
  }

  const openPaper = (examId: string, section: ExamSectionCode = 'vocab', filterIds: string[] | null = null) => {
    setMistakeFilterIds(filterIds)
    setParams({ tab: 'papers', exam: examId, section })
  }

  const mistakeCount = Object.keys(mistakes).length

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
        <div className="glass-card p-6 border-red/40">
          <p className="font-bold text-red">{l('Failed to load exam data', 'Không thể tải dữ liệu đề thi')}</p>
          <p className="text-xs text-muted mt-1">{loadError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 pb-16">
      <ScreenHeader
        eyebrowJa="JLPT N4 · 試験対策"
        eyebrowEn="EXAM PREP · DEC 2026"
        title={l('N4 Exam Lab', 'Luyện đề JLPT N4')}
        description={l(
          'Scientific 13-day revision plan, full 12/2025 & 07/2025 past exams, Vô Diện JP 12/2026 mock papers, and the reconstructed 07/2026 sitting audit: every question solved step by step.',
          'Lộ trình ôn khoa học hướng tới kỳ 06/12/2026, trọn bộ đề thi thật 12/2025 & 07/2025, đề minh họa Vô Diện JP 12/2026 và tổng rà soát kỳ 07/2026 với giải thích chi tiết từng câu.'
        )}
        watermark="試"
      />

      {/* Top Navigation Tabs */}
      <nav
        className="flex flex-wrap gap-2 mb-7 pb-4 border-b border-structural"
        role="tablist"
        aria-label={l('Exam prep views', 'Các mục luyện đề')}
      >
        {(
          [
            { id: 'plan', icon: 'calendar' as NerdIconName, vi: 'Lộ trình & Chẩn đoán', en: 'Sprint Plan & Radar' },
            { id: 'papers', icon: 'exam' as NerdIconName, vi: 'Kho đề thi & Lời giải', en: 'Exam Papers & Solutions' },
            { id: 'audit', icon: 'alert' as NerdIconName, vi: 'Rà soát đề 07/2026', en: '07/2026 Audit' },
            {
              id: 'mistakes',
              icon: 'notebook' as NerdIconName,
              vi: 'Sổ lỗi sai',
              en: 'Mistakes',
              count: mistakeCount,
            },
          ] as const
        ).map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-11 px-4 rounded-xl border text-xs sm:text-sm font-semibold cursor-pointer transition-colors inline-flex items-center gap-2 ${
              tab === t.id
                ? 'bg-accent text-accent-fg border-accent'
                : 'border-structural bg-card hover:bg-surface'
            }`}
          >
            <NerdIcon name={t.icon} className="text-sm opacity-90" />
            <span>{localize({ en: t.en, vi: t.vi })}</span>
            {'count' in t && (
              <span
                className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md tabular-nums ${
                  tab === t.id ? 'bg-white/20 text-accent-fg' : 'bg-surface text-muted'
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Active View */}
      {!manifest || !plan ? (
        <ToriLoader />
      ) : tab === 'plan' ? (
        <StudyRoadmapView plan={plan} />
      ) : tab === 'audit' ? (
        audit ? (
          <Audit202607View
            audit={audit}
            furiganaMap={furiganaMap}
            onSelectKanji={setDrawerKanji}
          />
        ) : (
          <ToriLoader />
        )
      ) : tab === 'mistakes' ? (
        <MistakeNotebookView
          manifest={manifest}
          furiganaMap={furiganaMap}
          onSelectKanji={setDrawerKanji}
          onDrillMistakes={(eid, sec, ids) => openPaper(eid, sec, ids)}
        />
      ) : examParam && paper ? (
        <ExamRunner
          paper={paper}
          section={activeSection}
          onSelectSection={sec => openPaper(paper.id, sec, null)}
          onBack={() => {
            setMistakeFilterIds(null)
            setParams({ tab: 'papers' })
          }}
          furiganaMap={furiganaMap}
          onSelectKanji={setDrawerKanji}
          mistakeFilterIds={mistakeFilterIds}
          onClearMistakeFilter={() => setMistakeFilterIds(null)}
        />
      ) : examParam && !paper ? (
        <ToriLoader />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {manifest.map(item => {
            const completedSections = item.sections.filter(
              sec => attempts[attemptKey(item.id, sec)]?.submitted
            ).length
            return (
              <article key={item.id} className="glass-card glass-lift p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`font-mono text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${
                        item.kind === 'official_past'
                          ? 'bg-accent/15 text-accent'
                          : 'bg-blue/15 text-blue'
                      }`}
                    >
                      {item.kind === 'official_past'
                        ? l('Official Past Paper', 'Đề thi thật JLPT')
                        : l('VDJ 12/2026 Mock', 'Đề minh họa VDJ')}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {item.totalQuestions}q · ~{item.recommendedMinutes}m
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold">{localize(item.title)}</h2>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">{localize(item.subtitle)}</p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.sections.map(sec => {
                      const att = attempts[attemptKey(item.id, sec)]
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => openPaper(item.id, sec)}
                          className={`min-h-9 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                            att?.submitted && att.lastScore
                              ? 'border-green/40 bg-green/10 text-green'
                              : 'border-structural bg-surface hover:border-accent'
                          }`}
                        >
                          {localize(SECTION_LABELS[sec])}
                          {att?.submitted && att.lastScore && (
                            <span className="font-mono ml-1">{att.lastScore.correct}/{att.lastScore.total}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-structural">
                  <span className="font-mono text-xs text-muted">
                    {completedSections}/{item.sections.length} {l('sections done', 'phần đã xong')}
                  </span>
                  <button
                    type="button"
                    onClick={() => openPaper(item.id, item.sections[0] ?? 'vocab')}
                    className="min-h-11 px-4 rounded-xl bg-accent text-accent-fg text-xs sm:text-sm font-bold cursor-pointer hover:opacity-90 inline-flex items-center gap-1.5"
                  >
                    <span>{l('Open Exam', 'Vào làm / Xem giải')}</span>
                    <span aria-hidden="true" className="font-mono">{'->'}</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <KanjiDrawer char={drawerKanji} onClose={() => setDrawerKanji(null)} />
    </div>
  )
}
