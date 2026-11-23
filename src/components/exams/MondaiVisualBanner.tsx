import type { MondaiFormat } from '@/types/exams'
import { useTranslation } from '@/lib/useTranslation'

interface MondaiVisualBannerProps {
  format: MondaiFormat
  mondaiNumber: number
}

function FormatMiniSchematic({ format }: { format: MondaiFormat }) {
  if (format === 'task_comprehension') {
    return (
      <svg viewBox="0 0 96 64" className="w-full h-full block" aria-hidden="true">
        <rect width="96" height="64" fill="#ffffff" />
        <line x1="48" y1="0" x2="48" y2="64" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="0" y1="32" x2="96" y2="32" stroke="#cbd5e1" strokeWidth="1.5" />
        <text x="10" y="15" fontSize="9" fontWeight="700" fill="#334155">1</text>
        <text x="58" y="15" fontSize="9" fontWeight="700" fill="#007aff">2</text>
        <text x="10" y="47" fontSize="9" fontWeight="700" fill="#334155">3</text>
        <text x="58" y="47" fontSize="9" fontWeight="700" fill="#334155">4</text>
        <circle cx="28" cy="19" r="5" fill="none" stroke="#64748b" strokeWidth="1.4" />
        <rect x="69" y="12" width="12" height="12" rx="2" fill="#dbeafe" stroke="#007aff" strokeWidth="1.4" />
        <path d="M 21 53 L 34 53 M 24 47 L 31 50" stroke="#64748b" strokeWidth="1.4" />
        <circle cx="75" cy="49" r="5" fill="none" stroke="#64748b" strokeWidth="1.4" />
      </svg>
    )
  }

  if (format === 'point_comprehension') {
    return (
      <svg viewBox="0 0 96 64" className="w-full h-full block" aria-hidden="true">
        <rect width="96" height="64" fill="#ffffff" />
        {[12, 25, 38, 51].map((y, idx) => (
          <g key={y}>
            <text x="10" y={y + 3} fontSize="8.5" fontWeight="700" fill={idx === 1 ? '#007aff' : '#475569'}>
              {idx + 1}.
            </text>
            <rect
              x="23"
              y={y - 4}
              width={idx === 1 ? 58 : 50}
              height="6"
              rx="3"
              fill={idx === 1 ? '#bfdbfe' : '#e2e8f0'}
            />
          </g>
        ))}
      </svg>
    )
  }

  if (format === 'utterance_expression') {
    return (
      <svg viewBox="0 0 96 64" className="w-full h-full block" aria-hidden="true">
        <rect width="96" height="64" fill="#ffffff" />
        {/* Speaker B (arrow points here) */}
        <circle cx="28" cy="26" r="8" fill="#f1f5f9" stroke="#0f172a" strokeWidth="1.6" />
        <path d="M 16 52 Q 28 38 40 52" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.6" />
        {/* Listener */}
        <circle cx="68" cy="28" r="7.5" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
        <path d="M 57 52 Q 68 40 79 52" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
        {/* Bold Arrow pointing at speaker */}
        <path d="M 8 10 L 22 18 M 14 19 L 23 18 L 21 10" fill="none" stroke="#007aff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // quick_response (Audio-only, no picture)
  return (
    <svg viewBox="0 0 96 64" className="w-full h-full block" aria-hidden="true">
      <rect width="96" height="64" fill="#ffffff" />
      {/* Audio waveform bars */}
      {[14, 24, 18, 28, 16].map((h, i) => (
        <rect key={i} x={10 + i * 6} y={32 - h / 2} width="3" height={h} rx="1.5" fill="#007aff" />
      ))}
      {/* 3 spoken replies */}
      {[16, 32, 48].map((y, idx) => (
        <g key={y}>
          <circle cx="52" cy={y} r="6" fill={idx === 0 ? '#007aff' : '#e2e8f0'} />
          <text
            x="52"
            y={y + 3}
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill={idx === 0 ? '#ffffff' : '#334155'}
          >
            {idx + 1}
          </text>
          <rect x="63" y={y - 3} width="23" height="6" rx="3" fill="#cbd5e1" />
        </g>
      ))}
    </svg>
  )
}

export function MondaiVisualBanner({ format, mondaiNumber }: MondaiVisualBannerProps) {
  const { localize } = useTranslation()
  const l = (en: string, vi: string) => localize({ en, vi })

  const copy: Partial<Record<MondaiFormat, { badge: { en: string; vi: string }; guide: { en: string; vi: string } }>> = {
    task_comprehension: {
      badge: { en: '4-Option Picture / Task', vi: 'Chọn tranh / Hành động (4 đáp án)' },
      guide: {
        en: '1. Scan the 4 illustrations or printed items -> 2. Track what changes in the dialogue -> 3. Pick 1–4.',
        vi: '1. Nhìn nhanh 4 hình hoặc chữ trên đề -> 2. Bắt sự thay đổi cuối hội thoại -> 3. Chọn 1–4.',
      },
    },
    point_comprehension: {
      badge: { en: 'Printed Choices · Detail Hunt', vi: 'Đáp án chữ · Nghe ý chính' },
      guide: {
        en: '1. Preview all 4 printed choices first -> 2. Listen for exact reasons, times, or exclusions -> 3. Pick 1–4.',
        vi: '1. Đọc trước 4 lựa chọn chữ -> 2. Nghe kỹ lý do, thời điểm hoặc yếu tố loại trừ -> 3. Chọn 1–4.',
      },
    },
    utterance_expression: {
      badge: { en: 'Scene Picture + Arrow (→)', vi: 'Tranh tình huống + Mũi tên (→)' },
      guide: {
        en: '1. Look closely at who has the arrow (→) -> 2. Listen to all 3 spoken phrases -> 3. Pick the natural response (1–3).',
        vi: '1. Xem kỹ mũi tên (→) chỉ vào ai -> 2. Nghe cả 3 câu thoại đọc nối tiếp -> 3. Chọn câu tự nhiên nhất (1–3).',
      },
    },
    quick_response: {
      badge: { en: 'Audio-Only · No Picture (絵なし)', vi: 'Chỉ nghe âm thanh · Không tranh (絵なし)' },
      guide: {
        en: 'Pure audio drill: 1 short prompt followed immediately by 3 spoken replies. Listen closely and pick 1, 2, or 3.',
        vi: 'Đề không có tranh hay chữ: nghe 1 câu hỏi ngắn rồi 3 câu đáp lại liên tiếp, chọn ngay 1, 2 hoặc 3.',
      },
    },
  }

  const info = copy[format] ?? copy.task_comprehension!

  return (
    <div className="mt-3 rounded-xl border border-structural bg-surface/65 p-3 flex items-center gap-3.5">
      <div className="w-24 h-16 shrink-0 rounded-lg border border-black/10 overflow-hidden bg-white shadow-xs">
        <FormatMiniSchematic format={format} />
      </div>
      <div className="min-w-0 space-y-1">
        <div className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-accent font-semibold">
          Mondai {mondaiNumber} · {localize(info.badge)}
        </div>
        <p className="text-xs text-muted leading-relaxed">
          {l(info.guide.en, info.guide.vi)}
        </p>
      </div>
    </div>
  )
}
