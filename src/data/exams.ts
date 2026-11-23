import type {
  ExamAudit202607,
  ExamFuriganaMap,
  ExamManifestItem,
  ExamPaper,
  StudyPlanData,
} from '@/types/exams'

let manifestCache: ExamManifestItem[] | null = null
let manifestPromise: Promise<ExamManifestItem[]> | null = null
export function loadExamManifest(): Promise<ExamManifestItem[]> {
  if (manifestCache) return Promise.resolve(manifestCache)
  manifestPromise ??= import('./exams/manifest.json')
    .then(m => (manifestCache = m.default as ExamManifestItem[]))
    .catch(err => {
      manifestPromise = null
      throw err
    })
  return manifestPromise
}

const paperCache = new Map<string, ExamPaper>()
const paperPromises = new Map<string, Promise<ExamPaper>>()
export function loadExamPaper(id: string): Promise<ExamPaper> {
  const cached = paperCache.get(id)
  if (cached) return Promise.resolve(cached)
  const pending = paperPromises.get(id)
  if (pending) return pending

  let loader: Promise<{ default: unknown }>
  switch (id) {
    case 'jlpt-2025-12':
      loader = import('./exams/jlpt-2025-12.json')
      break
    case 'jlpt-2025-07':
      loader = import('./exams/jlpt-2025-07.json')
      break
    case 'vdj-2026-18':
      loader = import('./exams/vdj-2026-18.json')
      break
    case 'vdj-2026-16':
      loader = import('./exams/vdj-2026-16.json')
      break
    default:
      return Promise.reject(new Error(`Unknown exam paper id: ${id}`))
  }

  const p = loader
    .then(m => {
      const paper = m.default as ExamPaper
      paperCache.set(id, paper)
      return paper
    })
    .catch(err => {
      paperPromises.delete(id)
      throw err
    })
  paperPromises.set(id, p)
  return p
}

let auditCache: ExamAudit202607 | null = null
let auditPromise: Promise<ExamAudit202607> | null = null
export function loadExamAudit(): Promise<ExamAudit202607> {
  if (auditCache) return Promise.resolve(auditCache)
  auditPromise ??= import('./exams/jlpt-2026-07-audit.json')
    .then(m => (auditCache = m.default as ExamAudit202607))
    .catch(err => {
      auditPromise = null
      throw err
    })
  return auditPromise
}

let planCache: StudyPlanData | null = null
let planPromise: Promise<StudyPlanData> | null = null
export function loadStudyPlan(): Promise<StudyPlanData> {
  if (planCache) return Promise.resolve(planCache)
  planPromise ??= import('./exams/study-plan.json')
    .then(m => (planCache = m.default as StudyPlanData))
    .catch(err => {
      planPromise = null
      throw err
    })
  return planPromise
}

let furiganaCache: ExamFuriganaMap | null = null
let furiganaPromise: Promise<ExamFuriganaMap> | null = null
export function loadExamFurigana(): Promise<ExamFuriganaMap> {
  if (furiganaCache) return Promise.resolve(furiganaCache)
  furiganaPromise ??= import('./exams/exam-furigana.json')
    .then(m => (furiganaCache = m.default as unknown as ExamFuriganaMap))
    .catch(err => {
      furiganaPromise = null
      throw err
    })
  return furiganaPromise
}
