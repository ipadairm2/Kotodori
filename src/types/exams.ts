export interface BilingualText {
  vi: string
  en: string
}

export type ExamSectionCode = 'vocab' | 'grammar' | 'reading' | 'listening'

export type MondaiFormat =
  | 'kanji_reading'
  | 'kanji_writing'
  | 'context'
  | 'paraphrase'
  | 'usage'
  | 'grammar_form'
  | 'star_order'
  | 'cloze'
  | 'reading_short'
  | 'reading_medium'
  | 'info_retrieval'
  | 'task_comprehension'
  | 'point_comprehension'
  | 'utterance_expression'
  | 'quick_response'

export interface ExamTable {
  caption?: string
  headers: string[]
  rows: string[][]
}

export interface ExamPassage {
  id: string
  title?: string
  author?: string
  intro?: string
  paragraphs: string[]
  tables?: ExamTable[]
  translation: BilingualText
}

export interface ListeningTurn {
  speaker: string
  jp: string
  vi: string
  en: string
}

export interface ExamKeyWord {
  kanji: string
  kana: string
  hanviet?: string
  meaning: BilingualText
}

export interface StarAssembly {
  /** Indices (0..3) of choices[] in left-to-right grammatical sentence order. */
  order: [number, number, number, number]
  /** Position in `order` (0..3) corresponding to the ★ slot; order[starSlot] === answerIndex. */
  starSlot: 0 | 1 | 2 | 3
  completedJa: string
}

export interface ExamQuestionSolution {
  translation: BilingualText
  explanation: BilingualText
  choiceNotes: BilingualText[]
  grammarIds?: string[]
  keyWords?: ExamKeyWord[]
  starAssembly?: StarAssembly
  evidenceQuote?: string
  trap?: BilingualText
}

export type ListeningDiagramId =
  | 'jlpt-2025-12-m1-q01'
  | 'jlpt-2025-07-m1-q01'
  | 'jlpt-2025-07-m1-q03'
  | 'jlpt-2025-07-m1-q04'
  | 'jlpt-2025-07-m1-q06'
  | 'jlpt-2025-07-m1-q08'

export interface ExamQuestionVisual {
  imageSrc?: string
  diagramId?: ListeningDiagramId
  layout: 'quad' | 'scene'
  alt: BilingualText
}

export interface ExamQuestion {
  id: string
  number: number
  promptJa: string
  choices: string[]
  /** Zero-based index into `choices`. */
  answerIndex: number
  passageId?: string
  /** True when the original listening question used a visual illustration (rendered as sceneNote). */
  hadImageInOriginal?: boolean
  visual?: ExamQuestionVisual
  sceneNote?: BilingualText
  dialogue?: ListeningTurn[]
  solution: ExamQuestionSolution
}

export interface ExamMondai {
  mondaiNumber: number
  format: MondaiFormat
  title: BilingualText
  instructionJa: string
  strategyTip: BilingualText
  passages: ExamPassage[]
  questions: ExamQuestion[]
}

export interface ExamSectionMeta {
  code: ExamSectionCode
  title: BilingualText
  recommendedMinutes: number
  questionCount: number
}

export interface ExamPaper {
  id: string
  kind: 'official_past' | 'vdj_mock'
  yearMonth: string
  title: BilingualText
  subtitle: BilingualText
  sourceNote: BilingualText
  referenceVideoUrl?: string
  totalQuestions: number
  sections: Partial<Record<ExamSectionCode, ExamMondai[]>>
  sectionMeta: ExamSectionMeta[]
}

export interface ExamManifestItem {
  id: string
  kind: 'official_past' | 'vdj_mock'
  yearMonth: string
  title: BilingualText
  subtitle: BilingualText
  sections: ExamSectionCode[]
  totalQuestions: number
  recommendedMinutes: number
  referenceVideoUrl?: string
}

export interface ExamAuditItem {
  id: string
  number: number
  mondaiNumber: number
  format: MondaiFormat
  targetJa: string
  kana?: string
  hanviet?: string
  meaning: BilingualText
  answerPattern?: string
  usageExample?: string
  recallPrompt: BilingualText
  takeaway: BilingualText
  trap?: BilingualText
  grammarIds?: string[]
}

export interface ExamAuditSection {
  code: ExamSectionCode
  title: BilingualText
  items: ExamAuditItem[]
}

export interface ExamAudit202607 {
  id: string
  examDate: string
  title: BilingualText
  disclaimer: BilingualText
  sources: string[]
  totalItems: number
  sections: ExamAuditSection[]
}

export interface StudyPlanTask {
  id: string
  title: BilingualText
  detail: BilingualText
  href?: string
  hrefLabel?: BilingualText
  minutes: number
}

export interface StudyPlanDay {
  day: number
  date: string
  phase: BilingualText
  title: BilingualText
  focusTags: string[]
  tasks: StudyPlanTask[]
}

export interface HighFreqPattern {
  grammarId: string
  appearedIn: string[]
  priority: 'critical' | 'high' | 'medium'
  examTip: BilingualText
}

export interface StudyPlanData {
  examDate: string
  scoringGuide: {
    totalMax: number
    passTotal: number
    knowledgeReadingMax: number
    passKnowledgeReading: number
    listeningMax: number
    passListening: number
    sections: Array<{
      code: ExamSectionCode
      title: BilingualText
      officialMinutes: number
      questionCount: number
      pacingAdvice: BilingualText
    }>
  }
  scientificPrinciples: Array<{
    id: string
    title: BilingualText
    summary: BilingualText
  }>
  days: StudyPlanDay[]
  highFrequencyPatterns: HighFreqPattern[]
}

export type ExamFuriganaSegment = string | [string, string]
export type ExamFuriganaMap = Record<string, ExamFuriganaSegment[]>
