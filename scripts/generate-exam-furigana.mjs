// Generates src/data/exams/exam-furigana.json: ruby segments for every
// Japanese string displayed in /exams (prompts, choices, passages, tables,
// star-order completed sentences, listening dialogue turns, and 07/2026 audit).
// Run after editing exam JSON files: node scripts/generate-exam-furigana.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const kuromoji = require('kuromoji')
const KANJI = /[一-鿿㐀-䶿々]/
const toHiragana = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
const stripUnderlineTags = s => s.replace(/<\/?u>/g, '')

const OVERRIDES = {
  '何時': 'なんじ',
  '何人': 'なんにん',
  '何回': 'なんかい',
  '何冊': 'なんさつ',
  '何度': 'なんど',
  '何': 'なに',
  '一人': 'ひとり',
  '二人': 'ふたり',
  '一日': 'いちにち',
  '今日': 'きょう',
  '明日': 'あした',
  '昨日': 'きのう',
  '一緒': 'いっしょ',
  '大人': 'おとな',
  '上手': 'じょうず',
  '下手': 'へた',
  '眼鏡': 'めがね',
  '果物': 'くだもの',
  '日本': 'にほん',
  '日本人': 'にほんじん',
  '和食': 'わしょく',
  '魚料理': 'さかなりょうり',
  '昼休み': 'ひるやすみ',
  '小学校': 'しょうがっこう',
  '先生': 'せんせい',
  '石山': 'いしやま',
  '川野': 'かわの',
  '春子': 'はるこ',
  '西山': 'にしやま',
  '北山': 'きたやま',
  '北糸市': 'きたいとし',
  '白田': 'しろた',
  '山西': 'やまにし',
  '川村': 'かわむら',
  '青山': 'あおやま',
  '高田': 'たかだ',
  '木村': 'きむら',
  '前山': 'まえやま',
  '北村': 'きたむら',
  '中田': 'なかた',
  '高村': 'たかむら',
  '山口': 'やまぐち',
  '風景': 'ふうけい',
  '景色': 'けしき',
  '台所': 'だいどころ',
  '西洋': 'せいよう',
  '生産': 'せいさん',
  '英語': 'えいご',
  '銀行': 'ぎんこう',
  '食堂': 'しょくどう',
  '地理': 'ちり',
  '方': 'かた',
  '行う': 'おこなう',
  '行い': 'おこない',
  '行っ': 'おこなっ',
  '行わ': 'おこなわ',
  '御飯': 'ごはん',
  '夕飯': 'ゆうはん',
  '近所': 'きんじょ',
  '交通': 'こうつう',
  '予定': 'よてい',
  '警察官': 'けいさつかん',
  '泊まれる': 'とまれる',
}

const CONTEXT_OVERRIDE = {
  '方': (t, prev, before, after) =>
    (prev && prev.pos === '動詞') || after.startsWith('は') || before.endsWith('この') ? 'かた' : null,
  '行っ': t => (t.basic_form === '行う' ? 'おこなっ' : null),
  '何': (t, prev, before, after) => (/^(?:時|人|回|冊|度|円|歳|枚|本|分)/.test(after) ? 'なん' : null),
  '明日': (t, prev, before, after) => (after.includes('この 店は 休み') ? 'あす' : 'あした'),
}

const STANDALONE = {
  '風': 'かぜ',
  '今': 'いま',
  '間': 'あいだ',
  '家': 'いえ',
  '他': 'ほか',
  '後': 'あと',
  '紙': 'かみ',
  '兄': 'あに',
  '林': 'はやし',
  '薬': 'くすり',
  '絵': 'え',
  '魚': 'さかな',
  '池': 'いけ',
  '席': 'せき',
  '犬': 'いぬ',
  '猫': 'ねこ',
  '歌': 'うた',
  '雪': 'ゆき',
  '頭': 'あたま',
  '肉': 'にく',
  '皿': 'さら',
}

const WEEKDAY = {
  '月': 'げつ',
  '火': 'か',
  '水': 'すい',
  '木': 'もく',
  '金': 'きん',
  '土': 'ど',
  '日': 'にち',
}

const COUNTER = {
  '月': () => 'がつ',
  '年': () => 'ねん',
  '時': () => 'じ',
  '円': () => 'えん',
  '歳': () => 'さい',
  '回': () => 'かい',
  '冊': () => 'さつ',
  '枚': () => 'まい',
  '台': () => 'だい',
  '番': () => 'ばん',
  '度': () => 'ど',
  '点': () => 'てん',
  '週': () => 'しゅう',
  '号': () => 'ごう',
  '個': () => 'こ',
  '日': n =>
    ({
      1: 'ついたち',
      2: 'ふつか',
      3: 'みっか',
      4: 'よっか',
      5: 'いつか',
      6: 'むいか',
      7: 'なのか',
      8: 'ようか',
      9: 'ここのか',
      10: 'とおか',
      14: 'じゅうよっか',
      20: 'はつか',
      24: 'にじゅうよっか',
    })[n] ?? 'にち',
  '人': n => (n === 1 ? 'ひとり' : n === 2 ? 'ふたり' : 'にん'),
  '分': n => ([1, 3, 4, 6, 8, 10].includes(n % 10 === 0 ? 10 : n % 10) ? 'ぷん' : 'ふん'),
  '本': n => ([1, 6, 8, 10].includes(n % 100) ? 'ぽん' : n % 10 === 3 ? 'ぼん' : 'ほん'),
  '階': n => (n % 10 === 3 ? 'がい' : 'かい'),
  '泊': n => ([1, 3, 6, 8, 10].includes(n % 10 === 0 ? 10 : n % 10) ? 'ぱく' : 'はく'),
  '杯': n => ([1, 6, 8, 10].includes(n % 100) ? 'ぱい' : n % 10 === 3 ? 'ばい' : 'はい'),
}

const COMPOUND_COUNTER = {
  '時間': 'じかん',
  '日間': 'にちかん',
  '週間': 'しゅうかん',
  '年間': 'ねんかん',
  '分間': 'ふんかん',
  'か月': 'かげつ',
  'ヶ月': 'かげつ',
  '月間': 'げつかん',
}

const CONTEXT_READING = [
  ['日', /(^|[^月0-9０-９])[1１]$/, /./, 'いちにち'],
  ['入り口', /./, /./, 'いりぐち'],
  ['入口', /./, /./, 'いりぐち'],
  ['出口', /./, /./, 'でぐち'],
  ['その間', /./, /./, 'そのあいだ'],
  ['今日中', /./, /./, 'きょうじゅう'],
  ['一晩', /./, /./, 'ひとばん'],
  ['開い', /教室を$/, /./, 'ひらい'],
]

const numberOf = s =>
  /^[0-9０-９,，]+$/.test(s)
    ? Number(s.replace(/[,，]/g, '').replace(/[０-９]/g, d => String(d.charCodeAt(0) - 0xff10)))
    : null

function align(surface, reading) {
  const runs = []
  for (const ch of surface) {
    const k = KANJI.test(ch)
    const last = runs[runs.length - 1]
    if (last && last.k === k) last.t += ch
    else runs.push({ t: ch, k })
  }
  const out = []
  let pos = 0
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i]
    if (!run.k) {
      const idx = reading.indexOf(toHiragana(run.t), pos)
      pos = idx === -1 ? pos : idx + run.t.length
      out.push(run.t)
      continue
    }
    const next = runs.slice(i + 1).find(r => !r.k)
    const tail =
      next && next === runs[runs.length - 1] && reading.endsWith(toHiragana(next.t))
        ? reading.length - next.t.length
        : -1
    const end = !next ? reading.length : tail > pos ? tail : reading.indexOf(toHiragana(next.t), pos + 1)
    if (end === -1) return [surface]
    out.push([run.t, reading.slice(pos, end)])
    pos = end
  }
  return out
}

function segments(tokenizer, text) {
  const out = []
  const push = seg => {
    if (typeof seg === 'string' && typeof out[out.length - 1] === 'string') out[out.length - 1] += seg
    else out.push(seg)
  }
  const tokens = tokenizer.tokenize(text)
  let offset = 0
  for (let i = 0; i < tokens.length; offset += tokens[i].surface_form.length, i++) {
    const t = tokens[i]
    const surface = t.surface_form
    if (!KANJI.test(surface)) {
      push(surface)
      continue
    }
    const before = text.slice(0, offset)
    const after = text.slice(offset + surface.length)
    const prev = tokens[i - 1]

    const ctx = CONTEXT_READING.find(([k, b, a]) => k === surface && b.test(before) && a.test(after))
    const n = prev ? numberOf(prev.surface_form) : null
    let reading = null
    if (ctx) reading = ctx[3]
    else if (n !== null && (COUNTER[surface] || COMPOUND_COUNTER[surface])) {
      reading = COMPOUND_COUNTER[surface] ?? COUNTER[surface](n)
    } else if (surface === '一' && tokens[i + 1]?.surface_form === '人') {
      push(['一人', 'ひとり'])
      offset += 1
      i++
      continue
    } else if (WEEKDAY[surface] && (/[〜～・（(／/]$/.test(before) || /^[〜～・）)／/]/.test(after))) {
      reading = WEEKDAY[surface]
    } else if (STANDALONE[surface]) {
      reading = surface === '他' && prev?.surface_form === 'その' ? 'た' : STANDALONE[surface]
    } else if (t.basic_form === '来る') {
      reading = ({ '未然形': 'こ', '連用形': 'き' }[t.conjugated_form] ?? 'く') + surface.slice(1)
    } else {
      reading =
        CONTEXT_OVERRIDE[surface]?.(t, prev, before, after) ??
        (surface in CONTEXT_OVERRIDE ? null : OVERRIDES[surface]) ??
        null
    }

    reading ??= t.reading && t.reading !== '*' ? toHiragana(t.reading) : null
    if (!reading) push(surface)
    else align(surface, reading).forEach(push)
  }
  return out
}

const examDir = resolve(process.cwd(), 'src/data/exams')
const paperFiles = ['jlpt-2025-12.json', 'jlpt-2025-07.json', 'vdj-2026-18.json', 'vdj-2026-16.json']
const texts = new Set()

const addText = raw => {
  if (!raw || typeof raw !== 'string') return
  const clean = stripUnderlineTags(raw)
  if (KANJI.test(clean)) texts.add(clean)
}

for (const fn of paperFiles) {
  const fullPath = resolve(examDir, fn)
  if (!existsSync(fullPath)) continue
  const paper = JSON.parse(readFileSync(fullPath, 'utf8'))
  for (const mondais of Object.values(paper.sections ?? {})) {
    for (const m of mondais ?? []) {
      addText(m.instructionJa)
      for (const p of m.passages ?? []) {
        addText(p.title)
        addText(p.intro)
        for (const para of p.paragraphs ?? []) addText(para)
        for (const tbl of p.tables ?? []) {
          addText(tbl.caption)
          for (const h of tbl.headers ?? []) addText(h)
          for (const row of tbl.rows ?? []) for (const cell of row) addText(cell)
        }
      }
      for (const q of m.questions ?? []) {
        addText(q.promptJa)
        for (const c of q.choices ?? []) addText(c)
        for (const turn of q.dialogue ?? []) addText(turn.jp)
        addText(q.solution?.starAssembly?.completedJa)
        addText(q.solution?.evidenceQuote)
      }
    }
  }
}

const auditPath = resolve(examDir, 'jlpt-2026-07-audit.json')
if (existsSync(auditPath)) {
  const audit = JSON.parse(readFileSync(auditPath, 'utf8'))
  for (const sec of audit.sections ?? []) {
    for (const it of sec.items ?? []) {
      addText(it.targetJa)
      addText(it.answerPattern)
      addText(it.usageExample)
    }
  }
}

kuromoji
  .builder({ dicPath: require.resolve('kuromoji/dict/base.dat.gz').replace(/base\.dat\.gz$/, '') })
  .build((err, tokenizer) => {
    if (err) throw err
    const map = {}
    for (const text of [...texts].sort()) {
      map[text] = segments(tokenizer, text)
    }
    writeFileSync(resolve(examDir, 'exam-furigana.json'), JSON.stringify(map))
    console.log(`Generated exam furigana for ${Object.keys(map).length} unique strings`)
  })
