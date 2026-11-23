// Strict integrity validator for all JLPT N4 exam datasets under src/data/exams/
// Usage: node scripts/validate-exams.mjs [--strict]
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const strict = process.argv.includes('--strict')
const root = process.cwd()
const examDir = resolve(root, 'src/data/exams')

const errors = []
const warnings = []
const err = msg => errors.push(msg)
const warn = msg => warnings.push(msg)

const n5Grammar = JSON.parse(readFileSync(resolve(root, 'src/data/n5/grammar.json'), 'utf8'))
const n4Grammar = JSON.parse(readFileSync(resolve(root, 'src/data/n4/grammar.json'), 'utf8'))
const validGrammarIds = new Set([...n5Grammar, ...n4Grammar].map(g => g.id))

const EXPECTED_COUNTS = {
  'jlpt-2025-12': { vocab: 28, grammar: 21, reading: 8, listening: 28, total: 85 },
  'jlpt-2025-07': { vocab: 28, grammar: 21, reading: 8, listening: 28, total: 85 },
  'vdj-2026-18': { vocab: 34, grammar: 25, total: 59 },
  'vdj-2026-16': { vocab: 34, grammar: 25, total: 59 },
}

const FORBIDDEN_SUBSTRINGS = [
  'TRUNG TÂM TIẾNG NHẬT',
  'Lịch live chữa đề',
  'Nhận tài liệu miễn phí',
  'Xem lại live trên',
  'firebasestorage.app',
  'TODO',
  'TBD',
  'FIXME',
]

function checkTextField(val, path) {
  if (typeof val !== 'string') {
    err(`${path}: expected string`)
    return
  }
  if (!val.trim()) {
    err(`${path}: empty string`)
    return
  }
  if (val.includes('--')) {
    err(`${path}: contains '--' double hyphen`)
  }
  for (const bad of FORBIDDEN_SUBSTRINGS) {
    if (val.includes(bad)) err(`${path}: contains forbidden substring '${bad}'`)
  }
  if (/https?:\/\//.test(val) && !path.endsWith('.referenceVideoUrl') && !path.endsWith('.sources')) {
    err(`${path}: unexpected URL inside text content: ${val.slice(0, 80)}`)
  }
  // Allow only <u> and </u>
  const strippedAllowed = val.replace(/<\/?u>/g, '')
  if (/<[a-zA-Z/][^>]*>/.test(strippedAllowed)) {
    err(`${path}: contains raw HTML tags other than <u>: ${val.slice(0, 80)}`)
  }
}

function checkBilingual(obj, path) {
  if (!obj || typeof obj !== 'object') {
    err(`${path}: missing bilingual object`)
    return
  }
  checkTextField(obj.vi, `${path}.vi`)
  checkTextField(obj.en, `${path}.en`)
}

const normWs = s => (s ?? '').replace(/<\/?u>/g, '').replace(/\s+/g, '')

// 1. Validate manifest.json
const manifestPath = resolve(examDir, 'manifest.json')
if (!existsSync(manifestPath)) err('Missing src/data/exams/manifest.json')
else {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!Array.isArray(manifest) || manifest.length !== 4) {
    err(`manifest.json: expected 4 entries, got ${manifest?.length}`)
  } else {
    for (const item of manifest) {
      checkBilingual(item.title, `manifest[${item.id}].title`)
      checkBilingual(item.subtitle, `manifest[${item.id}].subtitle`)
      const exp = EXPECTED_COUNTS[item.id]
      if (!exp || item.totalQuestions !== exp.total) {
        err(`manifest[${item.id}].totalQuestions mismatch (${item.totalQuestions} vs ${exp?.total})`)
      }
    }
  }
}

// 2. Validate each exam paper
for (const [paperId, expected] of Object.entries(EXPECTED_COUNTS)) {
  const fp = resolve(examDir, `${paperId}.json`)
  if (!existsSync(fp)) {
    err(`Missing exam file ${paperId}.json`)
    continue
  }
  const paper = JSON.parse(readFileSync(fp, 'utf8'))
  checkBilingual(paper.title, `${paperId}.title`)
  checkBilingual(paper.subtitle, `${paperId}.subtitle`)
  checkBilingual(paper.sourceNote, `${paperId}.sourceNote`)

  let totalQ = 0
  const seenIds = new Set()

  for (const [secCode, expectedSecCount] of Object.entries(expected)) {
    if (secCode === 'total') continue
    const mondais = paper.sections?.[secCode]
    if (!Array.isArray(mondais) || mondais.length === 0) {
      err(`${paperId}.sections.${secCode}: missing or empty`)
      continue
    }
    let secQ = 0
    for (const m of mondais) {
      checkTextField(m.instructionJa, `${paperId}.${secCode}.M${m.mondaiNumber}.instructionJa`)
      checkBilingual(m.title, `${paperId}.${secCode}.M${m.mondaiNumber}.title`)
      checkBilingual(m.strategyTip, `${paperId}.${secCode}.M${m.mondaiNumber}.strategyTip`)

      const passagesById = new Map()
      for (const p of m.passages ?? []) {
        passagesById.set(p.id, p)
        if (!Array.isArray(p.paragraphs)) err(`${paperId}.passage[${p.id}].paragraphs missing`)
        for (let pi = 0; pi < (p.paragraphs ?? []).length; pi++) {
          checkTextField(p.paragraphs[pi], `${paperId}.passage[${p.id}].paragraphs[${pi}]`)
        }
        checkBilingual(p.translation, `${paperId}.passage[${p.id}].translation`)
        for (const tbl of p.tables ?? []) {
          const cols = tbl.headers?.length || tbl.rows?.[0]?.length || 0
          for (let ri = 0; ri < (tbl.rows ?? []).length; ri++) {
            if (tbl.rows[ri].length !== cols) {
              err(`${paperId}.passage[${p.id}].table row ${ri} col count ${tbl.rows[ri].length} != ${cols}`)
            }
          }
        }
      }

      for (const q of m.questions ?? []) {
        secQ++
        totalQ++
        const qPath = `${paperId}.${secCode}.M${m.mondaiNumber}.${q.id}`
        if (!q.id || seenIds.has(q.id)) err(`${qPath}: missing or duplicate question id`)
        seenIds.add(q.id)

        checkTextField(q.promptJa, `${qPath}.promptJa`)
        if (!Array.isArray(q.choices) || q.choices.length < 3 || q.choices.length > 4) {
          err(`${qPath}: invalid choices length ${q.choices?.length}`)
        } else {
          q.choices.forEach((c, ci) => checkTextField(c, `${qPath}.choices[${ci}]`))
        }

        if (
          typeof q.answerIndex !== 'number' ||
          !Number.isInteger(q.answerIndex) ||
          q.answerIndex < 0 ||
          q.answerIndex >= (q.choices?.length ?? 0)
        ) {
          err(`${qPath}: invalid answerIndex ${q.answerIndex}`)
        }

        if (q.passageId && !passagesById.has(q.passageId)) {
          err(`${qPath}: passageId '${q.passageId}' not found in mondai.passages`)
        }

        if (secCode === 'listening') {
          if (!Array.isArray(q.dialogue) || q.dialogue.length === 0) {
            err(`${qPath}: listening question missing dialogue`)
          } else {
            q.dialogue.forEach((turn, ti) => {
              checkTextField(turn.speaker, `${qPath}.dialogue[${ti}].speaker`)
              checkTextField(turn.jp, `${qPath}.dialogue[${ti}].jp`)
              checkTextField(turn.vi, `${qPath}.dialogue[${ti}].vi`)
              checkTextField(turn.en, `${qPath}.dialogue[${ti}].en`)
            })
          }
          if (q.hadImageInOriginal && !q.sceneNote) {
            warn(`${qPath}: hadImageInOriginal=true but no sceneNote`)
          }
          if (q.sceneNote) checkBilingual(q.sceneNote, `${qPath}.sceneNote`)
        }

        const sol = q.solution
        if (!sol) {
          err(`${qPath}: missing solution`)
          continue
        }
        checkBilingual(sol.translation, `${qPath}.solution.translation`)
        checkBilingual(sol.explanation, `${qPath}.solution.explanation`)
        if (!Array.isArray(sol.choiceNotes) || sol.choiceNotes.length !== (q.choices?.length ?? 0)) {
          err(`${qPath}: choiceNotes length ${sol.choiceNotes?.length} != choices length ${q.choices?.length}`)
        } else {
          sol.choiceNotes.forEach((cn, ci) => checkBilingual(cn, `${qPath}.solution.choiceNotes[${ci}]`))
        }

        for (const gid of sol.grammarIds ?? []) {
          if (!validGrammarIds.has(gid)) err(`${qPath}: invalid grammarId '${gid}'`)
        }

        if (sol.trap) checkBilingual(sol.trap, `${qPath}.solution.trap`)

        if (m.format === 'star_order') {
          const sa = sol.starAssembly
          if (!sa) {
            err(`${qPath}: star_order missing starAssembly`)
          } else {
            const sorted = [...(sa.order ?? [])].sort((a, b) => a - b)
            if (JSON.stringify(sorted) !== '[0,1,2,3]') {
              err(`${qPath}: starAssembly.order is not a permutation of [0,1,2,3]: ${JSON.stringify(sa.order)}`)
            }
            if (![0, 1, 2, 3].includes(sa.starSlot)) {
              err(`${qPath}: starAssembly.starSlot invalid: ${sa.starSlot}`)
            } else if (sa.order?.[sa.starSlot] !== q.answerIndex) {
              err(`${qPath}: starAssembly.order[${sa.starSlot}] (${sa.order?.[sa.starSlot]}) !== answerIndex (${q.answerIndex})`)
            }
            checkTextField(sa.completedJa, `${qPath}.solution.starAssembly.completedJa`)
          }
        }

        if (secCode === 'reading') {
          const quote = sol.evidenceQuote
          if (!quote || !quote.trim()) {
            err(`${qPath}: reading question missing evidenceQuote`)
          } else if (q.passageId && passagesById.has(q.passageId)) {
            const p = passagesById.get(q.passageId)
            const haystack = normWs([
              p.title ?? '',
              p.intro ?? '',
              ...(p.paragraphs ?? []),
              ...((p.tables ?? []).flatMap(t => [...(t.headers ?? []), ...(t.rows ?? []).flat()])),
            ].join(''))
            if (!haystack.includes(normWs(quote))) {
              err(`${qPath}: evidenceQuote not found verbatim in passage ${q.passageId}: ${quote}`)
            }
          }
        }
      }
    }
    if (secQ !== expectedSecCount) {
      err(`${paperId}.sections.${secCode}: expected ${expectedSecCount} questions, got ${secQ}`)
    }
  }

  if (totalQ !== expected.total) {
    err(`${paperId}: expected ${expected.total} total questions, got ${totalQ}`)
  }
}

// 3. Validate jlpt-2026-07-audit.json
const auditPath = resolve(examDir, 'jlpt-2026-07-audit.json')
if (!existsSync(auditPath)) err('Missing jlpt-2026-07-audit.json')
else {
  const audit = JSON.parse(readFileSync(auditPath, 'utf8'))
  checkBilingual(audit.title, 'audit.title')
  checkBilingual(audit.disclaimer, 'audit.disclaimer')
  let totalAudit = 0
  const expAudit = { vocab: 28, grammar: 21, reading: 8, listening: 28 }
  for (const sec of audit.sections ?? []) {
    checkBilingual(sec.title, `audit.sections[${sec.code}].title`)
    const count = sec.items?.length ?? 0
    totalAudit += count
    if (count !== expAudit[sec.code]) {
      err(`audit.sections[${sec.code}]: expected ${expAudit[sec.code]} items, got ${count}`)
    }
    for (const it of sec.items ?? []) {
      checkTextField(it.targetJa, `audit.${sec.code}.${it.id}.targetJa`)
      checkBilingual(it.meaning, `audit.${sec.code}.${it.id}.meaning`)
      checkBilingual(it.recallPrompt, `audit.${sec.code}.${it.id}.recallPrompt`)
      checkBilingual(it.takeaway, `audit.${sec.code}.${it.id}.takeaway`)
      if (it.trap) checkBilingual(it.trap, `audit.${sec.code}.${it.id}.trap`)
      for (const gid of it.grammarIds ?? []) {
        if (!validGrammarIds.has(gid)) err(`audit.${sec.code}.${it.id}: invalid grammarId '${gid}'`)
      }
    }
  }
  if (totalAudit !== 85 || audit.totalItems !== 85) {
    err(`audit: expected 85 items total, got count=${totalAudit}, totalItems=${audit.totalItems}`)
  }
}

// 4. Validate study-plan.json
const planPath = resolve(examDir, 'study-plan.json')
if (!existsSync(planPath)) err('Missing study-plan.json')
else {
  const plan = JSON.parse(readFileSync(planPath, 'utf8'))
  if (plan.examDate !== '2026-12-06') err(`study-plan.examDate expected 2026-12-06, got ${plan.examDate}`)
  if (!Array.isArray(plan.days) || plan.days.length < 13) err(`study-plan.days expected >= 13 days, got ${plan.days?.length}`)
  for (const d of plan.days ?? []) {
    checkBilingual(d.phase, `study-plan.day${d.day}.phase`)
    checkBilingual(d.title, `study-plan.day${d.day}.title`)
    for (const t of d.tasks ?? []) {
      checkBilingual(t.title, `study-plan.day${d.day}.${t.id}.title`)
      checkBilingual(t.detail, `study-plan.day${d.day}.${t.id}.detail`)
    }
  }
  if (!Array.isArray(plan.highFrequencyPatterns) || plan.highFrequencyPatterns.length < 20) {
    err(`study-plan.highFrequencyPatterns expected >= 20 entries`)
  }
  for (const p of plan.highFrequencyPatterns ?? []) {
    if (!validGrammarIds.has(p.grammarId)) err(`study-plan.highFrequencyPatterns: invalid grammarId '${p.grammarId}'`)
    checkBilingual(p.examTip, `study-plan.highFreq[${p.grammarId}].examTip`)
  }
}

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`)
  for (const w of warnings.slice(0, 30)) console.log('  WARN:', w)
}

if (errors.length) {
  console.error(`Validation FAILED with ${errors.length} error(s):`)
  for (const e of errors.slice(0, 60)) console.error('  ERR:', e)
  if (errors.length > 60) console.error(`  ... and ${errors.length - 60} more errors`)
  process.exit(1)
}

if (strict && warnings.length) {
  console.error(`Strict validation FAILED due to ${warnings.length} warning(s)`)
  process.exit(1)
}

console.log('validate-exams: ALL CHECKS PASSED (0 errors, 0 warnings)')
