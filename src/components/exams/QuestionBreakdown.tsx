import { Fragment } from 'react'
import type { ExamFuriganaMap, ExamQuestion } from '@/types/exams'
import { getGrammarLinks } from '@/data/grammar-links'
import { useTranslation } from '@/lib/useTranslation'
import { GrammarHoverLink } from '@/components/ui/GrammarHoverLink'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { ExamText } from './ExamText'

const grammarById = new Map(getGrammarLinks('all').map(g => [g.id, g]))
const KANJI_CHAR_RE = /[一-鿿㐀-䶿]/

interface QuestionBreakdownProps {
  question: ExamQuestion
  selectedIndex?: number
  furiganaMap?: ExamFuriganaMap | null
  showFurigana: boolean
  onSelectKanji?: (ch: string) => void
}

export function QuestionBreakdown({
  question,
  selectedIndex,
  furiganaMap,
  showFurigana,
  onSelectKanji,
}: QuestionBreakdownProps) {
  const { localize } = useTranslation()
  const l = (en: string, vi: string) => localize({ en, vi })
  const { solution, choices, answerIndex } = question
  const isAnswered = selectedIndex !== undefined
  const isCorrect = isAnswered && selectedIndex === answerIndex

  const speakTarget = (
    solution.starAssembly?.completedJa || question.promptJa.replace(/<\/?u>/g, '')
  ).replace(/＿/g, '')

  const grammarPoints = (solution.grammarIds ?? [])
    .map(id => grammarById.get(id))
    .filter((g): g is NonNullable<typeof g> => !!g)

  return (
    <div className="mt-4 rounded-xl border border-structural bg-surface/80 p-4 sm:p-5 space-y-4 text-sm leading-relaxed">
      {/* Status & natural translation */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-structural">
        <div className="flex flex-wrap items-center gap-2">
          {isAnswered ? (
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                isCorrect ? 'bg-green/20 text-green' : 'bg-red/15 text-red'
              }`}
            >
              {isCorrect ? l('Correct', 'Chính xác') : l('Incorrect', 'Chưa đúng')} · {l('Key', 'Đáp án')}: {answerIndex + 1}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-accent/15 text-accent">
              {l('Answer key', 'Đáp án')}: {answerIndex + 1}
            </span>
          )}
          <span className="jp font-semibold text-ink">{choices[answerIndex]}</span>
        </div>
        <SpeakButton text={speakTarget} size="sm" />
      </div>

      {/* Translation */}
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted block mb-1">
          {l('Full meaning', 'Dịch nghĩa câu')}
        </span>
        <p className="font-medium text-ink">{localize(solution.translation)}</p>
      </div>

      {/* Star assembly (Mondai 2 Grammar) */}
      {solution.starAssembly && (
        <div className="rounded-xl border border-structural bg-card p-3.5 space-y-2.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-accent font-semibold block">
            {l('Sentence order (★ slot highlighted)', 'Thứ tự ghép câu (vị trí ★)')}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {solution.starAssembly.order.map((choiceIdx, slot) => {
              const isStar = slot === solution.starAssembly?.starSlot
              return (
                <Fragment key={slot}>
                  <span
                    className={`jp px-2.5 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold ${
                      isStar
                        ? 'border-accent bg-accent/15 text-accent ring-1 ring-accent/40'
                        : 'border-structural bg-surface'
                    }`}
                  >
                    <span className="font-mono text-[11px] text-muted mr-1">{choiceIdx + 1}.</span>
                    {choices[choiceIdx]}
                    {isStar && <span className="ml-1 text-accent">★</span>}
                  </span>
                  {slot < 3 && <span className="text-muted text-xs">→</span>}
                </Fragment>
              )
            })}
          </div>
          <p lang="ja" className="jp text-base font-bold leading-loose pt-1">
            <ExamText
              text={solution.starAssembly.completedJa}
              furiganaMap={furiganaMap}
              showFurigana={showFurigana}
            />
          </p>
        </div>
      )}

      {/* Core explanation */}
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted block mb-1">
          {l('Why this is the answer', 'Giải thích trọng tâm')}
        </span>
        <p>{localize(solution.explanation)}</p>
      </div>

      {/* Evidence quote for Reading */}
      {solution.evidenceQuote && (
        <div className="border-l-2 border-green pl-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-green font-semibold block mb-0.5">
            {l('Passage evidence', 'Dẫn chứng trong bài')}
          </span>
          <p className="jp font-medium">「{solution.evidenceQuote}」</p>
        </div>
      )}

      {/* Per-choice analysis */}
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted block mb-2">
          {l('All options analyzed', 'Phân tích từng lựa chọn')}
        </span>
        <ul className="space-y-1.5">
          {choices.map((choice, idx) => {
            const isKey = idx === answerIndex
            const isUserWrong = isAnswered && selectedIndex === idx && !isKey
            return (
              <li
                key={idx}
                className={[
                  'rounded-lg px-3 py-2 border text-xs sm:text-sm leading-relaxed',
                  isKey
                    ? 'border-green/40 bg-green/10'
                    : isUserWrong
                      ? 'border-red/35 bg-red/10'
                      : 'border-structural bg-card/60',
                ].join(' ')}
              >
                <span className="font-mono font-bold mr-1.5">{idx + 1}.</span>
                <span className="jp font-semibold mr-2">{choice}</span>
                <span className="text-muted">{localize(solution.choiceNotes[idx])}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Exam trap callout */}
      {solution.trap && (
        <div className="rounded-lg border-l-3 border-yellow bg-yellow/10 px-3.5 py-2.5 text-xs sm:text-sm">
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] font-bold text-ink block mb-0.5">
            {l('Exam trap to avoid', 'Bẫy hay gặp')}
          </span>
          <p>{localize(solution.trap)}</p>
        </div>
      )}

      {/* Linked TORI Grammar & Key Kanji/Words */}
      {(grammarPoints.length > 0 || (solution.keyWords && solution.keyWords.length > 0)) && (
        <div className="pt-3 border-t border-structural flex flex-col gap-3">
          {grammarPoints.length > 0 && (
            <div className="border-l-2 border-blue pl-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted block mb-1.5">
                {l('Linked TORI grammar', 'Ngữ pháp liên quan trong TORI')}
              </span>
              <div className="flex flex-wrap gap-2">
                {grammarPoints.map(g => (
                  <GrammarHoverLink
                    key={g.id}
                    g={g}
                    className="jp inline-flex items-center min-h-9 px-2.5 py-1 rounded-lg border border-blue/35 bg-card text-xs font-bold hover:bg-blue/10"
                  >
                    {g.pattern} ↗
                  </GrammarHoverLink>
                ))}
              </div>
            </div>
          )}

          {solution.keyWords && solution.keyWords.length > 0 && (
            <div className="border-l-2 border-green pl-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted block mb-1.5">
                {l('Key words & Kanji (tap a kanji to inspect)', 'Từ khóa & Hán tự (bấm chữ Hán để xem nét)')}
              </span>
              <div className="flex flex-wrap gap-2">
                {solution.keyWords.map((kw, ki) => {
                  const kanjis = [...new Set([...kw.kanji].filter(ch => KANJI_CHAR_RE.test(ch)))]
                  return (
                    <div
                      key={ki}
                      className="rounded-lg border border-structural bg-card px-2.5 py-1.5 text-xs flex flex-wrap items-center gap-1.5"
                    >
                      <span className="jp font-bold text-sm">{kw.kanji}</span>
                      <span className="jp text-muted">({kw.kana})</span>
                      {kw.hanviet && (
                        <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-surface text-muted uppercase">
                          {kw.hanviet}
                        </span>
                      )}
                      <span className="text-muted">· {localize(kw.meaning)}</span>
                      {onSelectKanji && kanjis.map(ch => (
                        <button
                          key={ch}
                          type="button"
                          data-kanji={ch}
                          onClick={() => onSelectKanji(ch)}
                          title={l(`Inspect ${ch}`, `Xem chữ ${ch}`)}
                          className="jp ml-0.5 min-w-9 h-9 px-2 rounded-lg border border-structural bg-surface hover:border-accent hover:text-accent text-sm font-bold cursor-pointer transition-colors"
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
