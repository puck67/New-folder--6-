const PIP_LAYOUTS = {
  A: [[50, 50]],
  2: [[50, 25], [50, 75]],
  3: [[50, 22], [50, 50], [50, 78]],
  4: [[28, 25], [72, 25], [28, 75], [72, 75]],
  5: [[28, 23], [72, 23], [50, 50], [28, 77], [72, 77]],
  6: [[28, 21], [72, 21], [28, 50], [72, 50], [28, 79], [72, 79]],
  7: [[28, 19], [72, 19], [50, 36], [28, 50], [72, 50], [28, 81], [72, 81]],
  8: [[28, 18], [72, 18], [50, 33], [28, 45], [72, 45], [28, 55], [72, 55], [50, 67]],
  9: [[28, 17], [72, 17], [28, 39], [72, 39], [50, 50], [28, 61], [72, 61], [28, 83], [72, 83]],
  10: [[28, 16], [72, 16], [50, 27], [28, 38], [72, 38], [28, 62], [72, 62], [50, 73], [28, 84], [72, 84]],
}

function Corner({ card, inverted = false }) {
  return <span className={`playing-card-corner ${inverted ? 'inverted' : ''}`}><b>{card.rank}</b><i>{card.symbol}</i></span>
}

function Court({ card }) {
  const title = { J: 'VALET', Q: 'DAME', K: 'ROI' }[card.rank]
  return (
    <div className="court-art" aria-hidden="true">
      <span className="court-suit">{card.symbol}</span>
      <div className="court-crown">◆</div>
      <strong>{title}</strong>
      <span className="court-suit inverted-suit">{card.symbol}</span>
    </div>
  )
}

export function PlayingCardBack({ compact = false }) {
  return <article className={`playing-card playing-card-back ${compact ? 'playing-card--compact' : ''}`} aria-label="Lá bài úp"><span>XI<br />DÁCH</span></article>
}

export default function PlayingCard({ card, compact = false }) {
  const pips = PIP_LAYOUTS[card.rank]
  return (
    <article className={`playing-card playing-card--${card.color} ${compact ? 'playing-card--compact' : ''}`} aria-label={card.label}>
      <Corner card={card} />
      {pips ? (
        <div className={`pip-field pip-field--${card.rank}`} aria-hidden="true">
          {pips.map(([left, top], index) => <span key={`${left}-${top}-${index}`} style={{ left: `${left}%`, top: `${top}%` }}>{card.symbol}</span>)}
        </div>
      ) : <Court card={card} />}
      <Corner card={card} inverted />
    </article>
  )
}
