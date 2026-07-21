// Bộ icon vẽ bằng SVG cho lá bài UNO Flip.
// Quy ước: mọi icon vẽ quanh gốc (0,0); prop `size` để phóng to/thu nhỏ,
// `color` để đổi màu nét. Toạ độ y hướng xuống (chuẩn SVG).

// Tạo 3 đỉnh tam giác cho đầu mũi tên tại (x,y) hướng theo vector (dx,dy).
function headPoints(x, y, dx, dy, w) {
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len // hướng đi
  const px = -uy, py = ux // vector vuông góc
  const h = w * 2.4 // chiều dài đầu mũi tên
  const hw = w * 1.7 // nửa bề ngang đáy
  const bx = x - ux * h, by = y - uy * h // tâm đáy tam giác
  return `${x},${y} ${bx + px * hw},${by + py * hw} ${bx - px * hw},${by - py * hw}`
}

// Một mũi tên thẳng từ A(ax,ay) tới B(bx,by), đầu nhọn ở B.
export function Arrow({ ax, ay, bx, by, w = 7, color = '#fff' }) {
  const dx = bx - ax, dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len, uy = dy / len
  const h = w * 2.4
  const sx = bx - ux * h, sy = by - uy * h // thân dừng ở chân đầu mũi tên
  return (
    <g>
      <line x1={ax} y1={ay} x2={sx} y2={sy} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={headPoints(bx, by, dx, dy, w)} fill={color} />
    </g>
  )
}

// Skip: vòng tròn gạch chéo.
export function SkipIcon({ color = '#fff', size = 1 }) {
  const r = 30 * size
  return (
    <g stroke={color} strokeWidth={8 * size} fill="none">
      <circle cx="0" cy="0" r={r} />
      <line x1={-r * 0.72} y1={-r * 0.72} x2={r * 0.72} y2={r * 0.72} />
    </g>
  )
}

// Skip Everyone (mặt tối): vòng cấm + các chấm xung quanh.
export function SkipAllIcon({ color = '#fff', size = 1 }) {
  const r = 26 * size
  const dots = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6
    dots.push(
      <circle
        key={i}
        cx={Math.cos(a) * (r + 16 * size)}
        cy={Math.sin(a) * (r + 16 * size)}
        r={4.5 * size}
        fill={color}
      />,
    )
  }
  return (
    <g>
      <g stroke={color} strokeWidth={7 * size} fill="none">
        <circle cx="0" cy="0" r={r} />
        <line x1={-r * 0.72} y1={-r * 0.72} x2={r * 0.72} y2={r * 0.72} />
      </g>
      {dots}
    </g>
  )
}

// Reverse: hai mũi tên chếch song song, ngược chiều, TÁCH RÕ hai bên.
export function ReverseIcon({ color = '#fff', size = 1 }) {
  const s = size, w = 7 * s
  return (
    <g>
      {/* mũi bên trái, hướng lên */}
      <Arrow ax={-15 * s} ay={17 * s} bx={-7 * s} by={-19 * s} w={w} color={color} />
      {/* mũi bên phải, hướng xuống */}
      <Arrow ax={15 * s} ay={-17 * s} bx={7 * s} by={19 * s} w={w} color={color} />
    </g>
  )
}

// Flip: hai cung tròn ngược nhau tạo thành vòng xoay, có KHE HỞ hai đầu.
export function FlipIcon({ color = '#fff', size = 1 }) {
  const s = size, w = 6 * s
  return (
    <g>
      {/* cung trên phình lên */}
      <path
        d={`M ${-22 * s},${-3 * s} A ${22 * s},${16 * s} 0 0 1 ${22 * s},${-3 * s}`}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <polygon points={headPoints(22 * s, 4 * s, 0, 1, w)} fill={color} />
      {/* cung dưới phình xuống */}
      <path
        d={`M ${22 * s},${3 * s} A ${22 * s},${16 * s} 0 0 1 ${-22 * s},${3 * s}`}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <polygon points={headPoints(-22 * s, -4 * s, 0, -1, w)} fill={color} />
    </g>
  )
}

// Swap (đổi tay): hai mũi tên ngang song song, một qua trái một qua phải.
export function SwapIcon({ color = '#fff', size = 1 }) {
  const s = size, w = 7 * s
  return (
    <g>
      <Arrow ax={-20 * s} ay={-10 * s} bx={20 * s} by={-10 * s} w={w} color={color} />
      <Arrow ax={20 * s} ay={10 * s} bx={-20 * s} by={10 * s} w={w} color={color} />
    </g>
  )
}

// Shuffle (xáo chung): hai đường cong bắt chéo nhau, cùng chỉ sang phải.
export function ShuffleIcon({ color = '#fff', size = 1 }) {
  const s = size, w = 6.5 * s
  return (
    <g>
      <path
        d={`M ${-22 * s},${12 * s} C ${-6 * s},${12 * s} ${4 * s},${-12 * s} ${18 * s},${-12 * s}`}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <path
        d={`M ${-22 * s},${-12 * s} C ${-6 * s},${-12 * s} ${4 * s},${12 * s} ${18 * s},${12 * s}`}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
      />
      <polygon points={headPoints(20 * s, -12 * s, 1, 0, w)} fill={color} />
      <polygon points={headPoints(20 * s, 12 * s, 1, 0, w)} fill={color} />
    </g>
  )
}

// Bom (+10): thân bom tròn + ngòi + tia lửa.
export function BombIcon({ color = '#fff', size = 1 }) {
  const s = size
  return (
    <g>
      <circle cx="0" cy={7 * s} r={16 * s} fill={color} />
      <rect x={-4 * s} y={-12 * s} width={8 * s} height={11 * s} rx={2 * s} fill={color} />
      <path
        d={`M ${2 * s},${-11 * s} C ${11 * s},${-15 * s} ${8 * s},${-24 * s} ${16 * s},${-26 * s}`}
        fill="none"
        stroke={color}
        strokeWidth={3 * s}
        strokeLinecap="round"
      />
      <g stroke={color} strokeWidth={2.4 * s} strokeLinecap="round">
        <line x1={16 * s} y1={-26 * s} x2={16 * s} y2={-33 * s} />
        <line x1={16 * s} y1={-26 * s} x2={23 * s} y2={-28 * s} />
        <line x1={16 * s} y1={-26 * s} x2={21 * s} y2={-21 * s} />
      </g>
    </g>
  )
}

// Khiên (shield): tấm khiên + dấu tick bên trong (màu nền đục qua).
export function ShieldIcon({ color = '#fff', size = 1, cut = '#17171c' }) {
  const s = size
  return (
    <g>
      <path
        d={`M 0,${-20 * s} L ${16 * s},${-12 * s} L ${16 * s},${2 * s}
            C ${16 * s},${14 * s} ${8 * s},${20 * s} 0,${24 * s}
            C ${-8 * s},${20 * s} ${-16 * s},${14 * s} ${-16 * s},${2 * s}
            L ${-16 * s},${-12 * s} Z`}
        fill={color}
      />
      <polyline
        points={`${-7 * s},${1 * s} ${-2 * s},${7 * s} ${8 * s},${-6 * s}`}
        fill="none"
        stroke={cut}
        strokeWidth={4 * s}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}
