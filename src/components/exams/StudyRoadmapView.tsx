import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { StudyPlanData } from '@/types/exams'
import { getGrammarLinks } from '@/data/grammar-links'
import { useTranslation } from '@/lib/useTranslation'
import { attemptKey, useExamStore } from '@/store/exam-store'
import { aggregateFormatStats, estimateJlptN4Result, FORMAT_LABELS } from '@/lib/exam-scoring'
import { GrammarHoverLink } from '@/components/ui/GrammarHoverLink'

const grammarById = new Map(getGrammarLinks('all').map(g => [g.id, g]))

function daysUntilExam(examDate: string): number {
  const now = new Date()
  const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const [y, m, d] = examDate.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  return Math.round((target.getTime() - localToday.getTime()) / 86_400_000)
}

export function StudyRoadmapView({ plan }: { plan: StudyPlanData }) {
  const { localize } = useTranslation()
  const l = (en: string, vi: string) => localize({ en, vi })

  const completedTasks = useExamStore(s => s.completedTasks)
  const toggleTask = useExamStore(s => s.toggleTask)
  const history = useExamStore(s => s.history)
  const attempts = useExamStore(s => s.attempts)
  const mistakes = useExamStore(s => s.mistakes)

  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all')
  const [patternQuery, setPatternQuery] = useState('')

  const daysLeft = useMemo(() => daysUntilExam(plan.examDate), [plan.examDate])
  const formatStats = useMemo(() => aggregateFormatStats(history), [history])

  // Best/latest estimated JLPT score for 12/2025 & 07/2025
  const recentEst = useMemo(() => {
    for (const examId of ['jlpt-2025-12', 'jlpt-2025-07']) {
      const scores: Record<string, { correct: number; total: number }> = {}
      for (const sec of ['vocab', 'grammar', 'reading', 'listening'] as const) {
        const a = attempts[attemptKey(examId, sec)]
        if (a?.submitted && a.lastScore) scores[sec] = a.lastScore
      }
      if (Object.keys(scores).length > 0) {
        return { examId, ...estimateJlptN4Result(scores) }
      }
    }
    return null
  }, [attempts])

  const totalTasks = plan.days.reduce((acc, d) => acc + d.tasks.length, 0)
  const doneTasks = plan.days.reduce(
    (acc, d) => acc + d.tasks.filter(t => completedTasks[t.id]).length,
    0
  )

  const filteredPatterns = useMemo(() => {
    const q = patternQuery.trim().toLowerCase()
    return plan.highFrequencyPatterns.filter(p => {
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false
      if (!q) return true
      const g = grammarById.get(p.grammarId)
      return (
        p.grammarId.toLowerCase().includes(q) ||
        (g?.pattern.toLowerCase().includes(q) ?? false) ||
        (g ? localize(g.meaning).toLowerCase().includes(q) : false) ||
        localize(p.examTip).toLowerCase().includes(q)
      )
    })
  }, [plan.highFrequencyPatterns, priorityFilter, patternQuery, localize])

  const mistakeCount = Object.keys(mistakes).length

  return (
    <div className="space-y-8">
      {/* Hero Countdown & Diagnostic Summary */}
      <section className="glass-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent font-semibold">
              {l('Scientific Exam Sprint · Target 2026-12-06', 'Lộ trình ôn khoa học · Mục tiêu 06/12/2026')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {daysLeft > 0
                ? l(`${daysLeft} days to JLPT N4`, `Còn ${daysLeft} ngày đến kỳ thi JLPT N4`)
                : daysLeft === 0
                  ? l('Exam day: stay calm and trust your prep', 'Ngày thi JLPT N4: bình tĩnh và tự tin')
                  : l('JLPT N4 Review Sprint', 'Tổng ôn luyện đề JLPT N4')}
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              {l(
                'Follow the 4-stage scientific cycle: Diagnostic pre-test → Error Notebook recall → Spaced re-testing → Timed Mondai pacing.',
                'Áp dụng chu trình khoa học 4 bước: Thi chẩn đoán tìm lỗ hổng → Ghi sổ lỗi & truy hồi chủ động → Lặp lại ngắt quãng → Căn giờ chuẩn từng Mondai.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0 w-full sm:w-auto">
            <div className="rounded-xl border border-structural bg-surface px-3.5 py-2.5">
              <div className="font-mono text-lg font-bold tabular-nums">
                {doneTasks}/{totalTasks}
              </div>
              <div className="text-xs text-muted">{l('Sprint tasks', 'Nhiệm vụ xong')}</div>
            </div>
            <div className="rounded-xl border border-structural bg-surface px-3.5 py-2.5">
              <div className="font-mono text-lg font-bold tabular-nums">{mistakeCount}</div>
              <div className="text-xs text-muted">{l('Active mistakes', 'Câu trong sổ lỗi')}</div>
            </div>
            <div className="rounded-xl border border-structural bg-surface px-3.5 py-2.5 col-span-2 sm:col-span-1">
              <div className="font-mono text-lg font-bold tabular-nums">
                {recentEst?.totalScore !== null && recentEst?.totalScore !== undefined
                  ? `${recentEst.totalScore}/180`
                  : '90/180'}
              </div>
              <div className="text-xs text-muted">
                {recentEst?.totalScore !== null && recentEst?.totalScore !== undefined
                  ? l(`Est. (${recentEst.examId})`, `Ước lượng`)
                  : l('Pass mark', 'Mốc đỗ N4')}
              </div>
            </div>
          </div>
        </div>

        {/* Scientific Principles */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-3 border-t border-structural">
          {plan.scientificPrinciples.map((pr, idx) => (
            <div key={pr.id} className="rounded-xl border border-structural bg-card/60 p-3.5">
              <div className="font-mono text-[11px] font-bold text-accent mb-1">0{idx + 1}</div>
              <h3 className="text-sm font-bold leading-snug">{localize(pr.title)}</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">{localize(pr.summary)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* JLPT Scoring & Pacing + Weakness Diagnostic */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-card p-5 space-y-4">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted font-semibold">
              {l('Official N4 Pass Criteria & Time Budget', 'Thang điểm đỗ N4 & Phân bổ thời gian')}
            </span>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="rounded-xl border border-structural bg-surface p-3">
                <div className="text-[11px] text-muted">{l('Total Pass', 'Tổng đỗ')}</div>
                <div className="font-mono font-bold text-base mt-0.5">
                  ≥ {plan.scoringGuide.passTotal}/{plan.scoringGuide.totalMax}
                </div>
              </div>
              <div className="rounded-xl border border-structural bg-surface p-3">
                <div className="text-[11px] text-muted">{l('Lang + Read', 'KTNN + Đọc')}</div>
                <div className="font-mono font-bold text-base mt-0.5">
                  ≥ {plan.scoringGuide.passKnowledgeReading}/{plan.scoringGuide.knowledgeReadingMax}
                </div>
              </div>
              <div className="rounded-xl border border-structural bg-surface p-3">
                <div className="text-[11px] text-muted">{l('Listening', 'Nghe hiểu')}</div>
                <div className="font-mono font-bold text-base mt-0.5">
                  ≥ {plan.scoringGuide.passListening}/{plan.scoringGuide.listeningMax}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {plan.scoringGuide.sections.map(sec => (
              <div key={sec.code} className="rounded-xl border border-structural bg-card/70 px-3.5 py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 font-bold">
                  <span>{localize(sec.title)}</span>
                  <span className="font-mono text-accent">
                    {sec.officialMinutes}m · {sec.questionCount}q
                  </span>
                </div>
                <p className="text-muted mt-1 leading-relaxed">{localize(sec.pacingAdvice)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted font-semibold">
              {l('Mondai Weakness Diagnostic', 'Chẩn đoán điểm yếu theo Mondai')}
            </span>
            <Link
              to="/exams?tab=papers&exam=jlpt-2025-12&section=vocab"
              className="text-xs font-semibold text-accent hover:underline"
            >
              {l('Take 12/2025 Diagnostic →', 'Làm đề chẩn đoán 12/2025 →')}
            </Link>
          </div>

          {formatStats.length === 0 ? (
            <div className="rounded-xl border border-dashed border-structural p-5 text-sm text-muted leading-relaxed">
              {l(
                'No timed section submitted yet. Start with JLPT N4 · 12/2025 in Timed Mock mode to populate your personal weakness ranking across all 15 Mondai types.',
                'Chưa có lượt nộp bài nào. Hãy làm thử đề JLPT N4 · 12/2025 ở chế độ Thi thử để hệ thống phân tích độ chính xác của từng dạng Mondai từ yếu đến mạnh.'
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {formatStats.slice(0, 8).map(st => {
                const barCls =
                  st.accuracy >= 80 ? 'bg-green' : st.accuracy >= 60 ? 'bg-yellow' : 'bg-red'
                return (
                  <div key={st.format} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {localize(FORMAT_LABELS[st.format] ?? { vi: st.format, en: st.format })}
                      </span>
                      <span className="font-mono font-bold">
                        {st.correct}/{st.total} ({st.accuracy}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div className={`h-full rounded-full ${barCls}`} style={{ width: `${st.accuracy}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* 13-Day Scientific Revision Schedule */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent font-semibold">
              {l('Daily Action Plan', 'Kế hoạch từng ngày')}
            </span>
            <h3 className="text-xl font-bold mt-0.5">
              {l('Nov 23 → Dec 6, 2026 Revision Sprint', 'Lộ trình nước rút 23/11 → 06/12/2026')}
            </h3>
          </div>
          <span className="font-mono text-xs text-muted">
            {doneTasks} / {totalTasks} {l('tasks done', 'nhiệm vụ hoàn thành')}
          </span>
        </div>

        <div className="space-y-3">
          {plan.days.map(day => {
            const dayDone = day.tasks.filter(t => completedTasks[t.id]).length
            const allDone = dayDone === day.tasks.length && day.tasks.length > 0
            return (
              <details
                key={day.day}
                open={!allDone && day.day <= 3}
                className="glass-card p-4 sm:p-5 group"
              >
                <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-3 min-h-10">
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    <span
                      className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg ${
                        allDone ? 'bg-green/20 text-green' : 'bg-accent/15 text-accent'
                      }`}
                    >
                      {day.date} · D{day.day}
                    </span>
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                      {localize(day.phase)}
                    </span>
                    <span className="text-sm sm:text-base font-bold truncate">
                      {localize(day.title)}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted shrink-0">
                    {dayDone}/{day.tasks.length} ✓
                  </span>
                </summary>

                <div className="mt-4 pt-3 border-t border-structural space-y-2.5">
                  {day.tasks.map(task => {
                    const checked = !!completedTasks[task.id]
                    return (
                      <div
                        key={task.id}
                        className={`rounded-xl border px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          checked ? 'border-green/35 bg-green/5 opacity-80' : 'border-structural bg-card/60'
                        }`}
                      >
                        <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTask(task.id)}
                            className="mt-1 size-5 accent-[var(--tori-accent)] shrink-0 cursor-pointer"
                          />
                          <span className="min-w-0">
                            <span className={`block text-sm font-bold ${checked ? 'line-through text-muted' : ''}`}>
                              {localize(task.title)}
                            </span>
                            <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                              {localize(task.detail)}
                            </span>
                          </span>
                        </label>
                        <div className="flex items-center gap-2 shrink-0 pl-8 sm:pl-0">
                          <span className="font-mono text-[11px] text-muted">~{task.minutes}m</span>
                          {task.href && (
                            <Link
                              to={task.href}
                              className="min-h-9 px-3 rounded-lg border border-structural bg-surface hover:border-accent text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <span>{task.hrefLabel ? localize(task.hrefLabel) : l('Open', 'Mở')}</span>
                              <span>→</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </details>
            )
          })}
        </div>
      </section>

      {/* Cross-Exam High-Frequency Grammar Matrix */}
      <section className="glass-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent font-semibold">
              {l('Cross-Exam Frequency Matrix', 'Tần suất ngữ pháp qua các đề gần nhất')}
            </span>
            <h3 className="text-xl font-bold mt-0.5">
              {l('Top 25 High-Yield N4 Grammar Patterns', '25 mẫu ngữ pháp N4 trọng tâm ra nhiều nhất')}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={patternQuery}
              onChange={e => setPatternQuery(e.target.value)}
              placeholder={l('Search pattern or tip...', 'Tìm mẫu câu hoặc mẹo...')}
              className="min-h-10 px-3 rounded-xl border border-structural bg-card text-base sm:text-sm w-56"
            />
            {(['all', 'critical', 'high', 'medium'] as const).map(pr => (
              <button
                key={pr}
                type="button"
                onClick={() => setPriorityFilter(pr)}
                aria-pressed={priorityFilter === pr}
                className={`min-h-10 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                  priorityFilter === pr ? 'bg-accent text-accent-fg border-accent' : 'border-structural bg-card hover:bg-surface'
                }`}
              >
                {pr === 'all' ? l('All', 'Tất cả') : pr.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-structural">
          {filteredPatterns.map(item => {
            const g = grammarById.get(item.grammarId)
            if (!g) return null
            const prioCls =
              item.priority === 'critical'
                ? 'bg-red/15 text-red'
                : item.priority === 'high'
                  ? 'bg-yellow/20 text-ink'
                  : 'bg-surface text-muted'
            return (
              <div key={item.grammarId} className="py-3.5 flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <GrammarHoverLink
                      g={g}
                      className="jp text-base font-bold underline underline-offset-4 hover:text-accent"
                    >
                      {g.pattern} ↗
                    </GrammarHoverLink>
                    <span className={`font-mono text-[10.5px] font-bold uppercase px-2 py-0.5 rounded-full ${prioCls}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-muted">{localize(g.meaning)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.appearedIn.map(tag => (
                      <span
                        key={tag}
                        className="font-mono text-[10.5px] px-2 py-0.5 rounded-md border border-structural bg-surface text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">{localize(item.examTip)}</p>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
