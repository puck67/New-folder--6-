export const SUITS = [
  { id: 'spades', symbol: '♠', label: 'Bích', color: 'black' },
  { id: 'hearts', symbol: '♥', label: 'Cơ', color: 'red' },
  { id: 'diamonds', symbol: '♦', label: 'Rô', color: 'red' },
  { id: 'clubs', symbol: '♣', label: 'Tép', color: 'black' },
]

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

const RANK_LABELS = { A: 'Át', J: 'Bồi', Q: 'Đầm', K: 'Già' }

export const PLAYING_CARDS = SUITS.flatMap((suit) => (
  RANKS.map((rank) => ({
    id: `${rank}-${suit.id}`,
    rank,
    ...suit,
    label: `${RANK_LABELS[rank] ?? rank} ${suit.label}`,
  }))
))
