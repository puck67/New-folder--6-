import { useEffect, useMemo, useState } from 'react'
import UnoCard from './UnoCard.jsx'
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
  const inviteText = room ? `Vào phòng UNO Flip của tôi với mã: ${room.code}` : ''

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
    socket.emit('room:create', { name: persistName() }, (result) => {
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
          <p className="eyebrow">UNO FLIP · REALTIME TABLE</p>
          <h1 id="welcome-title">Lật bài.<br />Đổi cuộc chơi.</h1>
          <p className="lead">Tạo bàn riêng, gửi mã mời và chơi UNO Flip trực tiếp với bạn bè.</p>
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
          <p className="rule-note">Luật chuẩn: 2–10 người · không cộng dồn lá phạt · Wild Draw có thể bị thách đấu.</p>
        </section>
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
