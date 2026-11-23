import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  ExamFuriganaMap,
  ExamMondai,
  ExamPaper,
  ExamQuestion,
  ExamSectionCode,
  MondaiFormat,
} from '@/types/exams'
import { useTranslation } from '@/lib/useTranslation'
import { attemptKey, mistakeKey, useExamStore } from '@/store/exam-store'
import { estimateJlptN4Result, FORMAT_LABELS, scoreSection } from '@/lib/exam-scoring'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { ExamText } from './ExamText'
import { PassageCard } from './PassageCard'
import { ListeningPlayer } from './ListeningPlayer'
import { MondaiVisualBanner } from './MondaiVisualBanner'
import { QuestionBreakdown } from './QuestionBreakdown'

interface ExamRunnerProps {
  paper: ExamPaper
  section: ExamSectionCode
  onSelectSection: (section: ExamSectionCode) => void
  onBack: () => void
  furiganaMap?: ExamFuriganaMap | null
  onSelectKanji?: (ch: string) => void
  mistakeFilterIds?: string[] | null
  onClearMistakeFilter?: () => void
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ExamRunner({
  paper,
  section,
  onSelectSection,
  onBack,
  furiganaMap,
  onSelectKanji,
  mistakeFilterIds,
  onClearMistakeFilter,
}: ExamRunnerProps) {
  const { localize } = useTranslation()
  const l = (en: string, vi: string) => localize({ en, vi })

  const attempts = useExamStore(s => s.attempts)
  const mistakes = useExamStore(s => s.mistakes)
  const showFurigana = useExamStore(s => s.showFurigana)
  const setShowFurigana = useExamStore(s => s.setShowFurigana)
  const setAnswer = useExamStore(s => s.setAnswer)
  const toggleFlag = useExamStore(s => s.toggleFlag)
  const setElapsedSeconds = useExamStore(s => s.setElapsedSeconds)
  const submitSection = useExamStore(s => s.submitSection)
  const resetSectionAttempt = useExamStore(s => s.resetSectionAttempt)
  const toggleBookmark = useExamStore(s => s.toggleBookmark)
  const markMistakeResult = useExamStore(s => s.markMistakeResult)

  const [mode, setMode] = useState<'study' | 'test'>(mistakeFilterIds?.length ? 'study' : 'study')
  const [mondaiFilter, setMondaiFilter] = useState<number | 'all'>('all')
  const [revealedIds, setRevealedIds] = useState<Record<string, true>>({})
  const [revealAllStudy, setRevealAllStudy] = useState(false)
  const [timerPaused, setTimerPaused] = useState(false)

  const key = attemptKey(paper.id, section)
  const attempt = attempts[key] ?? {
    answers: {},
    flagged: {},
    submitted: false,
    elapsedSeconds: 0,
  }

  const rawMondais = useMemo(() => paper.sections[section] ?? [], [paper, section])

  const filteredMondais = useMemo<ExamMondai[]>(() => {
    const filterSet = mistakeFilterIds?.length ? new Set(mistakeFilterIds) : null
    return rawMondais
      .filter(m => mondaiFilter === 'all' || m.mondaiNumber === mondaiFilter)
      .map(m =>
        filterSet ? { ...m, questions: m.questions.filter(q => filterSet.has(q.id)) } : m
      )
      .filter(m => m.questions.length > 0)
  }, [rawMondais, mondaiFilter, mistakeFilterIds])

  const allSectionQuestions = useMemo(
    () => rawMondais.flatMap(m => m.questions.map(q => ({ mondai: m, question: q }))),
    [rawMondais]
  )

  const currentSectionMeta = paper.sectionMeta.find(s => s.code === section)
  const targetMinutes = currentSectionMeta?.recommendedMinutes ?? 25

  // Reset per-section transient UI state when changing paper/section
  useEffect(() => {
    setMondaiFilter('all')
    setRevealedIds({})
    setRevealAllStudy(false)
  }, [paper.id, section])

  // Section timer in Timed Test Mode
  useEffect(() => {
    if (mode !== 'test' || attempt.submitted || timerPaused) return
    const id = window.setInterval(() => {
      const cur = useExamStore.getState().attempts[attemptKey(paper.id, section)]?.elapsedSeconds ?? 0
      setElapsedSeconds(paper.id, section, cur + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [mode, attempt.submitted, timerPaused, paper.id, section, setElapsedSeconds])

  const sectionScore = useMemo(
    () => scoreSection(rawMondais, attempt.answers),
    [rawMondais, attempt.answers]
  )

  const jlptEstimate = useMemo(() => {
    const scores: Partial<Record<ExamSectionCode, { correct: number; total: number }>> = {}
    for (const meta of paper.sectionMeta) {
      const a = attempts[attemptKey(paper.id, meta.code)]
      if (a?.submitted && a.lastScore) {
        scores[meta.code] = { correct: a.lastScore.correct, total: a.lastScore.total }
      }
    }
    return estimateJlptN4Result(scores)
  }, [attempts, paper.id, paper.sectionMeta])

  const answeredCount = allSectionQuestions.filter(
    ({ question }) => attempt.answers[question.id] !== undefined
  ).length

  const isQuestionRevealed = (qId: string): boolean => {
    if (attempt.submitted) return true
    if (mode === 'study') {
      return revealAllStudy || !!revealedIds[qId] || attempt.answers[qId] !== undefined
    }
    return false
  }

  const handleChoose = (q: ExamQuestion, idx: number) => {
    if (mode === 'test' && attempt.submitted) return
    setAnswer(paper.id, section, q.id, idx)
    if (mode === 'study') {
      setRevealedIds(prev => ({ ...prev, [q.id]: true }))
      if (mistakeFilterIds?.length) {
        markMistakeResult(mistakeKey(paper.id, section, q.id), idx === q.answerIndex)
      }
    }
  }

  const handleSubmitTest = () => {
    const res = scoreSection(rawMondais, attempt.answers)
    submitSection(paper.id, section, res)
  }

  const handleReset = () => {
    resetSectionAttempt(paper.id, section)
    setRevealedIds({})
    setRevealAllStudy(false)
  }

  const scrollToQuestion = (qId: string) => {
    document.getElementById(`exam-q-${qId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="space-y-5 min-w-0">
      {/* Top Paper Bar */}
      <section className="glass-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="min-h-9 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer mb-1.5"
            >
              <span>←</span>
              <span>{l('All exam papers', 'Danh sách đề thi')}</span>
            </button>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight break-words">
              {localize(paper.title)}
            </h2>
            <p className="text-xs sm:text-sm text-muted mt-0.5">{localize(paper.sourceNote)}</p>
          </div>
          {paper.referenceVideoUrl && (
            <a
              href={paper.referenceVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="min-h-11 px-3.5 rounded-xl border border-structural bg-card text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-surface shrink-0"
            >
              <span>▶</span>
              <span>{l('Vô Diện JP Video', 'Video chữa đề')} ↗</span>
            </a>
          )}
        </div>

        {/* Section switcher */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={l('Exam sections', 'Phần thi')}>
          {paper.sectionMeta.map(meta => {
            const active = meta.code === section
            const secAttempt = attempts[attemptKey(paper.id, meta.code)]
            return (
              <button
                key={meta.code}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectSection(meta.code)}
                className={`min-h-11 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                  active
                    ? 'bg-accent text-accent-fg border-accent'
                    : 'border-structural bg-card hover:bg-surface'
                }`}
              >
                <span>{localize(meta.title)}</span>
                <span className={`font-mono text-[11px] ${active ? 'opacity-90' : 'text-muted'}`}>
                  {meta.questionCount}
                </span>
                {secAttempt?.submitted && secAttempt.lastScore && (
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md ${
                      active ? 'bg-white/20' : 'bg-green/15 text-green'
                    }`}
                  >
                    {secAttempt.lastScore.correct}/{secAttempt.lastScore.total}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Mode, Furigana & Timer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-structural">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-structural bg-surface p-1">
              {(
                [
                  { id: 'study', en: 'Study & Solutions', vi: 'Học & Giải chi tiết' },
                  { id: 'test', en: 'Timed Mock', vi: 'Thi thử tính giờ' },
                ] as const
              ).map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  className={`min-h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    mode === m.id ? 'bg-card text-ink shadow-xs' : 'text-muted hover:text-ink'
                  }`}
                >
                  {localize({ en: m.en, vi: m.vi })}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowFurigana(!showFurigana)}
              aria-pressed={showFurigana}
              className={`min-h-11 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                showFurigana ? 'bg-accent/15 border-accent text-accent' : 'border-structural bg-card text-muted'
              }`}
            >
              Furigana · {showFurigana ? l('On', 'Bật') : l('Off', 'Tắt')}
            </button>

            {mode === 'study' && (
              <button
                type="button"
                onClick={() => setRevealAllStudy(v => !v)}
                aria-pressed={revealAllStudy}
                className={`min-h-11 px-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                  revealAllStudy ? 'bg-blue/15 border-blue text-blue' : 'border-structural bg-card hover:bg-surface'
                }`}
              >
                {revealAllStudy ? l('Hide unattempted keys', 'Ẩn đáp án chưa làm') : l('Reveal all solutions', 'Mở toàn bộ lời giải')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {mode === 'test' && (
              <div className="flex items-center gap-2 rounded-xl border border-structural bg-card px-3 py-1.5">
                <span className="font-mono text-xs font-bold tabular-nums">
                  {formatTimer(attempt.elapsedSeconds)} / {targetMinutes}:00
                </span>
                {!attempt.submitted && (
                  <button
                    type="button"
                    onClick={() => setTimerPaused(p => !p)}
                    className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                  >
                    {timerPaused ? l('Resume', 'Tiếp') : l('Pause', 'Tạm dừng')}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="min-h-11 px-3 rounded-xl border border-structural text-xs font-semibold text-muted hover:text-ink hover:bg-surface cursor-pointer"
            >
              {l('Reset section', 'Làm lại phần này')}
            </button>
          </div>
        </div>

        {showFurigana && section === 'vocab' && (
          <p className="text-xs text-muted">
            {l(
              'Anti-spoiler active: underlined targets in Mondai 1 & 2 stay un-glossed until revealed.',
              'Chống lộ đáp án: chữ gạch chân ở Mondai 1 & 2 ẩn furigana cho đến khi xem giải.'
            )}
          </p>
        )}

        {mistakeFilterIds?.length ? (
          <div className="rounded-xl border border-yellow/40 bg-yellow/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold">
              {l(
                `Mistake Drill active: showing ${mistakeFilterIds.length} saved mistake(s). Answer correctly twice in a row to graduate them.`,
                `Đang luyện câu sai: hiển thị ${mistakeFilterIds.length} câu cần ôn. Trả lời đúng 2 lần liên tiếp để xóa khỏi sổ lỗi.`
              )}
            </span>
            {onClearMistakeFilter && (
              <button
                type="button"
                onClick={onClearMistakeFilter}
                className="font-bold underline cursor-pointer"
              >
                {l('Show full section', 'Hiện toàn bộ phần thi')}
              </button>
            )}
          </div>
        ) : null}
      </section>

      {/* Submitted Scorecard */}
      {attempt.submitted && (
        <section className="glass-card p-5 border-accent/40 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent font-semibold">
                {l('Section Scorecard', 'Kết quả phần thi')}
              </span>
              <h3 className="text-2xl font-bold mt-1">
                {sectionScore.correct} / {sectionScore.total}{' '}
                <span className="font-mono text-lg text-muted">({sectionScore.percent}%)</span>
              </h3>
            </div>

            {jlptEstimate.knowledgeReadingScore !== null && (
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="rounded-xl border border-structural bg-surface px-3 py-2">
                  <div className="text-muted">{l('Est. Knowledge+Reading', 'Ước lượng KTNN + Đọc')}</div>
                  <div className="font-mono font-bold text-sm mt-0.5">
                    {jlptEstimate.knowledgeReadingScore}/120{' '}
                    <span className={jlptEstimate.passedKnowledgeReading ? 'text-green' : 'text-red'}>
                      ({jlptEstimate.passedKnowledgeReading ? '≥38 ✓' : '<38 ✕'})
                    </span>
                  </div>
                </div>
                {jlptEstimate.listeningScore !== null && (
                  <div className="rounded-xl border border-structural bg-surface px-3 py-2">
                    <div className="text-muted">{l('Est. Listening', 'Ước lượng Nghe')}</div>
                    <div className="font-mono font-bold text-sm mt-0.5">
                      {jlptEstimate.listeningScore}/60{' '}
                      <span className={jlptEstimate.passedListening ? 'text-green' : 'text-red'}>
                        ({jlptEstimate.passedListening ? '≥19 ✓' : '<19 ✕'})
                      </span>
                    </div>
                  </div>
                )}
                {jlptEstimate.totalScore !== null && (
                  <div className="rounded-xl border border-structural bg-surface px-3 py-2">
                    <div className="text-muted">{l('Est. Total N4', 'Tổng điểm ước lượng')}</div>
                    <div className="font-mono font-bold text-sm mt-0.5">
                      {jlptEstimate.totalScore}/180{' '}
                      <span className={jlptEstimate.passed ? 'text-green' : 'text-red'}>
                        ({jlptEstimate.passed ? l('PASS ≥90', 'ĐẠT ≥90') : l('BELOW 90', 'CHƯA ĐẠT')})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(sectionScore.byFormat).map(([fmt, stats]) => {
              const pct = Math.round((stats.correct / stats.total) * 100)
              const fmtLabel = FORMAT_LABELS[fmt as MondaiFormat]
              return (
                <div key={fmt} className="rounded-xl border border-structural bg-card/70 px-3 py-2 text-xs">
                  <div className="text-muted truncate">{fmtLabel ? localize(fmtLabel) : fmt}</div>
                  <div className="font-mono font-bold mt-0.5">
                    {stats.correct}/{stats.total} ({pct}%)
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted">
            {l(
              'Note: Official JLPT scores use IRT scaling; this estimate maps raw accuracy proportionally. All mistakes were saved to your Mistake Notebook.',
              'Lưu ý: Điểm JLPT thật chấm theo thang IRT; đây là ước lượng quy đổi theo tỷ lệ. Các câu sai đã được tự động lưu vào Sổ lỗi sai.'
            )}
          </p>
        </section>
      )}

      {/* Mondai filter + Question Navigator */}
      <section className="glass-card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMondaiFilter('all')}
            aria-pressed={mondaiFilter === 'all'}
            className={`min-h-10 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
              mondaiFilter === 'all' ? 'bg-accent text-accent-fg border-accent' : 'border-structural bg-card hover:bg-surface'
            }`}
          >
            {l('All Mondai', 'Tất cả Mondai')} ({allSectionQuestions.length})
          </button>
          {rawMondais.map(m => (
            <button
              key={m.mondaiNumber}
              type="button"
              onClick={() => setMondaiFilter(m.mondaiNumber)}
              aria-pressed={mondaiFilter === m.mondaiNumber}
              className={`min-h-10 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                mondaiFilter === m.mondaiNumber
                  ? 'bg-accent text-accent-fg border-accent'
                  : 'border-structural bg-card hover:bg-surface'
              }`}
            >
              M{m.mondaiNumber} · {localize(m.title)} ({m.questions.length})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-structural">
          {filteredMondais.flatMap(m => m.questions).map(q => {
            const chosen = attempt.answers[q.id]
            const revealed = isQuestionRevealed(q.id)
            const flagged = !!attempt.flagged[q.id]
            let cls = 'border-structural bg-card text-muted hover:text-ink'
            if (revealed && chosen !== undefined) {
              cls = chosen === q.answerIndex
                ? 'border-green/50 bg-green/20 text-green font-bold'
                : 'border-red/50 bg-red/15 text-red font-bold'
            } else if (chosen !== undefined) {
              cls = 'border-accent bg-accent/15 text-accent font-bold'
            }
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => scrollToQuestion(q.id)}
                className={`size-9 rounded-lg border font-mono text-xs flex items-center justify-center cursor-pointer transition-colors ${cls} ${
                  flagged ? 'ring-2 ring-yellow' : ''
                }`}
                title={l(`Jump to question ${q.number}`, `Đi tới câu ${q.number}`)}
              >
                {q.number}
              </button>
            )
          })}
        </div>
      </section>

      {/* Mondais & Questions */}
      <div className="space-y-8">
        {filteredMondais.map(m => {
          const isKanjiTarget = m.format === 'kanji_reading' || m.format === 'kanji_writing'
          // Group passages cleanly: render a passage right above the first question referencing it
          const renderedPassages = new Set<string>()
          const passageMap = new Map(m.passages.map(p => [p.id, p]))

          return (
            <section key={`${section}-m-${m.mondaiNumber}`} className="space-y-4">
              <div className="glass-card p-4 sm:p-5 border-l-4 border-l-accent">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold">
                    Mondai {m.mondaiNumber} · {localize(m.title)}
                  </h3>
                  <span className="font-mono text-xs text-muted">{m.questions.length} {l('questions', 'câu')}</span>
                </div>
                <p lang="ja" className="jp text-sm sm:text-base mt-2 leading-relaxed">
                  <ExamText text={m.instructionJa} furiganaMap={furiganaMap} showFurigana={showFurigana} />
                </p>
                {section === 'listening' && (
                  <MondaiVisualBanner format={m.format} mondaiNumber={m.mondaiNumber} />
                )}
                <details className="mt-3 text-xs sm:text-sm">
                  <summary className="cursor-pointer font-semibold text-accent min-h-9 inline-flex items-center">
                    {l('Exam strategy & trap tip', 'Chiến thuật làm bài & tránh bẫy')}
                  </summary>
                  <p className="text-muted mt-1.5 leading-relaxed">{localize(m.strategyTip)}</p>
                </details>
              </div>

              {m.questions.map(q => {
                const passage = q.passageId ? passageMap.get(q.passageId) : undefined
                const shouldRenderPassage = !!passage && !renderedPassages.has(passage.id)
                if (passage) renderedPassages.add(passage.id)

                const chosen = attempt.answers[q.id]
                const revealed = isQuestionRevealed(q.id)
                const flagged = !!attempt.flagged[q.id]
                const savedMistake = mistakes[mistakeKey(paper.id, section, q.id)]
                const hideChoicesRuby = isKanjiTarget && !revealed

                const evidenceQuotes = passage
                  ? m.questions
                      .filter(pq => pq.passageId === passage.id && isQuestionRevealed(pq.id) && pq.solution.evidenceQuote)
                      .map(pq => pq.solution.evidenceQuote!)
                  : []

                return (
                  <div key={q.id} className="space-y-4">
                    {shouldRenderPassage && passage && (
                      <PassageCard
                        passage={passage}
                        furiganaMap={furiganaMap}
                        showFurigana={showFurigana}
                        activeEvidenceQuotes={evidenceQuotes}
                      />
                    )}

                    <article
                      id={`exam-q-${q.id}`}
                      className="glass-card p-5 sm:p-6 min-w-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-surface">
                            Q{q.number}
                          </span>
                          {section !== 'listening' && (
                            <SpeakButton
                              text={q.promptJa.replace(/<\/?u>/g, '').replace(/＿/g, '')}
                              size="sm"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleBookmark(paper.id, section, q.id, m.format)}
                            aria-pressed={!!savedMistake?.bookmarked}
                            className={`min-h-9 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                              savedMistake?.bookmarked
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-structural text-muted hover:text-ink'
                            }`}
                          >
                            {savedMistake?.bookmarked ? l('Saved', 'Đã lưu') : l('Save', 'Lưu câu')}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFlag(paper.id, section, q.id)}
                            aria-pressed={flagged}
                            className={`min-h-9 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                              flagged
                                ? 'border-yellow bg-yellow/15 text-ink'
                                : 'border-structural text-muted hover:text-ink'
                            }`}
                          >
                            {flagged ? l('Flagged', 'Đã đánh dấu') : l('Flag', 'Đánh dấu')}
                          </button>
                          {mode === 'study' && !revealed && (
                            <button
                              type="button"
                              onClick={() => setRevealedIds(prev => ({ ...prev, [q.id]: true }))}
                              className="min-h-9 px-3 rounded-lg bg-accent/15 text-accent text-xs font-bold hover:bg-accent/25 cursor-pointer"
                            >
                              {l('Show solution', 'Xem giải')}
                            </button>
                          )}
                        </div>
                      </div>

                      {q.dialogue && q.dialogue.length > 0 && (
                        <ListeningPlayer
                          turns={q.dialogue}
                          visual={q.visual}
                          sceneNote={q.sceneNote}
                          mondaiFormat={m.format}
                          selectedIndex={chosen}
                          answerIndex={q.answerIndex}
                          revealed={revealed}
                          onSelectChoice={ci => handleChoose(q, ci)}
                          furiganaMap={furiganaMap}
                          showFurigana={showFurigana}
                          canRevealTranscript={revealed}
                        />
                      )}

                      <p lang="ja" className="jp text-lg sm:text-[19px] leading-[2.05] font-medium mb-4 break-words">
                        <ExamText
                          text={q.promptJa}
                          furiganaMap={furiganaMap}
                          showFurigana={showFurigana}
                          hideUnderlineFurigana={isKanjiTarget && !revealed}
                        />
                      </p>

                      <div className="grid gap-2 sm:grid-cols-2">
                        {q.choices.map((choice, ci) => {
                          const isSelected = chosen === ci
                          const isKey = ci === q.answerIndex
                          let btnCls = 'border-structural bg-card hover:bg-surface'
                          if (revealed) {
                            if (isKey) btnCls = 'border-green/60 bg-green/15 font-bold'
                            else if (isSelected) btnCls = 'border-red/60 bg-red/15'
                            else btnCls = 'border-structural bg-card/60 opacity-80'
                          } else if (isSelected) {
                            btnCls = 'border-accent bg-accent/15 ring-1 ring-accent font-semibold'
                          }

                          return (
                            <button
                              key={ci}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => handleChoose(q, ci)}
                              className={`min-h-12 px-3.5 py-2.5 rounded-xl border text-left flex items-start gap-2.5 cursor-pointer transition-colors ${btnCls}`}
                            >
                              <span className="font-mono text-xs font-bold text-muted mt-1 shrink-0">
                                {ci + 1}.
                              </span>
                              <span lang="ja" className="jp text-base leading-relaxed break-words">
                                <ExamText
                                  text={choice}
                                  furiganaMap={furiganaMap}
                                  showFurigana={showFurigana && !hideChoicesRuby}
                                />
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {revealed && (
                        <QuestionBreakdown
                          question={q}
                          selectedIndex={chosen}
                          furiganaMap={furiganaMap}
                          showFurigana={showFurigana}
                          onSelectKanji={onSelectKanji}
                        />
                      )}
                    </article>
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>

      {/* Submit Bar for Timed Mode */}
      {mode === 'test' && !attempt.submitted && (
        <div className="sticky bottom-3 z-20 glass-card p-4 flex flex-wrap items-center justify-between gap-3 border-accent/40 shadow-lg">
          <div className="text-sm">
            <span className="font-bold">
              {answeredCount} / {allSectionQuestions.length}
            </span>{' '}
            <span className="text-muted">{l('answered', 'câu đã chọn')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/exams?tab=mistakes"
              className="hidden sm:inline-flex min-h-11 px-3 rounded-xl border border-structural items-center text-xs font-semibold hover:bg-surface"
            >
              {l('Mistake Notebook', 'Sổ lỗi sai')}
            </Link>
            <button
              type="button"
              onClick={handleSubmitTest}
              className="min-h-11 px-5 rounded-xl bg-accent text-accent-fg text-sm font-bold cursor-pointer hover:opacity-90 active:scale-[0.98] transition-transform"
            >
              {l('Submit & grade section', 'Nộp bài & chấm điểm')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
