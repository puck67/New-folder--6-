import { useEffect, useMemo, useState } from 'react'
import UnoCard from './UnoCard.jsx'
import PlayingCard, { PlayingCardBack } from './PlayingCard.jsx'
import { PLAYING_CARDS } from './playingCards.js'
import { socket } from './socket.js'

const COLOR_LABELS = {
  red: 'Đỏ', yellow: 'Vàng', green: 'Xanh lá', blue: 'Xanh dương',
  pink: 'Hồng', teal: 'Xanh ngọc', orange: 'Cam', purple: 'Tím',
}

function faceLabel(card) {
  if (card.kind === 'number') return card.value
  return ({ draw1: '+1', draw5: '+5', skip: 'Cấm lượt', skipall: 'Cấm mọi người', reverse: 'Đổi chiều', flip: 'FLIP', wild: 'Đổi màu', wilddraw2: '+2', wilddrawcolor: 'Đổi màu +' })[card.type] ?? card.type
}

export default function App() {
  const [name, setName] = useState(() => localStorage.getItem('uno-flip-name') ?? '')
  const [roomCode, setRoomCode] = useState('')
  const [room, setRoom] = useState(null)
  const [notice, setNotice] = useState('Đang kết nối máy chủ...')
  const [selectedColor, setSelectedColor] = useState(null)
  const [isCardGalleryOpen, setIsCardGalleryOpen] = useState(false)
  const [gameMode, setGameMode] = useState('uno-flip')

  useEffect(() => {
    const onState = (state) => {
      setRoom(state)
      setSelectedColor(null)
      setNotice(state.status === 'waiting' ? 'Phòng đã sẵn sàng. Chờ chủ phòng bắt đầu.' : '')
    }
    const onError = ({ message }) => setNotice(message)
    const onConnect = () => setNotice((current) => current === 'Đang kết nối máy chủ...' ? 'Đã kết nối. Tạo phòng hoặc nhập mã mời.' : current)
    const onDisconnect = () => setNotice('Mất kết nối với máy chủ.')

    socket.on('room:state', onState)
    socket.on('game:error', onError)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    if (socket.connected) onConnect()
    return () => {
      socket.off('room:state', onState)
      socket.off('game:error', onError)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  const isYourTurn = room?.players.find((player) => player.isYou)?.id === room?.currentPlayerId
  const activeColors = room?.activeSide === 'dark'
    ? ['pink', 'teal', 'orange', 'purple']
    : ['red', 'yellow', 'green', 'blue']
  const inviteText = room ? `Vào phòng ${room.gameMode === 'xi-dach' ? 'Xì Dách' : 'UNO Flip'} của tôi với mã: ${room.code}` : ''

  const playersInOrder = useMemo(() => {
    if (!room) return []
    const you = room.players.find((player) => player.isYou)
    return [you, ...room.players.filter((player) => !player.isYou)].filter(Boolean)
  }, [room])

  function persistName() {
    const cleanName = name.trim().slice(0, 20)
    localStorage.setItem('uno-flip-name', cleanName)
    return cleanName || 'Người chơi'
  }

  function createRoom() {
    socket.emit('room:create', { name: persistName(), gameMode }, (result) => {
      if (!result?.ok) setNotice(result?.message ?? 'Không thể tạo phòng.')
    })
  }

  function joinRoom() {
    socket.emit('room:join', { name: persistName(), code: roomCode }, (result) => {
      if (!result?.ok) setNotice(result?.message ?? 'Không thể vào phòng.')
    })
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteText)
      setNotice('Đã sao chép mã mời.')
    } catch {
      setNotice(`Mã phòng: ${room.code}`)
    }
  }

  function playCard(card) {
    if (!room || !isYourTurn || room.pendingChoice) return
    if (card.kind === 'wild' && !selectedColor) {
      setSelectedColor(card.id)
      setNotice('Chọn một màu cho lá Wild.')
      return
    }
    socket.emit('game:play-card', {
      code: room.code,
      cardId: card.id,
      color: card.kind === 'wild' ? selectedColor : undefined,
    })
  }

  if (!room) {
    return (
      <main className="lobby-shell">
        <section className="lobby-card" aria-labelledby="welcome-title">
          <p className="eyebrow">MEGA BÀN CHƠI · REALTIME</p>
          <h1 id="welcome-title">Chọn bàn.<br />Vào cuộc chơi.</h1>
          <p className="lead">Chọn game, tạo phòng riêng và gửi mã mời cho bạn bè.</p>
          <div className="game-mode-picker" aria-label="Chọn trò chơi">
            <button className={gameMode === 'uno-flip' ? 'selected' : ''} onClick={() => setGameMode('uno-flip')}><b>UNO FLIP</b><span>2–10 người · lật hai mặt</span></button>
            <button className={gameMode === 'xi-dach' ? 'selected' : ''} onClick={() => setGameMode('xi-dach')}><b>XÌ DÁCH</b><span>2–6 người · nặm bài hồi hộp</span></button>
          </div>
          <label className="field-label" htmlFor="player-name">Tên hiển thị</label>
          <input id="player-name" className="text-input" maxLength="20" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Phúc" />
          <div className="lobby-actions">
            <button className="primary-button" onClick={createRoom}>Tạo phòng mới</button>
          </div>
          <div className="join-divider"><span>hoặc</span></div>
          <label className="field-label" htmlFor="room-code">Mã mời</label>
          <div className="join-row">
            <input id="room-code" className="text-input code-input" maxLength="6" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="ABC123" />
            <button className="secondary-button" onClick={joinRoom}>Vào bàn</button>
          </div>
          <p className="notice" role="status">{notice}</p>
          <button className="deck-preview-button" onClick={() => setIsCardGalleryOpen(true)}>Xem bộ 52 lá · Xì Dách</button>
          <p className="rule-note">{gameMode === 'xi-dach' ? 'Xì Dách: 2–6 người · Át tính 1 hoặc 11 · Xì Dách ưu tiên Ngũ linh · không cược.' : 'UNO Flip: 2–10 người · không cộng dồn lá phạt · Wild Draw có thể bị thách đấu.'}</p>
        </section>
        {isCardGalleryOpen && <PlayingCardGallery onClose={() => setIsCardGalleryOpen(false)} />}
      </main>
    )
  }

  return (
    <main className={`game-shell ${room.activeSide === 'dark' ? 'dark-side' : 'light-side'}`}>
      <header className="game-header">
        <a className="brand" href="/" onClick={(event) => event.preventDefault()}>UNO <i>FLIP</i></a>
        <div className="room-code"><span>PHÒNG</span><strong>{room.code}</strong><button onClick={copyInvite}>Mời bạn</button></div>
      </header>

      {room.status === 'waiting' ? (
        <section className="waiting-room">
          <p className="eyebrow">PHÒNG RIÊNG · {room.players.length}/10 NGƯỜI</p>
          <h1>Đội hình đang<br />tập hợp.</h1>
          <p>Gửi mã <b>{room.code}</b> cho bạn bè để họ tham gia bàn chơi.</p>
          <div className="player-roster">
            {room.players.map((player) => <div className="roster-entry" key={player.id}><span className="avatar">{player.name.slice(0, 1).toUpperCase()}</span><b>{player.name}</b>{player.isHost && <small>CHỦ PHÒNG</small>}</div>)}
          </div>
          {room.players.find((player) => player.isYou)?.isHost ? (
            <button className="primary-button start-button" disabled={room.players.length < 2} onClick={() => socket.emit('game:start', { code: room.code })}>Bắt đầu ván bài</button>
          ) : <p className="notice">Đang chờ chủ phòng bắt đầu ván.</p>}
          <p className="notice" role="status">{notice}</p>
        </section>
      ) : room.gameMode === 'xi-dach' ? (
        <XiDachTable room={room} notice={notice} />
      ) : (
        <section className="table-layout">
          <aside className="opponents" aria-label="Người chơi">
            {playersInOrder.filter((player) => !player.isYou).map((player) => (
              <div className={`opponent ${player.id === room.currentPlayerId ? 'active' : ''}`} key={player.id}>
                <span className="avatar">{player.name.slice(0, 1).toUpperCase()}</span><div><b>{player.name}</b><small>{player.cardCount} lá</small></div>
              </div>
            ))}
          </aside>

          <div className="table-center">
            <div className="turn-banner">{room.status === 'finished' ? 'VÁN ĐẤU KẾT THÚC' : isYourTurn ? 'ĐẾN LƯỢT BẠN' : `ĐẾN LƯỢT ${room.players.find((player) => player.id === room.currentPlayerId)?.name?.toUpperCase()}`}</div>
            <div className="piles">
              <button className="draw-pile" disabled={!room.canDraw} onClick={() => socket.emit('game:draw-card', { code: room.code })} aria-label="Rút bài"><span>UNO</span><i>FLIP</i></button>
              {room.topCard && <div className="discard-card"><UnoCard face={room.topCard} width={164} /></div>}
            </div>
            <p className="color-status">Màu đang chơi: <b>{COLOR_LABELS[room.chosenColor]}</b></p>
            {room.hasDrawnCard && <button className="text-button" onClick={() => socket.emit('game:pass', { code: room.code })}>Bỏ lượt sau khi rút</button>}
            {room.canCallUno && <button className="uno-button" onClick={() => socket.emit('game:call-uno', { code: room.code })}>UNO!</button>}
            {room.canCatchUno && <button className="catch-button" onClick={() => socket.emit('game:catch-uno', { code: room.code })}>Bắt lỗi UNO</button>}
            {room.pendingChoice && <div className="challenge-box"><b>Wild Draw</b><span>Chọn phản hồi:</span><button onClick={() => socket.emit('game:wild-draw-response', { code: room.code, choice: 'accept' })}>Nhận phạt</button><button onClick={() => socket.emit('game:wild-draw-response', { code: room.code, choice: 'challenge' })}>Thách đấu</button></div>}
            {room.status === 'finished' && <div className="winner-box">Người thắng: <b>{room.players.find((player) => player.id === room.winnerId)?.name}</b></div>}
          </div>

          <section className="your-hand">
            <div className="hand-header"><span>BÀI CỦA BẠN</span><b>{room.hand.length} LÁ</b></div>
            {selectedColor && <div className="color-picker"><span>Chọn màu:</span>{activeColors.map((color) => <button key={color} className={`color-dot ${color}`} aria-label={COLOR_LABELS[color]} onClick={() => { const card = room.hand.find((entry) => entry.id === selectedColor); if (card) socket.emit('game:play-card', { code: room.code, cardId: card.id, color }) }} />)}</div>}
            <div className="hand-cards">
              {room.hand.map((card) => <button className={`hand-card ${isYourTurn ? 'playable' : ''}`} title={faceLabel(card)} key={card.id} onClick={() => playCard(card)}><UnoCard face={card} width={112} /></button>)}
            </div>
          </section>
          <p className="notice table-notice" role="status">{notice}</p>
        </section>
      )}
    </main>
  )
}

function XiDachTable({ room, notice }) {
  const you = room.players.find((player) => player.isYou)
  const isYourTurn = you?.id === room.currentPlayerId
  const resultLabel = room.result?.outcome === 'win' ? 'BẠN THẮNG' : room.result?.outcome === 'lose' ? 'BẠN THUA' : room.result ? 'HÒA VÁN' : null

  return (
    <section className="xidach-table">
      <div className="xidach-ruleline">XÌ DÁCH · 2–6 NGƯỜI · MỖI LÁ BỐC SẼ ĐƯỢC NẶM RIÊNG</div>
      <section className="dealer-zone">
        <div className="zone-label"><span>NHÀ CÁI</span><b>{room.dealer.revealed ? `${room.dealer.total} ĐIỂM` : 'ĐANG GIỮ BÀI ÚP'}</b></div>
        <div className="xidach-cards dealer-cards">
          {room.dealer.cards.map((card) => <PlayingCard card={card} compact key={card.id} />)}
          {Array.from({ length: room.dealer.hiddenCount }, (_, index) => <PlayingCardBack compact key={`hidden-${index}`} />)}
        </div>
      </section>

      <section className="xidach-status">
        <p>{room.status === 'finished' ? 'KẾT QUẢ VÁN BÀI' : isYourTurn ? 'TỚI LƯỢT BẠN — NẶM HAY DẰN?' : `ĐANG CHỜ ${room.players.find((player) => player.id === room.currentPlayerId)?.name?.toUpperCase() ?? 'NHÀ CÁI'}`}</p>
        {resultLabel && <div className={`result-banner result-${room.result.outcome}`}><strong>{resultLabel}</strong><span>{room.result.reason} · Bạn {room.result.total} / Nhà cái {room.result.dealerTotal}</span></div>}
      </section>

      <section className="xidach-players" aria-label="Người chơi khác">
        {room.players.filter((player) => !player.isYou).map((player) => <div className={`xidach-opponent ${player.id === room.currentPlayerId ? 'active' : ''}`} key={player.id}><span className="avatar">{player.name.slice(0, 1).toUpperCase()}</span><div><b>{player.name}</b><small>{player.cardCount} lá · {player.status === 'busted' ? 'Quắc' : player.status === 'stood' ? 'Đã dằn' : player.status === 'blackjack' ? 'Xì Dách' : player.status === 'five-card' ? 'Ngũ linh' : 'Đang nặm'}</small></div></div>)}
      </section>

      <section className="your-xidach-hand">
        <div className="zone-label"><span>BÀI CỦA BẠN</span><b>{room.yourTotal} ĐIỂM · {room.hand.length} LÁ</b></div>
        <div className="xidach-cards your-xidach-cards">
          {room.hand.map((card, index) => <div className="naming-card" style={{ '--deal-order': index }} key={card.id}><PlayingCard card={card} /></div>)}
        </div>
        {room.status === 'playing' && <div className="xidach-actions"><button className="hit-button" disabled={!room.canHit} onClick={() => socket.emit('xidach:hit', { code: room.code })}>Nặm thêm lá</button><button className="stand-button" disabled={!room.canStand} onClick={() => socket.emit('xidach:stand', { code: room.code })}>Dằn bài</button></div>}
        {room.status === 'finished' && you?.isHost && <button className="hit-button restart-xidach" onClick={() => socket.emit('xidach:restart', { code: room.code })}>Chia ván mới</button>}
      </section>
      <p className="notice xidach-notice" role="status">{notice}</p>
    </section>
  )
}

function PlayingCardGallery({ onClose }) {
  return (
    <div className="playing-gallery-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="playing-gallery" role="dialog" aria-modal="true" aria-labelledby="playing-gallery-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="playing-gallery-header">
          <div>
            <p className="eyebrow">BỘ BÀI TIÊU CHUẨN · 52 LÁ</p>
            <h2 id="playing-gallery-title">Xì Dách<br />Deck No. 01</h2>
          </div>
          <button className="gallery-close" aria-label="Đóng bộ bài" onClick={onClose}>×</button>
        </header>
        <p className="gallery-intro">Thiết kế cổ điển với dấu ấn casino Á Đông: bích, cơ, rô, tép — đủ 52 lá, chưa gồm Joker.</p>
        <div className="playing-gallery-grid">
          {PLAYING_CARDS.map((card) => <PlayingCard card={card} key={card.id} />)}
        </div>
      </section>
    </div>
  )
}
