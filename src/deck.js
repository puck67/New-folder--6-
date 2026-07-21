// Cấu tạo bộ UNO Flip: 112 lá vật lý, mỗi lá có 1 mặt Sáng + 1 mặt Tối.
// File này mô tả THÀNH PHẦN CỦA MỖI MẶT (mỗi mặt đúng 112 "mặt bài").

// --- Bảng màu 4 màu mỗi mặt ---
export const LIGHT_COLORS = {
  red:    { name: 'Đỏ',       fill: '#e2231a', text: '#ffffff' },
  yellow: { name: 'Vàng',     fill: '#f9b000', text: '#ffffff' },
  green:  { name: 'Xanh lá',  fill: '#3aa935', text: '#ffffff' },
  blue:   { name: 'Xanh dương', fill: '#0956bf', text: '#ffffff' },
}

export const DARK_COLORS = {
  pink:   { name: 'Hồng',      fill: '#e6398c', text: '#ffffff' },
  teal:   { name: 'Xanh ngọc', fill: '#159f8f', text: '#ffffff' },
  orange: { name: 'Cam',       fill: '#f26a1b', text: '#ffffff' },
  purple: { name: 'Tím',       fill: '#7b2d8e', text: '#ffffff' },
}

// Màu nền riêng cho từng lá custom (mỗi lá một màu gradient chủ đạo).
export const CUSTOM_COLORS = {
  swap:    { fill: '#5b3cc4', text: '#ffffff' },
  shuffle: { fill: '#0f8b8d', text: '#ffffff' },
  bomb:    { fill: '#c81d4e', text: '#ffffff' },
  shield:  { fill: '#2b6cb0', text: '#ffffff' },
}

export const SIDES = {
  light:  { label: 'Mặt Sáng', bg: '#f4f4f4', colors: LIGHT_COLORS },
  dark:   { label: 'Mặt Tối',  bg: '#141414', colors: DARK_COLORS },
  custom: { label: 'Lá custom', bg: '#1b1b22', colors: CUSTOM_COLORS },
}

// Loại lá hành động theo từng mặt.
// value là nhãn hiển thị / id icon; type để game xử lý logic sau này.
export const ACTIONS = {
  light: [
    { type: 'draw1',   label: '+1' },
    { type: 'skip',    label: 'skip' },
    { type: 'reverse', label: 'reverse' },
    { type: 'flip',    label: 'flip' },
  ],
  dark: [
    { type: 'draw5',       label: '+5' },
    { type: 'skipall',     label: 'skipall' },
    { type: 'reverse',     label: 'reverse' },
    { type: 'flip',        label: 'flip' },
  ],
}

// Lá đen (wild) theo từng mặt.
export const WILDS = {
  light: [
    { type: 'wild',      label: 'wild' },
    { type: 'wilddraw2', label: '+2' },
  ],
  dark: [
    { type: 'wild',         label: 'wild' },
    { type: 'wilddrawcolor', label: 'wild+' },
  ],
}

// Dựng đầy đủ danh sách mặt bài cho MỘT mặt (đúng 112).
// - Số 1..9: 2 lá mỗi màu  => 9*2*4 = 72
// - 4 loại hành động: 2 lá mỗi màu => 4*2*4 = 32
// - Wild: 4 lá mỗi loại (2 loại) => 8
// Tổng: 72 + 32 + 8 = 112
export function buildSide(side) {
  const colors = Object.keys(SIDES[side].colors)
  const faces = []

  for (const color of colors) {
    for (let n = 1; n <= 9; n++) {
      faces.push({ side, color, kind: 'number', value: String(n) })
      faces.push({ side, color, kind: 'number', value: String(n) })
    }
    for (const action of ACTIONS[side]) {
      faces.push({ side, color, kind: 'action', ...action })
      faces.push({ side, color, kind: 'action', ...action })
    }
  }

  for (const wild of WILDS[side]) {
    for (let i = 0; i < 4; i++) {
      faces.push({ side, color: 'wild', kind: 'wild', ...wild })
    }
  }

  return faces
}

// --- Lá chức năng CUSTOM (house-rule, không nằm trong 112 lá gốc) ---
// Đây là các lá thêm cho vui; game có thể bật/tắt tuỳ phòng.
export const CUSTOM_CARDS = [
  {
    kind: 'custom',
    type: 'swap',
    label: 'Đổi tay',
    desc: 'Đổi toàn bộ bài trên tay bạn với một người bất kỳ.',
  },
  {
    kind: 'custom',
    type: 'shuffle',
    label: 'Xáo chung',
    desc: 'Gom hết bài trên tay mọi người, xáo và chia lại đều.',
  },
  {
    kind: 'custom',
    type: 'bomb',
    label: 'Bom +10',
    desc: 'Người kế tiếp bốc 10 lá và mất lượt. Có thể chồng bom.',
  },
  {
    kind: 'custom',
    type: 'shield',
    label: 'Khiên',
    desc: 'Chặn 1 lá phạt (Draw/Bom) đánh vào bạn. Giữ để dùng.',
  },
]

export function customCards() {
  return CUSTOM_CARDS.map((c) => ({ side: 'custom', color: 'custom', ...c }))
}

// Danh sách RÚT GỌN để trưng bày trong gallery: mỗi thiết kế 1 lá.
export function showcase(side) {
  const colors = Object.keys(SIDES[side].colors)
  const faces = []
  for (const color of colors) {
    for (let n = 0; n <= 9; n++) {
      // hiện 0..9 cho đủ dải số dù bộ thật bắt đầu từ 1
      faces.push({ side, color, kind: 'number', value: String(n), demoOnly: n === 0 })
    }
    for (const action of ACTIONS[side]) {
      faces.push({ side, color, kind: 'action', ...action })
    }
  }
  for (const wild of WILDS[side]) {
    faces.push({ side, color: 'wild', kind: 'wild', ...wild })
  }
  return faces
}
