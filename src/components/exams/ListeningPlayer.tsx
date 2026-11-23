import { useId, useState, useSyncExternalStore } from 'react'
import type { BilingualText, ExamFuriganaMap, ListeningTurn } from '@/types/exams'
import { useTranslation } from '@/lib/useTranslation'
import {
  cancelSpeech,
  getActiveSpeechId,
  isSpeechSupported,
  speak,
  speakSequence,
  subscribeSpeech,
} from '@/lib/speech'
import { ExamText } from './ExamText'

interface ListeningPlayerProps {
  turns: ListeningTurn[]
  sceneNote?: BilingualText
  furiganaMap?: ExamFuriganaMap | null
  showFurigana: boolean
  canRevealTranscript: boolean
}

const RATES = [0.8, 0.9, 1.0] as const

export function ListeningPlayer({
  turns,
  sceneNote,
  furiganaMap,
  showFurigana,
  canRevealTranscript,
}: ListeningPlayerProps) {
  const { localize } = useTranslation()
  const l = (en: string, vi: string) => localize({ en, vi })
  const seqId = useId()
  const activeSpeechId = useSyncExternalStore(subscribeSpeech, getActiveSpeechId)
  const isPlayingAll = activeSpeechId === seqId
  const [activeTurn, setActiveTurn] = useState<number | null>(null)
  const [rate, setRate] = useState<number>(0.9)
  const [showScript, setShowScript] = useState(false)

  const supported = isSpeechSupported()

  const handlePlayAll = (startIdx = 0) => {
    if (!supported || turns.length === 0) return
    if (isPlayingAll && startIdx === 0) {
      cancelSpeech()
      setActiveTurn(null)
      return
    }
    speakSequence(
      turns.map(t => ({ text: t.jp })),
      {
        id: seqId,
        rate,
        startIndex: startIdx,
        onTurn: idx => setActiveTurn(idx),
        onDone: () => setActiveTurn(null),
      }
    )
  }

  const handlePlaySingle = (idx: number) => {
    if (!supported) return
    setActiveTurn(idx)
    speak(turns[idx].jp, { id: `${seqId}-turn-${idx}`, rate })
  }

  return (
    <div className="rounded-xl border border-structural bg-surface/70 p-4 mb-4 space-y-3">
      {sceneNote && (
        <div className="rounded-lg border border-structural bg-card/80 px-3 py-2 text-xs text-muted leading-relaxed">
          <span className="font-mono uppercase tracking-[0.06em] text-accent font-semibold mr-2">
            {l('Scene context', 'Bối cảnh tranh')}
          </span>
          {localize(sceneNote)}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!supported || turns.length === 0}
            onClick={() => handlePlayAll(0)}
            className={`min-h-11 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-45 ${
              isPlayingAll
                ? 'bg-red text-white'
                : 'bg-accent text-accent-fg hover:opacity-90'
            }`}
          >
            <span>{isPlayingAll ? '■' : '▶'}</span>
            <span>
              {isPlayingAll
                ? l('Stop audio', 'Dừng phát')
                : l('Play dialogue (TTS)', 'Nghe hội thoại (TTS)')}
            </span>
          </button>

          <div className="flex items-center rounded-xl border border-structural bg-card p-1" role="group" aria-label={l('Playback speed', 'Tốc độ đọc')}>
            {RATES.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRate(r)}
                aria-pressed={rate === r}
                className={`min-h-9 px-2.5 rounded-lg font-mono text-xs font-medium cursor-pointer transition-colors ${
                  rate === r ? 'bg-accent text-accent-fg' : 'text-muted hover:text-ink'
                }`}
              >
                {r.toFixed(1)}x
              </button>
            ))}
          </div>
        </div>

        {canRevealTranscript ? (
          <button
            type="button"
            onClick={() => setShowScript(v => !v)}
            aria-expanded={showScript}
            className="min-h-11 px-3 rounded-xl border border-structural bg-card text-xs font-semibold hover:bg-surface cursor-pointer"
          >
            {showScript ? l('Hide transcript', 'Ẩn lời thoại') : l('Show transcript & translation', 'Xem lời thoại & dịch')}
          </button>
        ) : (
          <span className="text-xs text-muted">
            {l('Transcript unlocks after you check or submit', 'Lời thoại mở sau khi xem đáp án hoặc nộp bài')}
          </span>
        )}
      </div>

      {!supported && (
        <p className="text-xs text-muted">
          {l('Browser speech synthesis is unavailable on this device; review the transcript after answering.', 'Thiết bị chưa hỗ trợ phát âm trình duyệt; hãy xem lời thoại sau khi chọn đáp án.')}
        </p>
      )}

      {isPlayingAll && activeTurn !== null && (
        <p className="font-mono text-xs text-accent" role="status">
          {l(`Speaking turn ${activeTurn + 1} / ${turns.length}`, `Đang đọc lượt ${activeTurn + 1} / ${turns.length}`)} · {turns[activeTurn]?.speaker}
        </p>
      )}

      {canRevealTranscript && showScript && (
        <div className="space-y-2 pt-2 border-t border-structural">
          {turns.map((turn, idx) => {
            const isActive = activeTurn === idx && (isPlayingAll || activeSpeechId === `${seqId}-turn-${idx}`)
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handlePlaySingle(idx)}
                className={`w-full text-left rounded-xl px-3 py-2.5 border transition-colors cursor-pointer ${
                  isActive ? 'border-accent bg-accent/10' : 'border-structural bg-card/70 hover:bg-surface'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-accent">
                    {turn.speaker}
                  </span>
                  <span className="text-[11px] text-muted">▶ {l('Replay line', 'Nghe câu')}</span>
                </div>
                <p lang="ja" className="jp text-sm sm:text-base leading-relaxed font-medium">
                  <ExamText text={turn.jp} furiganaMap={furiganaMap} showFurigana={showFurigana} />
                </p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{localize({ vi: turn.vi, en: turn.en })}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
