import type { ListeningDiagramId } from '@/types/exams'

interface ListeningDiagramProps {
  diagramId: ListeningDiagramId
  selectedIndex?: number
  answerIndex?: number
  revealed?: boolean
  onSelectIndex?: (index: number) => void
}

function QuadCellOverlay({
  x,
  y,
  w,
  h,
  idx,
  selectedIndex,
  answerIndex,
  revealed,
  onSelectIndex,
}: {
  x: number
  y: number
  w: number
  h: number
  idx: number
  selectedIndex?: number
  answerIndex?: number
  revealed?: boolean
  onSelectIndex?: (index: number) => void
}) {
  const isSelected = selectedIndex === idx
  const isKey = answerIndex === idx
  let stroke = 'transparent'
  let fill = 'transparent'
  let badgeFill = '#ffffff'
  let badgeStroke = '#334155'
  let badgeText = '#0f172a'

  if (revealed) {
    if (isKey) {
      stroke = '#16a34a'
      fill = 'rgba(22, 163, 74, 0.08)'
      badgeFill = '#16a34a'
      badgeStroke = '#15803d'
      badgeText = '#ffffff'
    } else if (isSelected) {
      stroke = '#dc2626'
      fill = 'rgba(220, 38, 38, 0.08)'
      badgeFill = '#dc2626'
      badgeStroke = '#b91c1c'
      badgeText = '#ffffff'
    }
  } else if (isSelected) {
    stroke = '#007aff'
    fill = 'rgba(0, 122, 255, 0.08)'
    badgeFill = '#007aff'
    badgeStroke = '#0062cc'
    badgeText = '#ffffff'
  }

  return (
    <g
      onClick={onSelectIndex ? () => onSelectIndex(idx) : undefined}
      style={onSelectIndex ? { cursor: 'pointer' } : undefined}
    >
      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={h - 4}
        rx={4}
        fill={fill}
        stroke={stroke}
        strokeWidth={3.5}
      />
      <rect
        x={x + 12}
        y={y + 12}
        width={30}
        height={30}
        rx={8}
        fill={badgeFill}
        stroke={badgeStroke}
        strokeWidth={1.75}
      />
      <text
        x={x + 27}
        y={y + 33}
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fontWeight="700"
        fontSize="16"
        fill={badgeText}
      >
        {idx + 1}
      </text>
    </g>
  )
}

function CoatIllustration({
  cx,
  cy,
  coatFill,
  lapelFill,
  buttonFill,
  buttonStroke,
}: {
  cx: number
  cy: number
  coatFill: string
  lapelFill: string
  buttonFill: string
  buttonStroke: string
}) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Coat body + sleeves */}
      <path
        d="M -28 -64 L -56 -48 L -78 24 L -56 32 L -40 -14 L -44 74 L 44 74 L 40 -14 L 56 32 L 78 24 L 56 -48 L 28 -64 Q 0 -52 -28 -64 Z"
        fill={coatFill}
        stroke="#1e293b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Neck opening */}
      <path
        d="M -22 -64 Q 0 -42 22 -64"
        fill="#e2e8f0"
        stroke="#1e293b"
        strokeWidth="2"
      />
      {/* Left & Right lapels */}
      <path
        d="M -22 -64 L -28 -36 L -8 -18 L 0 -30 Z"
        fill={lapelFill}
        stroke="#1e293b"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M 22 -64 L 28 -36 L 8 -18 L 0 -30 Z"
        fill={lapelFill}
        stroke="#1e293b"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Center placket line */}
      <line x1="0" y1="-30" x2="0" y2="74" stroke="#1e293b" strokeWidth="1.75" />
      {/* Pocket flaps */}
      <rect x="-34" y="20" width="20" height="7" rx="2" fill={lapelFill} stroke="#1e293b" strokeWidth="1.6" />
      <rect x="14" y="20" width="20" height="7" rx="2" fill={lapelFill} stroke="#1e293b" strokeWidth="1.6" />
      {/* 4 prominent buttons down center front */}
      {[-12, 8, 28, 48].map(by => (
        <circle
          key={by}
          cx="7"
          cy={by}
          r="5.2"
          fill={buttonFill}
          stroke={buttonStroke}
          strokeWidth="2"
        />
      ))}
    </g>
  )
}

function PillComboIllustration({
  cx,
  cy,
  largeCount,
  smallCount,
}: {
  cx: number
  cy: number
  largeCount: 1 | 2
  smallCount: 1 | 2
}) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Soft medicine tray */}
      <ellipse cx="0" cy="48" rx="92" ry="18" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      {/* Large oval tablets on left */}
      <g transform="translate(-44, 0)">
        {Array.from({ length: largeCount }).map((_, i) => {
          const yOff = largeCount === 2 ? (i === 0 ? -16 : 24) : 4
          return (
            <g key={i} transform={`translate(0, ${yOff})`}>
              <rect
                x="-34"
                y="-15"
                width="68"
                height="30"
                rx="15"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.6"
              />
              <line x1="0" y1="-14" x2="0" y2="14" stroke="#475569" strokeWidth="1.6" strokeDasharray="3 2" />
            </g>
          )
        })}
      </g>
      {/* Small round fever pills on right */}
      <g transform="translate(50, 0)">
        {Array.from({ length: smallCount }).map((_, i) => {
          const xOff = smallCount === 2 ? (i === 0 ? -16 : 18) : 0
          return (
            <circle
              key={i}
              cx={xOff}
              cy="10"
              r="11.5"
              fill="#e2e8f0"
              stroke="#0f172a"
              strokeWidth="2.4"
            />
          )
        })}
      </g>
    </g>
  )
}

function TaggedJacketIllustration({
  cx,
  cy,
  dark,
  tagDigit,
}: {
  cx: number
  cy: number
  dark: boolean
  tagDigit: '0' | '1'
}) {
  const fill = dark ? '#1f2937' : '#f8fafc'
  const collarInner = dark ? '#334155' : '#e2e8f0'
  const line = dark ? '#94a3b8' : '#1e293b'
  const outerStroke = '#0f172a'

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Jacket body */}
      <path
        d="M -26 -54 L -58 -40 L -82 26 L -60 34 L -40 -10 L -42 74 L 42 74 L 40 -10 L 60 34 L 82 26 L 58 -40 L 26 -54 L 18 -64 L -18 -64 Z"
        fill={fill}
        stroke={outerStroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Stand collar & front zip */}
      <path d="M -20 -64 Q 0 -46 20 -64 L 14 -42 Q 0 -30 -14 -42 Z" fill={collarInner} stroke={line} strokeWidth="2" />
      <line x1="0" y1="-34" x2="0" y2="74" stroke={line} strokeWidth="2" />
      {/* Tiny actual tag at collar */}
      <rect x="-8" y="-56" width="16" height="10" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
      {/* Magnified callout bubble pointing from collar */}
      <path d="M 8 -52 L 50 -70" stroke="#0f172a" strokeWidth="1.8" strokeDasharray="3 2" />
      <circle cx="72" cy="-70" r="24" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
      <text
        x="72"
        y="-61"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        fontWeight="800"
        fontSize="26"
        fill="#0f172a"
      >
        {tagDigit}
      </text>
    </g>
  )
}

export function ListeningDiagram({
  diagramId,
  selectedIndex,
  answerIndex,
  revealed,
  onSelectIndex,
}: ListeningDiagramProps) {
  if (diagramId === 'jlpt-2025-12-m1-q01') {
    const opts = [
      { coatFill: '#f8fafc', lapelFill: '#ffffff', buttonFill: '#ffffff', buttonStroke: '#475569' },
      { coatFill: '#f8fafc', lapelFill: '#ffffff', buttonFill: '#111827', buttonStroke: '#111827' },
      { coatFill: '#9ca3af', lapelFill: '#b8bec8', buttonFill: '#ffffff', buttonStroke: '#334155' },
      { coatFill: '#9ca3af', lapelFill: '#b8bec8', buttonFill: '#111827', buttonStroke: '#111827' },
    ]
    const coords = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 0, y: 220 },
      { x: 300, y: 220 },
    ]
    return (
      <svg viewBox="0 0 600 440" className="w-full h-auto block select-none" role="img" aria-label="Four coats differing in grey/white fabric and black/white buttons">
        <rect width="600" height="440" fill="#ffffff" />
        <line x1="300" y1="0" x2="300" y2="440" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="0" y1="220" x2="600" y2="220" stroke="#cbd5e1" strokeWidth="2" />
        {opts.map((opt, idx) => (
          <g key={idx}>
            <CoatIllustration
              cx={coords[idx].x + 150}
              cy={coords[idx].y + 114}
              {...opt}
            />
            <QuadCellOverlay
              x={coords[idx].x}
              y={coords[idx].y}
              w={300}
              h={220}
              idx={idx}
              selectedIndex={selectedIndex}
              answerIndex={answerIndex}
              revealed={revealed}
              onSelectIndex={onSelectIndex}
            />
          </g>
        ))}
      </svg>
    )
  }

  if (diagramId === 'jlpt-2025-07-m1-q01') {
    const combos: { largeCount: 1 | 2; smallCount: 1 | 2 }[] = [
      { largeCount: 1, smallCount: 1 },
      { largeCount: 2, smallCount: 1 },
      { largeCount: 1, smallCount: 2 },
      { largeCount: 2, smallCount: 2 },
    ]
    const coords = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 0, y: 220 },
      { x: 300, y: 220 },
    ]
    return (
      <svg viewBox="0 0 600 440" className="w-full h-auto block select-none" role="img" aria-label="Four pill combinations of larger tablets and smaller round pills">
        <rect width="600" height="440" fill="#ffffff" />
        <line x1="300" y1="0" x2="300" y2="440" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="0" y1="220" x2="600" y2="220" stroke="#cbd5e1" strokeWidth="2" />
        {combos.map((c, idx) => (
          <g key={idx}>
            <PillComboIllustration cx={coords[idx].x + 150} cy={coords[idx].y + 110} {...c} />
            <QuadCellOverlay
              x={coords[idx].x}
              y={coords[idx].y}
              w={300}
              h={220}
              idx={idx}
              selectedIndex={selectedIndex}
              answerIndex={answerIndex}
              revealed={revealed}
              onSelectIndex={onSelectIndex}
            />
          </g>
        ))}
      </svg>
    )
  }

  if (diagramId === 'jlpt-2025-07-m1-q03') {
    return (
      <svg viewBox="0 0 600 320" className="w-full h-auto block select-none" role="img" aria-label="Classroom desk with three card stacks labeled A (hiragana), I (kanji), and U (pictures), plus a storage box">
        <rect width="600" height="320" fill="#ffffff" />
        {/* Desk surface */}
        <path d="M 24 225 L 576 225 L 592 292 L 8 292 Z" fill="#f1f5f9" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />

        {/* ア: Hiragana cards */}
        <g transform="translate(88, 128)">
          <rect x="-32" y="-50" width="70" height="92" rx="8" fill="#ffffff" stroke="#334155" strokeWidth="2" transform="translate(8, -6)" />
          <rect x="-36" y="-44" width="70" height="92" rx="8" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
          <text x="-1" y="14" textAnchor="middle" fontSize="38" fontWeight="700" fill="#0f172a">あ</text>
          <text x="-1" y="84" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">ア</text>
        </g>

        {/* イ: Kanji cards */}
        <g transform="translate(218, 128)">
          <rect x="-32" y="-50" width="70" height="92" rx="8" fill="#ffffff" stroke="#334155" strokeWidth="2" transform="translate(8, -6)" />
          <rect x="-36" y="-44" width="70" height="92" rx="8" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
          <text x="-1" y="14" textAnchor="middle" fontSize="38" fontWeight="700" fill="#0f172a">山</text>
          <text x="-1" y="84" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">イ</text>
        </g>

        {/* ウ: Picture cards */}
        <g transform="translate(348, 128)">
          <rect x="-32" y="-50" width="70" height="92" rx="8" fill="#ffffff" stroke="#334155" strokeWidth="2" transform="translate(8, -6)" />
          <rect x="-36" y="-44" width="70" height="92" rx="8" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
          {/* Tree & sun illustration inside picture card */}
          <circle cx="14" cy="-22" r="7" fill="#fde68a" stroke="#0f172a" strokeWidth="1.6" />
          <polygon points="-2,-14 -20,12 16,12" fill="#bbf7d0" stroke="#0f172a" strokeWidth="1.8" strokeLinejoin="round" />
          <rect x="-6" y="12" width="8" height="14" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.6" />
          <text x="-1" y="84" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">ウ</text>
        </g>

        {/* Cardboard Box on right */}
        <g transform="translate(495, 165)">
          <polygon points="-48,-36 48,-36 58,-52 -38,-52" fill="#e2e8f0" stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="-48" y="-36" width="96" height="84" rx="4" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
          <rect x="-20" y="-12" width="40" height="34" rx="6" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
          <text x="0" y="13" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">箱</text>
        </g>
      </svg>
    )
  }

  if (diagramId === 'jlpt-2025-07-m1-q04') {
    const jackets: { dark: boolean; tagDigit: '0' | '1' }[] = [
      { dark: false, tagDigit: '0' },
      { dark: false, tagDigit: '1' },
      { dark: true, tagDigit: '0' },
      { dark: true, tagDigit: '1' },
    ]
    const coords = [
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 0, y: 220 },
      { x: 300, y: 220 },
    ]
    return (
      <svg viewBox="0 0 600 440" className="w-full h-auto block select-none" role="img" aria-label="Four jackets differing in white or black fabric and collar size tags 0 or 1">
        <rect width="600" height="440" fill="#ffffff" />
        <line x1="300" y1="0" x2="300" y2="440" stroke="#cbd5e1" strokeWidth="2" />
        <line x1="0" y1="220" x2="600" y2="220" stroke="#cbd5e1" strokeWidth="2" />
        {jackets.map((j, idx) => (
          <g key={idx}>
            <TaggedJacketIllustration cx={coords[idx].x + 132} cy={coords[idx].y + 124} {...j} />
            <QuadCellOverlay
              x={coords[idx].x}
              y={coords[idx].y}
              w={300}
              h={220}
              idx={idx}
              selectedIndex={selectedIndex}
              answerIndex={answerIndex}
              revealed={revealed}
              onSelectIndex={onSelectIndex}
            />
          </g>
        ))}
      </svg>
    )
  }

  if (diagramId === 'jlpt-2025-07-m1-q06') {
    const stalls = [
      { idx: 0, label: '1', x: 248, y: 184 },
      { idx: 1, label: '2', x: 248, y: 74 },
      { idx: 2, label: '3', x: 446, y: 184 },
      { idx: 3, label: '4', x: 446, y: 74 },
    ]
    return (
      <svg viewBox="0 0 600 370" className="w-full h-auto block select-none" role="img" aria-label="Parking lot diagram next to the apartment building showing spots 1 to 4">
        <rect width="600" height="370" fill="#ffffff" />
        {/* Apartment Building on the left */}
        <rect x="30" y="54" width="166" height="238" rx="8" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2.5" />
        {/* Windows */}
        {[82, 134, 186].map(wy => (
          <g key={wy}>
            <rect x="52" y={wy} width="32" height="26" rx="3" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
            <rect x="100" y={wy} width="32" height="26" rx="3" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
            <rect x="148" y={wy} width="32" height="26" rx="3" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
          </g>
        ))}
        <text x="113" y="254" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">
          アパート
        </text>

        {/* Parking Lot perimeter */}
        <rect x="224" y="46" width="346" height="248" rx="6" fill="#f8fafc" stroke="#1e293b" strokeWidth="2.5" />
        {/* Entrance opening at bottom center */}
        <rect x="348" y="286" width="94" height="16" fill="#ffffff" />
        <path d="M 395 344 L 395 304 M 383 316 L 395 300 L 407 316" fill="none" stroke="#0f172a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <text x="395" y="364" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0f172a">
          入口
        </text>
        <text x="395" y="38" textAnchor="middle" fontSize="14" fontWeight="700" fill="#475569">
          駐車場
        </text>

        {/* 4 clickable parking stalls */}
        {stalls.map(s => {
          const isSelected = selectedIndex === s.idx
          const isKey = answerIndex === s.idx
          let fill = '#ffffff'
          let stroke = '#334155'
          let sw = 2
          let textColor = '#0f172a'
          if (revealed) {
            if (isKey) {
              fill = '#dcfce7'
              stroke = '#16a34a'
              sw = 3.5
              textColor = '#15803d'
            } else if (isSelected) {
              fill = '#fee2e2'
              stroke = '#dc2626'
              sw = 3.5
              textColor = '#b91c1c'
            }
          } else if (isSelected) {
            fill = '#dbeafe'
            stroke = '#007aff'
            sw = 3.5
            textColor = '#0062cc'
          }
          return (
            <g
              key={s.idx}
              onClick={onSelectIndex ? () => onSelectIndex(s.idx) : undefined}
              style={onSelectIndex ? { cursor: 'pointer' } : undefined}
            >
              <rect x={s.x} y={s.y} width="98" height="82" rx="6" fill={fill} stroke={stroke} strokeWidth={sw} />
              {/* Subtle car guide wheel stoppers */}
              <rect x={s.x + 18} y={s.y + 8} width="62" height="4" rx="2" fill="#cbd5e1" />
              <text
                x={s.x + 49}
                y={s.y + 52}
                textAnchor="middle"
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                fontSize="26"
                fontWeight="800"
                fill={textColor}
              >
                {s.label}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  // jlpt-2025-07-m1-q08: Fridge interior with ア ham, イ lettuce, ウ eggs, エ butter
  return (
    <svg viewBox="0 0 600 350" className="w-full h-auto block select-none" role="img" aria-label="Inside a refrigerator showing ham (A), lettuce (I), eggs (U), and butter (E)">
      <rect width="600" height="350" fill="#ffffff" />
      {/* Fridge frame */}
      <rect x="44" y="18" width="512" height="314" rx="16" fill="#f8fafc" stroke="#0f172a" strokeWidth="3" />
      <line x1="44" y1="175" x2="556" y2="175" stroke="#475569" strokeWidth="3" />
      <line x1="300" y1="18" x2="300" y2="332" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 4" />

      {/* ア Ham slices (top-left) */}
      <g transform="translate(172, 95)">
        <rect x="-74" y="-42" width="148" height="72" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
        <ellipse cx="-16" cy="-4" rx="34" ry="22" fill="#fecaca" stroke="#1e293b" strokeWidth="2" />
        <ellipse cx="14" cy="-10" rx="34" ry="22" fill="#fca5a5" stroke="#1e293b" strokeWidth="2" />
        <text x="-52" y="-16" fontSize="20" fontWeight="800" fill="#0f172a">ア</text>
      </g>

      {/* イ Lettuce head (top-right) */}
      <g transform="translate(428, 95)">
        <rect x="-74" y="-42" width="148" height="72" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="8" cy="-4" r="28" fill="#bbf7d0" stroke="#1e293b" strokeWidth="2.2" />
        <path d="M -8 -22 Q 8 -6 0 18 M 20 -20 Q 8 0 18 18" fill="none" stroke="#15803d" strokeWidth="1.8" />
        <text x="-52" y="-16" fontSize="20" fontWeight="800" fill="#0f172a">イ</text>
      </g>

      {/* ウ Egg carton (bottom-left) */}
      <g transform="translate(172, 252)">
        <rect x="-74" y="-42" width="148" height="72" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="-24" y="-20" width="84" height="40" rx="6" fill="#e2e8f0" stroke="#1e293b" strokeWidth="2" />
        {[-6, 12, 30, 46].map(ex => (
          <ellipse key={ex} cx={ex} cy="0" rx="7" ry="11" fill="#fffbeb" stroke="#1e293b" strokeWidth="1.6" />
        ))}
        <text x="-54" y="-16" fontSize="20" fontWeight="800" fill="#0f172a">ウ</text>
      </g>

      {/* エ Butter block (bottom-right) */}
      <g transform="translate(428, 252)">
        <rect x="-74" y="-42" width="148" height="72" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="-18" y="-16" width="76" height="34" rx="4" fill="#fde68a" stroke="#1e293b" strokeWidth="2.2" />
        <path d="M -18 2 L 58 2 M 44 -16 L 58 -6" stroke="#b45309" strokeWidth="1.5" opacity="0.6" />
        <text x="-54" y="-16" fontSize="20" fontWeight="800" fill="#0f172a">エ</text>
      </g>
    </svg>
  )
}
