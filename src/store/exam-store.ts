import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExamSectionCode, MondaiFormat } from '@/types/exams'

export interface SectionAttemptState {
  answers: Record<string, number>
  flagged: Record<string, true>
  submitted: boolean
  elapsedSeconds: number
  lastScore?: {
    correct: number
    total: number
    submittedAt: number
  }
}

export interface AttemptHistoryEntry {
  examId: string
  section: ExamSectionCode
  correct: number
  total: number
  byFormat: Record<string, { correct: number; total: number }>
  completedAt: number
}

export interface MistakeEntry {
  examId: string
  section: ExamSectionCode
  questionId: string
  format: MondaiFormat
  wrongCount: number
  correctStreak: number
  bookmarked?: boolean
  updatedAt: number
}

export function attemptKey(examId: string, section: ExamSectionCode): string {
  return `${examId}:${section}`
}

export function mistakeKey(examId: string, section: ExamSectionCode, questionId: string): string {
  return `${examId}:${section}:${questionId}`
}

const EMPTY_ATTEMPT: SectionAttemptState = {
  answers: {},
  flagged: {},
  submitted: false,
  elapsedSeconds: 0,
}

interface ExamStoreState {
  attempts: Record<string, SectionAttemptState>
  history: AttemptHistoryEntry[]
  mistakes: Record<string, MistakeEntry>
  completedTasks: Record<string, true>
  auditStatus: Record<string, 'known' | 'review'>
  showFurigana: boolean

  setAnswer: (examId: string, section: ExamSectionCode, questionId: string, choiceIndex: number) => void
  toggleFlag: (examId: string, section: ExamSectionCode, questionId: string) => void
  setElapsedSeconds: (examId: string, section: ExamSectionCode, seconds: number) => void
  submitSection: (
    examId: string,
    section: ExamSectionCode,
    result: {
      correct: number
      total: number
      byFormat: Record<string, { correct: number; total: number }>
      wrongQuestions: Array<{ questionId: string; format: MondaiFormat }>
      correctQuestionIds: string[]
    }
  ) => void
  resetSectionAttempt: (examId: string, section: ExamSectionCode) => void
  markMistakeResult: (key: string, isCorrect: boolean) => void
  toggleBookmark: (examId: string, section: ExamSectionCode, questionId: string, format: MondaiFormat) => void
  clearMistake: (key: string) => void
  toggleTask: (taskId: string) => void
  setAuditStatus: (itemId: string, status: 'known' | 'review' | null) => void
  setShowFurigana: (show: boolean) => void
  reset: () => void
}

export const useExamStore = create<ExamStoreState>()(
  persist(
    (set, get) => ({
      attempts: {},
      history: [],
      mistakes: {},
      completedTasks: {},
      auditStatus: {},
      showFurigana: true,

      setAnswer: (examId, section, questionId, choiceIndex) => {
        const key = attemptKey(examId, section)
        const prev = get().attempts[key] ?? EMPTY_ATTEMPT
        set({
          attempts: {
            ...get().attempts,
            [key]: {
              ...prev,
              answers: { ...prev.answers, [questionId]: choiceIndex },
            },
          },
        })
      },

      toggleFlag: (examId, section, questionId) => {
        const key = attemptKey(examId, section)
        const prev = get().attempts[key] ?? EMPTY_ATTEMPT
        const nextFlagged = { ...prev.flagged }
        if (nextFlagged[questionId]) delete nextFlagged[questionId]
        else nextFlagged[questionId] = true
        set({
          attempts: {
            ...get().attempts,
            [key]: { ...prev, flagged: nextFlagged },
          },
        })
      },

      setElapsedSeconds: (examId, section, seconds) => {
        const key = attemptKey(examId, section)
        const prev = get().attempts[key] ?? EMPTY_ATTEMPT
        set({
          attempts: {
            ...get().attempts,
            [key]: { ...prev, elapsedSeconds: seconds },
          },
        })
      },

      submitSection: (examId, section, result) => {
        const now = Date.now()
        const key = attemptKey(examId, section)
        const prev = get().attempts[key] ?? EMPTY_ATTEMPT
        const nextMistakes = { ...get().mistakes }

        for (const w of result.wrongQuestions) {
          const mk = mistakeKey(examId, section, w.questionId)
          const existing = nextMistakes[mk]
          nextMistakes[mk] = {
            examId,
            section,
            questionId: w.questionId,
            format: w.format,
            wrongCount: (existing?.wrongCount ?? 0) + 1,
            correctStreak: 0,
            bookmarked: existing?.bookmarked,
            updatedAt: now,
          }
        }

        for (const qid of result.correctQuestionIds) {
          const mk = mistakeKey(examId, section, qid)
          const existing = nextMistakes[mk]
          if (existing) {
            const nextStreak = existing.correctStreak + 1
            if (nextStreak >= 2 && !existing.bookmarked) {
              delete nextMistakes[mk]
            } else {
              nextMistakes[mk] = { ...existing, correctStreak: nextStreak, updatedAt: now }
            }
          }
        }

        set({
          attempts: {
            ...get().attempts,
            [key]: {
              ...prev,
              submitted: true,
              lastScore: {
                correct: result.correct,
                total: result.total,
                submittedAt: now,
              },
            },
          },
          history: [
            ...get().history.slice(-49),
            {
              examId,
              section,
              correct: result.correct,
              total: result.total,
              byFormat: result.byFormat,
              completedAt: now,
            },
          ],
          mistakes: nextMistakes,
        })
      },

      resetSectionAttempt: (examId, section) => {
        const key = attemptKey(examId, section)
        const next = { ...get().attempts }
        delete next[key]
        set({ attempts: next })
      },

      markMistakeResult: (key, isCorrect) => {
        const existing = get().mistakes[key]
        if (!existing) return
        const next = { ...get().mistakes }
        const now = Date.now()
        if (isCorrect) {
          const streak = existing.correctStreak + 1
          if (streak >= 2 && !existing.bookmarked) {
            delete next[key]
          } else {
            next[key] = { ...existing, correctStreak: streak, updatedAt: now }
          }
        } else {
          next[key] = {
            ...existing,
            wrongCount: existing.wrongCount + 1,
            correctStreak: 0,
            updatedAt: now,
          }
        }
        set({ mistakes: next })
      },

      toggleBookmark: (examId, section, questionId, format) => {
        const mk = mistakeKey(examId, section, questionId)
        const next = { ...get().mistakes }
        const existing = next[mk]
        const now = Date.now()
        if (!existing) {
          next[mk] = {
            examId,
            section,
            questionId,
            format,
            wrongCount: 0,
            correctStreak: 0,
            bookmarked: true,
            updatedAt: now,
          }
        } else if (existing.bookmarked && existing.wrongCount === 0) {
          delete next[mk]
        } else {
          next[mk] = { ...existing, bookmarked: !existing.bookmarked, updatedAt: now }
        }
        set({ mistakes: next })
      },

      clearMistake: key => {
        const next = { ...get().mistakes }
        delete next[key]
        set({ mistakes: next })
      },

      toggleTask: taskId => {
        const next = { ...get().completedTasks }
        if (next[taskId]) delete next[taskId]
        else next[taskId] = true
        set({ completedTasks: next })
      },

      setAuditStatus: (itemId, status) => {
        const next = { ...get().auditStatus }
        if (status === null) delete next[itemId]
        else next[itemId] = status
        set({ auditStatus: next })
      },

      setShowFurigana: show => set({ showFurigana: show }),

      reset: () =>
        set({
          attempts: {},
          history: [],
          mistakes: {},
          completedTasks: {},
          auditStatus: {},
          showFurigana: true,
        }),
    }),
    { name: 'tori-exams' }
  )
)
