import { SIDES, CUSTOM_COLORS } from './deck.js'
import {
  SkipIcon,
  SkipAllIcon,
  ReverseIcon,
  FlipIcon,
  SwapIcon,
  ShuffleIcon,
  BombIcon,
  ShieldIcon,
} from './icons.jsx'

// Kích thước chuẩn của lá bài trong hệ toạ độ SVG.
const W = 240
const H = 360

// Icon trung tâm theo type (dùng cho lá không phải số).
function CenterMark({ face, size = 1, cut }) {
  const white = '#ffffff'
  switch (face.type) {
    case 'skip':    return <SkipIcon color={white} size={size} />
    case 'skipall': return <SkipAllIcon color={white} size={size} />
    case 'reverse': return <ReverseIcon color={white} size={size} />
    case 'flip':    return <FlipIcon color={white} size={size} />
    case 'swap':    return <SwapIcon color={white} size={size} />
    case 'shuffle': return <ShuffleIcon color={white} size={size} />
    case 'bomb':    return <BombIcon color={white} size={size} />
    case 'shield':  return <ShieldIcon color={white} size={size} cut={cut} />
    default:        return null
  }
}

// Chữ lớn ở giữa (chỉ cho số / +1 / +5 / +2 / +10).
function centerText(face) {
  if (face.kind === 'number') return face.value
  if (face.type === 'draw1') return '+1'
  if (face.type === 'draw5') return '+5'
  if (face.type === 'wilddraw2') return '+2'
  if (face.type === 'wilddrawcolor') return '+'
  if (face.type === 'bomb') return '+10'
  return null
}

// Chữ nhỏ ở góc.
function cornerText(face) {
  if (face.kind === 'number') return face.value
  if (face.type === 'draw1') return '+1'
  if (face.type === 'draw5') return '+5'
  if (face.type === 'wilddraw2') return '+2'
  if (face.type === 'wilddrawcolor') return '+'
  if (face.type === 'bomb') return '+10'
  return null
}

// Ô 4 màu cho lá wild.
function WildQuad({ colors }) {
  const [a, b, c, d] = colors
  return (
    <g>
      <path d="M 0 -70 A 70 70 0 0 1 60 -35 L 0 0 Z" fill={a} />
      <path d="M 60 -35 A 70 70 0 0 1 60 35 L 0 0 Z" fill={b} />
      <path d="M 60 35 A 70 70 0 0 1 0 70 L 0 0 Z" fill={c} />
      <path d="M 0 70 A 70 70 0 0 1 -60 35 L 0 0 Z" fill={d} />
      <path d="M -60 35 A 70 70 0 0 1 -60 -35 L 0 0 Z" fill={a} />
      <path d="M -60 -35 A 70 70 0 0 1 0 -70 L 0 0 Z" fill={b} />
    </g>
  )
}

export default function UnoCard({ face, width = 120 }) {
  const isWild = face.kind === 'wild'
  const isCustom = face.kind === 'custom'

  let cardFill, ovalOpacity, bigTextColor, cutColor
  if (isCustom) {
    cardFill = CUSTOM_COLORS[face.type]?.fill ?? '#333'
    ovalOpacity = 0.2
    bigTextColor = '#ffffff'
    cutColor = cardFill
  } else if (isWild) {
    cardFill = face.side === 'dark' ? '#1c1c1c' : '#111111'
    ovalOpacity = 0.16
    bigTextColor = '#ffffff'
    cutColor = cardFill
  } else {
    const colorDef = SIDES[face.side].colors[face.color]
    cardFill = colorDef.fill
    ovalOpacity = face.side === 'dark' ? 0.16 : 0.28
    bigTextColor = colorDef.text
    cutColor = cardFill
  }

  const sideLabel = SIDES[face.side]?.label ?? 'custom'
  const big = centerText(face)
  const corner = cornerText(face)

  const wildColors = face.side === 'dark'
    ? ['#e6398c', '#159f8f', '#f26a1b', '#7b2d8e']
    : ['#e2231a', '#f9b000', '#3aa935', '#0956bf']

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={width}
      height={(width * H) / W}
      role="img"
      aria-label={`${sideLabel} ${face.color} ${face.value ?? face.type}`}
      style={{ display: 'block' }}
    >
      {/* nền + viền trắng */}
      <rect x="6" y="6" width={W - 12} height={H - 12} rx="22" fill="#ffffff" />
      <rect x="14" y="14" width={W - 28} height={H - 28} rx="18" fill={cardFill} />

      {/* oval chéo đặc trưng */}
      <g transform={`translate(${W / 2}, ${H / 2}) rotate(-30)`}>
        <ellipse cx="0" cy="0" rx="118" ry="66" fill="#ffffff" opacity={ovalOpacity} />
      </g>

      {/* nội dung trung tâm */}
      <g transform={`translate(${W / 2}, ${H / 2})`}>
        {isWild && face.type === 'wild' && <WildQuad colors={wildColors} />}
        {isWild && face.type !== 'wild' && (
          <g transform="scale(0.62)"><WildQuad colors={wildColors} /></g>
        )}

        {/* lá số hoặc chữ lớn */}
        {!isWild && face.kind === 'number' && (
          <text
            x="0" y="0"
            fontFamily="'Arial Black', Arial, sans-serif"
            fontWeight="900" fontSize="150" fill={bigTextColor}
            textAnchor="middle" dominantBaseline="central"
            stroke={face.side === 'dark' ? '#00000055' : '#00000022'}
            strokeWidth="2"
          >
            {big}
          </text>
        )}

        {/* lá có icon (skip/reverse/flip/custom...) */}
        {face.kind !== 'number' && !isWild && (
          <>
            <CenterMark face={face} size={1.5} cut={cutColor} />
            {big && (
              <text
                x="0" y={96}
                fontFamily="'Arial Black', Arial, sans-serif"
                fontWeight="900" fontSize="58" fill={bigTextColor}
                textAnchor="middle" dominantBaseline="central"
              >
                {big}
              </text>
            )}
          </>
        )}

        {/* lá wild có +2 / + ở giữa */}
        {isWild && big && (
          <text
            x="0" y="0"
            fontFamily="'Arial Black', Arial, sans-serif"
            fontWeight="900" fontSize="64" fill="#ffffff"
            textAnchor="middle" dominantBaseline="central"
          >
            {big}
          </text>
        )}
      </g>

      {/* nhãn tên cho lá custom, ở đáy */}
      {isCustom && (
        <text
          x={W / 2} y={H - 30}
          fontFamily="system-ui, Arial, sans-serif"
          fontWeight="700" fontSize="26" fill="#ffffff" opacity="0.95"
          textAnchor="middle"
        >
          {face.label}
        </text>
      )}

      {/* góc trên-trái */}
      <g transform="translate(38, 46)">
        <CornerContent face={face} corner={corner} color="#ffffff" cut={cutColor} />
      </g>
      {/* góc dưới-phải (xoay 180) */}
      <g transform={`translate(${W - 38}, ${H - 46}) rotate(180)`}>
        <CornerContent face={face} corner={corner} color="#ffffff" cut={cutColor} />
      </g>
    </svg>
  )
}

function CornerContent({ face, corner, color, cut }) {
  if (corner) {
    return (
      <text
        x="0" y="0"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900" fontSize="40" fill={color}
        textAnchor="middle" dominantBaseline="central"
      >
        {corner}
      </text>
    )
  }
  // icon nhỏ ở góc cho các lá không có chữ
  if (face.kind === 'number' || face.kind === 'wild') return null
  return <CenterMark face={face} size={0.42} cut={cut} />
}
