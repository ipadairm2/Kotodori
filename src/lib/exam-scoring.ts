import type { BilingualText, ExamMondai, ExamSectionCode, MondaiFormat } from '@/types/exams'
import type { AttemptHistoryEntry } from '@/store/exam-store'

export const SECTION_LABELS: Record<ExamSectionCode, BilingualText> = {
  vocab: { vi: 'Từ vựng', en: 'Vocabulary' },
  grammar: { vi: 'Ngữ pháp', en: 'Grammar' },
  reading: { vi: 'Đọc hiểu', en: 'Reading' },
  listening: { vi: 'Nghe hiểu', en: 'Listening' },
}

export const FORMAT_LABELS: Record<MondaiFormat, BilingualText> = {
  kanji_reading: { vi: 'Đọc Kanji (M1)', en: 'Kanji Reading (M1)' },
  kanji_writing: { vi: 'Viết Kanji (M2)', en: 'Kanji Writing (M2)' },
  context: { vi: 'Ngữ cảnh từ vựng (M3)', en: 'Context Vocab (M3)' },
  paraphrase: { vi: 'Từ đồng nghĩa (M4)', en: 'Paraphrase (M4)' },
  usage: { vi: 'Cách dùng từ (M5)', en: 'Word Usage (M5)' },
  grammar_form: { vi: 'Chọn ngữ pháp (M1)', en: 'Grammar Form (M1)' },
  star_order: { vi: 'Sắp xếp câu ★ (M2)', en: 'Star Ordering ★ (M2)' },
  cloze: { vi: 'Ngữ pháp đoạn văn (M3)', en: 'Passage Grammar (M3)' },
  reading_short: { vi: 'Đọc hiểu đoạn ngắn (M4)', en: 'Short Reading (M4)' },
  reading_medium: { vi: 'Đọc hiểu đoạn trung (M5)', en: 'Medium Reading (M5)' },
  info_retrieval: { vi: 'Tìm kiếm thông tin (M6)', en: 'Info Retrieval (M6)' },
  task_comprehension: { vi: 'Nghe hiểu nhiệm vụ (M1)', en: 'Task Listening (M1)' },
  point_comprehension: { vi: 'Nghe hiểu điểm chính (M2)', en: 'Key-Point Listening (M2)' },
  utterance_expression: { vi: 'Nghe chọn lời nói (M3)', en: 'Utterance Listening (M3)' },
  quick_response: { vi: 'Phản xạ nhanh (M4)', en: 'Quick Response (M4)' },
}

export interface FormatStat {
  format: MondaiFormat
  correct: number
  total: number
  accuracy: number
}

export interface SectionScoreResult {
  correct: number
  total: number
  percent: number
  byFormat: Record<string, { correct: number; total: number }>
  wrongQuestions: Array<{ questionId: string; format: MondaiFormat }>
  correctQuestionIds: string[]
}

export function scoreSection(
  mondais: ExamMondai[],
  answers: Record<string, number>
): SectionScoreResult {
  let correct = 0
  let total = 0
  const byFormat: Record<string, { correct: number; total: number }> = {}
  const wrongQuestions: Array<{ questionId: string; format: MondaiFormat }> = []
  const correctQuestionIds: string[] = []

  for (const m of mondais) {
    const bucket = (byFormat[m.format] ??= { correct: 0, total: 0 })
    for (const q of m.questions) {
      total++
      bucket.total++
      const chosen = answers[q.id]
      if (chosen === q.answerIndex) {
        correct++
        bucket.correct++
        correctQuestionIds.push(q.id)
      } else {
        wrongQuestions.push({ questionId: q.id, format: m.format })
      }
    }
  }

  return {
    correct,
    total,
    percent: total > 0 ? Math.round((correct / total) * 100) : 0,
    byFormat,
    wrongQuestions,
    correctQuestionIds,
  }
}

export interface JlptN4Estimate {
  /** Scaled estimate out of 120 (Language Knowledge + Reading, pass threshold >= 38). */
  knowledgeReadingScore: number | null
  /** Scaled estimate out of 60 (Listening, pass threshold >= 19). */
  listeningScore: number | null
  /** Estimated total out of 180 (pass threshold >= 90). */
  totalScore: number | null
  passedKnowledgeReading: boolean | null
  passedListening: boolean | null
  passedTotal: boolean | null
  passed: boolean | null
}

/**
 * Computes an estimated JLPT N4 scaled score from completed section raw scores.
 * Official JLPT uses Item Response Theory (IRT) scaling, so this maps raw accuracy
 * proportionally to the 120 / 60 / 180 buckets as a study benchmark.
 */
export function estimateJlptN4Result(
  sectionScores: Partial<Record<ExamSectionCode, { correct: number; total: number }>>
): JlptN4Estimate {
  const v = sectionScores.vocab
  const g = sectionScores.grammar
  const r = sectionScores.reading
  const l = sectionScores.listening

  let krScore: number | null = null
  const krParts = [v, g, r].filter((p): p is { correct: number; total: number } => !!p && p.total > 0)
  if (krParts.length > 0) {
    // Weight the three written buckets proportionally when all are present, or average available ones
    const weights: Record<string, number> = { vocab: 40, grammar: 40, reading: 40 }
    let earned = 0
    let maxWeight = 0
    for (const [code, part] of [
      ['vocab', v],
      ['grammar', g],
      ['reading', r],
    ] as const) {
      if (part && part.total > 0) {
        earned += (part.correct / part.total) * weights[code]
        maxWeight += weights[code]
      }
    }
    if (maxWeight > 0) {
      krScore = Math.round((earned / maxWeight) * 120)
    }
  }

  const lScore = l && l.total > 0 ? Math.round((l.correct / l.total) * 60) : null
  const totalScore = krScore !== null && lScore !== null ? krScore + lScore : null

  const passedKR = krScore !== null ? krScore >= 38 : null
  const passedL = lScore !== null ? lScore >= 19 : null
  const passedTot = totalScore !== null ? totalScore >= 90 : null
  const passed =
    passedKR !== null && passedL !== null && passedTot !== null
      ? passedKR && passedL && passedTot
      : null

  return {
    knowledgeReadingScore: krScore,
    listeningScore: lScore,
    totalScore,
    passedKnowledgeReading: passedKR,
    passedListening: passedL,
    passedTotal: passedTot,
    passed,
  }
}

export function aggregateFormatStats(history: AttemptHistoryEntry[]): FormatStat[] {
  const agg = new Map<MondaiFormat, { correct: number; total: number }>()
  for (const entry of history) {
    for (const [fmt, counts] of Object.entries(entry.byFormat)) {
      const key = fmt as MondaiFormat
      const prev = agg.get(key) ?? { correct: 0, total: 0 }
      agg.set(key, {
        correct: prev.correct + counts.correct,
        total: prev.total + counts.total,
      })
    }
  }
  return [...agg.entries()]
    .filter(([, v]) => v.total > 0)
    .map(([format, v]) => ({
      format,
      correct: v.correct,
      total: v.total,
      accuracy: Math.round((v.correct / v.total) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
}
