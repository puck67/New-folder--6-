import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { Server } from 'socket.io'

const PORT = Number(process.env.PORT ?? 3001)
const MIN_PLAYERS = 2
const MAX_PLAYERS = 10
const ROOM_CODE_LENGTH = 6
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const COLORS = {
  light: ['red', 'yellow', 'green', 'blue'],
  dark: ['pink', 'teal', 'orange', 'purple'],
}

const ACTIONS = {
  light: ['draw1', 'skip', 'reverse', 'flip'],
  dark: ['draw5', 'skipall', 'reverse', 'flip'],
}

const WILDS = {
  light: ['wild', 'wilddraw2'],
  dark: ['wild', 'wilddrawcolor'],
}

const XI_DACH_SUITS = [
  { id: 'spades', symbol: '♠', label: 'Bích', color: 'black' },
  { id: 'hearts', symbol: '♥', label: 'Cơ', color: 'red' },
  { id: 'diamonds', symbol: '♦', label: 'Rô', color: 'red' },
  { id: 'clubs', symbol: '♣', label: 'Tép', color: 'black' },
]
const XI_DACH_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const XI_DACH_MAX_PLAYERS = 6

const rooms = new Map()

function createFace(side, color, kind, extra = {}) {
  return { side, color, kind, ...extra }
}

function buildFaces(side) {
  const faces = []

  for (const color of COLORS[side]) {
    for (let value = 1; value <= 9; value += 1) {
      faces.push(createFace(side, color, 'number', { value: String(value) }))
      faces.push(createFace(side, color, 'number', { value: String(value) }))
    }
    for (const type of ACTIONS[side]) {
      faces.push(createFace(side, color, 'action', { type }))
      faces.push(createFace(side, color, 'action', { type }))
    }
  }

  for (const type of WILDS[side]) {
    for (let index = 0; index < 4; index += 1) {
      faces.push(createFace(side, 'wild', 'wild', { type }))
    }
  }

  return faces
}

function createDeck() {
  const lightFaces = buildFaces('light')
  const darkFaces = buildFaces('dark')
  return lightFaces.map((light, index) => ({
    id: `card-${index + 1}`,
    light,
    dark: darkFaces[index],
  }))
}

function shuffle(cards) {
  const shuffled = [...cards]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function otherSide(side) {
  return side === 'light' ? 'dark' : 'light'
}

function createXiDachDeck() {
  return XI_DACH_SUITS.flatMap((suit) => XI_DACH_RANKS.map((rank) => ({
    id: `${rank}-${suit.id}`, rank, ...suit,
  })))
}

function xiDachTotal(cards) {
  let total = 0
  let aces = 0
  for (const card of cards) {
    if (card.rank === 'A') { total += 1; aces += 1 }
    else total += ['J', 'Q', 'K'].includes(card.rank) ? 10 : Number(card.rank)
  }
  if (aces > 0 && total + 10 <= 21) total += 10
  return total
}

function xiDachState(cards) {
  const total = xiDachTotal(cards)
  if (cards.length === 2 && total === 21) return 'blackjack'
  if (total > 21) return 'busted'
  if (cards.length === 5) return 'five-card'
  return 'active'
}

function drawXiDach(room, hand) {
  const card = room.xiDach.deck.pop()
  if (card) hand.push(card)
  return card
}

function createRoomCode() {
  let code = ''
  do {
    code = Array.from({ length: ROOM_CODE_LENGTH }, () => (
      ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)]
    )).join('')
  } while (rooms.has(code))
  return code
}

function normalizeName(value) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ')
  return name.slice(0, 20) || 'Người chơi'
}

function normalizeCode(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH)
}

function findPlayer(room, socketId) {
  return room.players.find((player) => player.socketId === socketId)
}

function nextPlayerIndex(room, fromIndex, steps = 1) {
  const count = room.players.length
  return ((fromIndex + room.direction * steps) % count + count) % count
}

function currentCard(room, cardId) {
  return room.deckById.get(cardId)[room.activeSide]
}

function topCard(room) {
  return currentCard(room, room.discardPile.at(-1))
}

function drawCards(room, player, amount) {
  const drawn = []
  for (let index = 0; index < amount; index += 1) {
    if (room.drawPile.length === 0) refillDrawPile(room)
    const cardId = room.drawPile.pop()
    if (!cardId) break
    player.hand.push(cardId)
    drawn.push(cardId)
  }
  return drawn
}

function refillDrawPile(room) {
  if (room.discardPile.length <= 1) return
  const top = room.discardPile.pop()
  room.drawPile = shuffle(room.discardPile)
  room.discardPile = [top]
}

function isPlayable(room, cardId, player) {
  const card = currentCard(room, cardId)
  const top = topCard(room)
  if (!card || !top) return false
  if (card.kind === 'wild') return true
  return card.color === room.chosenColor || card.value === top.value || card.type === top.type
}

function canUseWildDraw(room, cardId, player) {
  const card = currentCard(room, cardId)
  if (!['wilddraw2', 'wilddrawcolor'].includes(card.type)) return true
  return !player.hand.some((heldId) => heldId !== cardId && currentCard(room, heldId).color === room.chosenColor)
}

function isValidColor(room, color) {
  return COLORS[room.activeSide].includes(color)
}

function setTurn(room, playerIndex) {
  room.turnIndex = playerIndex
  room.turnStartedAt = Date.now()
  room.drewCardId = null
}

function closeUnoWindow(room, actorId) {
  if (room.pendingUno && room.pendingUno.playerId !== actorId) room.pendingUno = null
}

function socketAlreadyInRoom(socketId) {
  return [...rooms.values()].some((room) => findPlayer(room, socketId))
}

function startGame(room) {
  room.status = 'playing'
  room.activeSide = 'light'
  room.direction = 1
  room.deck = shuffle(createDeck())
  room.deckById = new Map(room.deck.map((card) => [card.id, card]))
  room.drawPile = room.deck.map((card) => card.id)
  room.discardPile = []
  room.chosenColor = null
  room.pendingChoice = null
  room.pendingUno = null
  room.winnerId = null

  for (const player of room.players) {
    player.hand = []
    player.calledUno = false
    drawCards(room, player, 7)
  }

  let initialId = room.drawPile.pop()
  while (currentCard({ ...room, discardPile: [initialId] }, initialId).kind === 'wild') {
    room.drawPile.unshift(initialId)
    room.drawPile = shuffle(room.drawPile)
    initialId = room.drawPile.pop()
  }
  room.discardPile.push(initialId)
  room.chosenColor = currentCard(room, initialId).color
  setTurn(room, 0)
}

function applyPostPlay(room, playerIndex, card) {
  const player = room.players[playerIndex]
  const nextIndex = nextPlayerIndex(room, playerIndex)

  if (player.hand.length === 1 && !player.calledUno) {
    room.pendingUno = { playerId: player.id }
  } else {
    room.pendingUno = null
  }

  if (player.hand.length === 0) {
    room.status = 'finished'
    room.winnerId = player.id
    return
  }

  if (card.type === 'flip') {
    room.activeSide = otherSide(room.activeSide)
    room.chosenColor = currentCard(room, room.discardPile.at(-1)).color
  }

  if (card.type === 'reverse') {
    room.direction *= -1
    setTurn(room, room.players.length === 2 ? playerIndex : nextPlayerIndex(room, playerIndex))
    return
  }

  if (card.type === 'skip') {
    setTurn(room, nextPlayerIndex(room, playerIndex, 2))
    return
  }

  if (card.type === 'skipall') {
    setTurn(room, playerIndex)
    return
  }

  const drawAmount = card.type === 'draw1' ? 1 : card.type === 'draw5' ? 5 : 0
  if (drawAmount > 0) {
    drawCards(room, room.players[nextIndex], drawAmount)
    setTurn(room, nextPlayerIndex(room, playerIndex, 2))
    return
  }

  if (card.type === 'wilddraw2' || card.type === 'wilddrawcolor') {
    room.pendingChoice = {
      type: card.type,
      offenderId: player.id,
      targetId: room.players[nextIndex].id,
      color: room.chosenColor,
    }
    return
  }

  setTurn(room, nextIndex)
}

function resolveWildDraw(room, choice) {
  const pending = room.pendingChoice
  const offender = room.players.find((player) => player.id === pending.offenderId)
  const targetIndex = room.players.findIndex((player) => player.id === pending.targetId)
  const offenderIndex = room.players.findIndex((player) => player.id === pending.offenderId)

  if (choice === 'challenge') {
    const offenderHadColor = offender.hand.some((cardId) => currentCard(room, cardId).color === pending.color)
    if (offenderHadColor) {
      if (pending.type === 'wilddraw2') drawCards(room, offender, 2)
      else drawUntilColor(room, offender, pending.color)
    } else if (pending.type === 'wilddraw2') {
      drawCards(room, room.players[targetIndex], 4)
    } else {
      drawUntilColor(room, room.players[targetIndex], pending.color)
      drawCards(room, room.players[targetIndex], 2)
    }
  } else if (pending.type === 'wilddraw2') {
    drawCards(room, room.players[targetIndex], 2)
  } else {
    drawUntilColor(room, room.players[targetIndex], pending.color)
  }

  room.pendingChoice = null
  setTurn(room, nextPlayerIndex(room, offenderIndex, 2))
}

function drawUntilColor(room, player, color) {
  do {
    const [cardId] = drawCards(room, player, 1)
    if (!cardId || currentCard(room, cardId).color === color) return
  } while (room.drawPile.length > 0 || room.discardPile.length > 1)
}

function startXiDachGame(room) {
  room.status = 'playing'
  room.xiDach = {
    phase: 'player-turns',
    deck: shuffle(createXiDachDeck()),
    dealerHand: [],
    dealerRevealed: false,
    turnIndex: 0,
    results: null,
  }
  for (const player of room.players) {
    player.hand = []
    drawXiDach(room, player.hand)
    drawXiDach(room, player.hand)
    player.xiDachStatus = xiDachState(player.hand)
  }
  drawXiDach(room, room.xiDach.dealerHand)
  drawXiDach(room, room.xiDach.dealerHand)
  advanceXiDachTurn(room)
}

function advanceXiDachTurn(room) {
  const game = room.xiDach
  while (game.turnIndex < room.players.length && room.players[game.turnIndex].xiDachStatus !== 'active') game.turnIndex += 1
  if (game.turnIndex < room.players.length) return
  resolveXiDachDealer(room)
}

function resolveXiDachDealer(room) {
  const game = room.xiDach
  game.phase = 'dealer-turn'
  game.dealerRevealed = true
  let dealerStatus = xiDachState(game.dealerHand)
  while (dealerStatus === 'active' && xiDachTotal(game.dealerHand) < 17) {
    if (!drawXiDach(room, game.dealerHand)) break
    dealerStatus = xiDachState(game.dealerHand)
  }
  const dealerTotal = xiDachTotal(game.dealerHand)
  game.results = {}
  for (const player of room.players) {
    const total = xiDachTotal(player.hand)
    let outcome = 'push'
    let reason = 'Hòa điểm'
    if (player.xiDachStatus === 'busted') { outcome = 'lose'; reason = 'Quắc' }
    else if (player.xiDachStatus === 'blackjack' && dealerStatus !== 'blackjack') { outcome = 'win'; reason = 'Xì Dách' }
    else if (dealerStatus === 'blackjack' && player.xiDachStatus !== 'blackjack') { outcome = 'lose'; reason = 'Nhà cái Xì Dách' }
    else if (player.xiDachStatus === 'five-card' && dealerStatus !== 'five-card') { outcome = 'win'; reason = 'Ngũ linh' }
    else if (dealerStatus === 'five-card' && player.xiDachStatus !== 'five-card') { outcome = 'lose'; reason = 'Nhà cái Ngũ linh' }
    else if (dealerStatus === 'busted') { outcome = 'win'; reason = 'Nhà cái quắc' }
    else if (total > dealerTotal) { outcome = 'win'; reason = 'Điểm cao hơn' }
    else if (total < dealerTotal) { outcome = 'lose'; reason = 'Điểm thấp hơn' }
    game.results[player.id] = { outcome, reason, total, dealerTotal }
  }
  game.phase = 'settled'
  room.status = 'finished'
}

function xiDachPlayerView(room, viewerSocketId) {
  const viewer = findPlayer(room, viewerSocketId)
  if (!room.xiDach) {
    return {
      code: room.code, gameMode: 'xi-dach', status: room.status, hostId: room.hostId,
      phase: 'waiting', currentPlayerId: null, hand: [], yourTotal: 0,
      players: room.players.map((player) => ({ id: player.id, name: player.name, connected: player.connected, cardCount: 0, status: 'waiting', isHost: player.id === room.hostId, isYou: player.socketId === viewerSocketId })),
      dealer: { cardCount: 0, cards: [], hiddenCount: 0, total: 0, revealed: false },
      canHit: false, canStand: false, result: null, resultsVisible: null,
    }
  }
  const game = room.xiDach
  const currentPlayer = room.players[game.turnIndex]
  const dealerCards = game.dealerRevealed ? game.dealerHand : game.dealerHand.slice(0, 1)
  return {
    code: room.code,
    gameMode: 'xi-dach',
    status: room.status,
    hostId: room.hostId,
    phase: game.phase,
    currentPlayerId: currentPlayer?.id ?? null,
    players: room.players.map((player) => ({
      id: player.id, name: player.name, connected: player.connected,
      cardCount: player.hand.length, status: player.xiDachStatus,
      isHost: player.id === room.hostId, isYou: player.socketId === viewerSocketId,
    })),
    hand: viewer ? viewer.hand : [],
    yourTotal: viewer ? xiDachTotal(viewer.hand) : 0,
    dealer: {
      cardCount: game.dealerHand.length,
      cards: dealerCards,
      hiddenCount: game.dealerRevealed ? 0 : Math.max(0, game.dealerHand.length - dealerCards.length),
      total: game.dealerRevealed ? xiDachTotal(game.dealerHand) : xiDachTotal(dealerCards),
      revealed: game.dealerRevealed,
    },
    canHit: room.status === 'playing' && currentPlayer?.socketId === viewerSocketId && viewer?.xiDachStatus === 'active',
    canStand: room.status === 'playing' && currentPlayer?.socketId === viewerSocketId && viewer?.xiDachStatus === 'active',
    result: game.results?.[viewer?.id] ?? null,
    resultsVisible: game.results ? room.players.map((player) => ({ id: player.id, result: game.results[player.id] })) : null,
  }
}

function playerView(room, viewerSocketId) {
  if (room.gameMode === 'xi-dach') return xiDachPlayerView(room, viewerSocketId)
  const viewer = findPlayer(room, viewerSocketId)
  const currentPlayer = room.players[room.turnIndex]
  return {
    code: room.code,
    gameMode: 'uno-flip',
    status: room.status,
    hostId: room.hostId,
    activeSide: room.activeSide,
    direction: room.direction,
    chosenColor: room.chosenColor,
    topCard: room.discardPile?.length ? currentCard(room, room.discardPile.at(-1)) : null,
    currentPlayerId: currentPlayer?.id ?? null,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      connected: player.connected,
      cardCount: player.hand.length,
      isHost: player.id === room.hostId,
      isYou: player.socketId === viewerSocketId,
    })),
    hand: viewer && room.status !== 'waiting'
      ? viewer.hand.map((cardId) => ({ id: cardId, ...currentCard(room, cardId) }))
      : [],
    canDraw: room.status === 'playing' && currentPlayer?.socketId === viewerSocketId && !room.pendingChoice && !room.drewCardId,
    hasDrawnCard: Boolean(room.drewCardId),
    canCallUno: room.pendingUno?.playerId === viewer?.id && viewer.hand.length === 1,
    canCatchUno: room.pendingUno && room.pendingUno.playerId !== viewer?.id,
    pendingChoice: room.pendingChoice?.targetId === viewer?.id
      ? { type: room.pendingChoice.type, color: room.pendingChoice.color }
      : null,
    winnerId: room.winnerId,
  }
}

function broadcastRoom(room) {
  for (const player of room.players) {
    if (player.connected) io.to(player.socketId).emit('room:state', playerView(room, player.socketId))
  }
}

function emitError(socket, message) {
  socket.emit('game:error', { message })
}

const httpServer = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ status: 'ok' }))
    return
  }
  response.writeHead(404, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify({ error: 'Not found' }))
})
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' },
})

io.on('connection', (socket) => {
  socket.use((event, next) => {
    const payload = event[1]
    if (payload !== undefined && (payload === null || typeof payload !== 'object')) return next(new Error('Dữ liệu sự kiện không hợp lệ.'))
    next()
  })

  socket.on('room:create', ({ name, gameMode } = {}, acknowledge) => {
    if (socketAlreadyInRoom(socket.id)) return acknowledge?.({ ok: false, message: 'Bạn đang ở trong một phòng khác.' })
    const code = createRoomCode()
    const mode = gameMode === 'xi-dach' ? 'xi-dach' : 'uno-flip'
    const player = { id: randomUUID(), socketId: socket.id, name: normalizeName(name), hand: [], connected: true, calledUno: false }
    const room = { code, hostId: player.id, players: [player], status: 'waiting', gameMode: mode, activeSide: 'light', direction: 1 }
    rooms.set(code, room)
    socket.join(code)
    broadcastRoom(room)
    acknowledge?.({ ok: true, code })
  })

  socket.on('room:join', ({ code, name } = {}, acknowledge) => {
    if (socketAlreadyInRoom(socket.id)) return acknowledge?.({ ok: false, message: 'Bạn đang ở trong một phòng khác.' })
    const room = rooms.get(normalizeCode(code))
    if (!room) return acknowledge?.({ ok: false, message: 'Không tìm thấy phòng.' })
    if (room.status !== 'waiting') return acknowledge?.({ ok: false, message: 'Ván chơi đã bắt đầu.' })
    const maxPlayers = room.gameMode === 'xi-dach' ? XI_DACH_MAX_PLAYERS : MAX_PLAYERS
    if (room.players.length >= maxPlayers) return acknowledge?.({ ok: false, message: 'Phòng đã đủ người.' })
    if (findPlayer(room, socket.id)) return acknowledge?.({ ok: false, message: 'Bạn đã trong phòng này.' })

    room.players.push({ id: randomUUID(), socketId: socket.id, name: normalizeName(name), hand: [], connected: true, calledUno: false })
    socket.join(room.code)
    broadcastRoom(room)
    acknowledge?.({ ok: true, code: room.code })
  })

  socket.on('game:start', ({ code } = {}) => {
    const room = rooms.get(normalizeCode(code))
    if (!room || room.hostId !== findPlayer(room, socket.id)?.id) return emitError(socket, 'Chỉ chủ phòng mới có thể bắt đầu.')
    if (room.players.length < MIN_PLAYERS) return emitError(socket, 'Cần ít nhất 2 người chơi.')
    if (room.status === 'playing') return
    if (room.gameMode === 'xi-dach') startXiDachGame(room)
    else startGame(room)
    broadcastRoom(room)
  })

  socket.on('xidach:hit', ({ code } = {}) => {
    const room = rooms.get(normalizeCode(code))
    const player = room && findPlayer(room, socket.id)
    if (!room || !player || room.gameMode !== 'xi-dach' || room.status !== 'playing') return
    const game = room.xiDach
    if (room.players[game.turnIndex]?.id !== player.id || player.xiDachStatus !== 'active') return emitError(socket, 'Chưa đến lượt của bạn.')
    if (!drawXiDach(room, player.hand)) return emitError(socket, 'Bộ bài đã hết.')
    player.xiDachStatus = xiDachState(player.hand)
    if (player.xiDachStatus !== 'active') {
      game.turnIndex += 1
      advanceXiDachTurn(room)
    }
    broadcastRoom(room)
  })

  socket.on('xidach:stand', ({ code } = {}) => {
    const room = rooms.get(normalizeCode(code))
    const player = room && findPlayer(room, socket.id)
    if (!room || !player || room.gameMode !== 'xi-dach' || room.status !== 'playing') return
    const game = room.xiDach
    if (room.players[game.turnIndex]?.id !== player.id || player.xiDachStatus !== 'active') return emitError(socket, 'Chưa đến lượt của bạn.')
    player.xiDachStatus = 'stood'
    game.turnIndex += 1
    advanceXiDachTurn(room)
    broadcastRoom(room)
  })

  socket.on('xidach:restart', ({ code } = {}) => {
    const room = rooms.get(normalizeCode(code))
    if (!room || room.gameMode !== 'xi-dach' || room.hostId !== findPlayer(room, socket.id)?.id) return emitError(socket, 'Chỉ chủ phòng mới được chia ván mới.')
    if (room.status !== 'finished') return
    startXiDachGame(room)
    broadcastRoom(room)
  })

  socket.on('game:play-card', ({ code, cardId, color } = {}) => {
    const room = rooms.get(normalizeCode(code))
    const player = room && findPlayer(room, socket.id)
    if (!room || !player || room.status !== 'playing') return
    closeUnoWindow(room, player.id)
    if (room.pendingChoice) return emitError(socket, 'Cần xử lý lá Wild Draw trước.')
    if (room.players[room.turnIndex]?.id !== player.id) return emitError(socket, 'Chưa đến lượt của bạn.')
    if (!player.hand.includes(cardId)) return emitError(socket, 'Lá bài không có trên tay bạn.')
    if (room.drewCardId && room.drewCardId !== cardId) return emitError(socket, 'Sau khi rút, bạn chỉ được đánh lá vừa rút hoặc bỏ lượt.')
    if (!isPlayable(room, cardId, player)) return emitError(socket, 'Lá này không hợp lệ.')
    if (!canUseWildDraw(room, cardId, player)) return emitError(socket, 'Bạn đang có lá cùng màu nên không thể dùng Wild Draw.')

    const card = currentCard(room, cardId)
    if (card.kind === 'wild' && !isValidColor(room, color)) return emitError(socket, 'Hãy chọn màu hợp lệ.')

    player.hand.splice(player.hand.indexOf(cardId), 1)
    room.discardPile.push(cardId)
    player.calledUno = false
    room.chosenColor = card.kind === 'wild' ? color : card.color
    applyPostPlay(room, room.players.indexOf(player), card)
    broadcastRoom(room)
  })

  socket.on('game:draw-card', ({ code } = {}) => {
    const room = rooms.get(normalizeCode(code))
    const player = room && findPlayer(room, socket.id)
    if (!room || !player || room.status !== 'playing' || room.pendingChoice) return
    closeUnoWindow(room, player.id)
    if (room.players[room.turnIndex]?.id !== player.id) return emitError(socket, 'Chưa đến lượt của bạn.')
    if (room.drewCardId) return emitError(socket, 'Bạn đã rút bài trong lượt này.')

    const [cardId] = drawCards(room, player, 1)
    room.drewCardId = cardId ?? null
    if (!cardId || !isPlayable(room, cardId, player)) setTurn(room, nextPlayerIndex(room, room.turnIndex))
    broadcastRoom(room)
  })

  socket.on('game:pass', ({ code } = {}) => {
    const room = rooms.get(normalizeCode(code))
    const player = room && findPlayer(room, socket.id)
    if (!room || !player || room.status !== 'playing' || room.pendingChoice) return
    closeUnoWindow(room, player.id)
    if (room.players[room.turnIndex]?.id !== player.id || !room.drewCardId) return emitError(socket, 'Bạn chỉ có thể bỏ lượt sau khi rút bài.')
    setTurn(room, nextPlayerIndex(room, room.turnIndex))
    broadcastRoom(room)
  })

  socket.on('game:call-uno', ({ code } = {}) => {
    const room = rooms.get(normalizeCode(code))
    const player = room && findPlayer(room, socket.id)
    if (!room || !player || room.pendingUno?.playerId !== player.id || player.hand.length !== 1) return
    player.calledUno = true
    room.pendingUno = null
    broadcastRoom(room)
  })

  socket.on('game:catch-uno', ({ code } = {}) => {
    const room = rooms.get(normalizeCode(code))
    const catcher = room && findPlayer(room, socket.id)
    if (!room || !catcher || !room.pendingUno || room.pendingUno.playerId === catcher.id) return
    const target = room.players.find((player) => player.id === room.pendingUno.playerId)
    if (!target) return
    drawCards(room, target, 2)
    room.pendingUno = null
    broadcastRoom(room)
  })

  socket.on('game:wild-draw-response', ({ code, choice } = {}) => {
    const room = rooms.get(normalizeCode(code))
    const player = room && findPlayer(room, socket.id)
    if (!room || !player || room.status !== 'playing' || !room.pendingChoice || room.pendingChoice.targetId !== player.id) return
    closeUnoWindow(room, player.id)
    if (!['accept', 'challenge'].includes(choice)) return
    resolveWildDraw(room, choice)
    broadcastRoom(room)
  })

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      const player = findPlayer(room, socket.id)
      if (!player) continue
      room.players = room.players.filter((entry) => entry.id !== player.id)
      if (room.players.length === 0) {
        rooms.delete(room.code)
        return
      }
      if (room.hostId === player.id) room.hostId = room.players[0].id
      if (room.status === 'playing') {
        room.status = 'finished'
        room.winnerId = room.players[0].id
        room.pendingChoice = null
        room.pendingUno = null
      }
      broadcastRoom(room)
      return
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`UNO Flip Socket.IO server listening on http://localhost:${PORT}`)
})
