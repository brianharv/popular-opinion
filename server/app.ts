import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import staticFiles from '@fastify/static'
import type { WebSocket } from 'ws'
import { z } from 'zod'
import { actionSchema, nameSchema } from '../shared/protocol'
import { maximumPlayers, minimumPlayers } from '../shared/match-options'
import { action, advance, createTurn, durations, view } from './game'
import { personas } from '../shared/personas'
import type { Persona } from '../shared/protocol'
import { createMatch, nextAnswerer, recordTurn } from './match'
import { prompts, shuffle } from './prompts'
import { openStorage, type Checkpoint, type Seat } from './storage'

type Room = {
  code: string
  hostId: string
  seats: Seat[]
  checkpoint?: Checkpoint
  turn?: ReturnType<typeof createTurn>
  turnNumber?: number
  scheduledTurnNumber?: number
  isBonusTurn?: boolean
  pendingDraw?: { prompt: string; remainingPrompts: string[] }
  queue: Promise<void>
  sockets: Map<WebSocket, string>
  timer?: ReturnType<typeof setTimeout>
}
const codeSchema = z.string().regex(/^[A-F0-9]{8}$/)
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const roster = (room: Room) => room.seats.map(({ id, name }) => ({ id, name }))
const allSeatsConnected = (room: Room) => new Set(room.sockets.values()).size === room.seats.length

export async function createApp(
  url: string,
  timing = durations,
  serveClient = false,
  drawPersona: () => Persona = () => personas[randomInt(personas.length)]
) {
  const storage = await openStorage(url)
  const app = Fastify()
  const rooms = new Map<string, Room>()
  let closing = false
  await app.register(websocket, { options: { maxPayload: 2048 } })

  function makeRoom(code: string, hostId: string, seats: Seat[]): Room {
    const room = { code, hostId, seats, sockets: new Map(), queue: Promise.resolve() }
    rooms.set(code, room)
    return room
  }

  function serialize<T>(room: Room, task: () => T | Promise<T>): Promise<T> {
    const run = room.queue.then(task)
    room.queue = run.then(() => {}, () => {})
    return run
  }

  function send(socket: WebSocket, payload: unknown) {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload))
  }

  function snapshot(room: Room, socket: WebSocket, seat: string) {
    const checkpoint = room.checkpoint
    const snapshot = view(room.code, roster(room), room.hostId, seat, room.turn, Date.now(), checkpoint?.result)
    if (snapshot.phase === 'lobby') snapshot.allSeatsConnected = allSeatsConnected(room)
    const match = checkpoint?.match
    if (match) {
      snapshot.match = {
        format: match.format,
        turnNumber: room.turnNumber ?? match.playedTurns ?? match.completedTurns,
        scheduledTurnNumber: room.scheduledTurnNumber ?? match.completedTurns,
        isBonusTurn: room.isBonusTurn,
        scores: match.scores,
        outcome: match.outcome,
      }
    }
    send(socket, { view: snapshot })
  }

  function broadcast(room: Room) {
    for (const [socket, seat] of room.sockets) snapshot(room, socket, seat)
  }

  async function beginTurn(room: Room) {
    const checkpoint = room.checkpoint!
    const match = checkpoint.match
    const answeringId = checkpoint.match ? nextAnswerer(checkpoint.match) : checkpoint.answeringId
    if (!room.pendingDraw) {
      const deck = checkpoint.remainingPrompts?.length ? checkpoint.remainingPrompts : shuffle(prompts, randomInt)
      const [prompt, ...remainingPrompts] = deck
      room.pendingDraw = { prompt, remainingPrompts }
    }
    const { prompt, remainingPrompts } = room.pendingDraw
    const after = { ...checkpoint, remainingPrompts }
    await storage.commit(room.code, checkpoint, after)
    room.checkpoint = after
    room.pendingDraw = undefined
    if (match) {
      room.turnNumber = (match.playedTurns ?? match.completedTurns) + 1
      room.isBonusTurn = Boolean(match.bonusAnswerer)
      room.scheduledTurnNumber = match.completedTurns + (room.isBonusTurn ? 0 : 1)
    }
    room.turn = createTurn(roster(room), answeringId, Date.now, () => ({ prompt, persona: drawPersona() }), randomUUID, timing)
  }

  function schedule(room: Room, retry = false) {
    clearTimeout(room.timer)
    if (closing || room.checkpoint?.ended || (room.turn ? room.turn.deadline === undefined : !room.checkpoint)) return
    room.timer = setTimeout(() => {
      void serialize(room, async () => {
        if (room.checkpoint?.ended) return
        const current = room.turn
        if (!current) {
          await beginTurn(room)
          broadcast(room)
          schedule(room)
          return
        }
        const next = advance(current, Date.now())
        if ((next.phase === 'final-votes' || next.phase === 'scoring') && next.result && !current.result) {
          const before = room.checkpoint!
          const result = next.result
          const after = before.match
            ? { ...before, match: recordTurn(before.match, result.awards, result.bonusTurn), result }
            : { ...before, result }
          await storage.commit(room.code, before, after)
          room.checkpoint = after
          next.deadline = Date.now() + next.durations[next.phase]
        }
        if (next.phase === 'complete' && room.checkpoint?.match && !room.checkpoint.match.outcome) {
          await beginTurn(room)
        } else {
          room.turn = next
        }
        broadcast(room)
        schedule(room)
      }).catch(error => {
        app.log.error(error)
        schedule(room, true)
      })
    }, retry ? 1000 : Math.max(0, (room.turn?.deadline ?? Date.now()) - Date.now()))
  }

  for (const { code, checkpoint } of await storage.load()) {
    const room = makeRoom(code, checkpoint.hostId, checkpoint.seats)
    room.checkpoint = checkpoint
    if (checkpoint.ended) continue
    if (checkpoint.match ? !checkpoint.match.outcome : !checkpoint.result) {
      await beginTurn(room)
      schedule(room)
    }
  }

  function addSeat(room: Room, name: string) {
    const token = randomBytes(32).toString('hex')
    room.seats.push({ id: randomUUID(), name, tokenHash: hash(token) })
    broadcast(room)
    return { code: room.code, token }
  }

  app.get('/healthz', async () => ({ status: 'ok' }))

  app.post('/api/rooms', async (request, reply) => {
    const body = z.object({ name: nameSchema }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Enter a screen name of 1–24 characters.' })
    let code: string
    do { code = randomBytes(4).toString('hex').toUpperCase() } while (rooms.has(code))
    const room = makeRoom(code, '', [])
    const credential = addSeat(room, body.data.name)
    room.hostId = room.seats[0].id
    return credential
  })

  app.post('/api/rooms/:code/join', async (request, reply) => {
    const { code } = request.params as { code: string }
    const room = rooms.get(code)
    if (!room) return reply.code(404).send({ error: 'Room not found.' })
    const body = z.object({ name: nameSchema }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'Enter a screen name of 1–24 characters.' })
    return serialize(room, () => {
      if (room.checkpoint || room.seats.length >= maximumPlayers) return reply.code(409).send({ error: 'This room is closed to new players.' })
      if (room.seats.some(seat => seat.name.toLowerCase() === body.data.name.toLowerCase())) {
        return reply.code(409).send({ error: 'That screen name is already in use. Choose a different name.', field: 'name' })
      }
      return addSeat(room, body.data.name)
    })
  })

  app.get('/ws', { websocket: true }, (socket, request) => {
    const origin = request.headers.origin
    if (origin && origin !== `http://${request.headers.host}` && origin !== `https://${request.headers.host}`) {
      socket.close(1008)
      return
    }
    let connected: { room: Room; seat: string } | undefined
    socket.on('close', () => {
      if (!connected) return
      const { room } = connected
      room.sockets.delete(socket)
      if (!room.checkpoint) broadcast(room)
    })
    socket.on('message', raw => {
      try {
        const input: unknown = JSON.parse(raw.toString())
        if (!connected) {
          const { code, token } = z.object({ code: codeSchema, token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input)
          const room = rooms.get(code)
          const seat = room?.seats.find(candidate => candidate.tokenHash === hash(token))
          if (!room || !seat) {
            send(socket, { error: 'Seat could not be restored.' })
            socket.close(1008)
            return
          }
          if (room.checkpoint?.ended) {
            send(socket, { ended: true })
            socket.close(1000)
            return
          }
          connected = { room, seat: seat.id }
          room.sockets.set(socket, seat.id)
          if (room.checkpoint) snapshot(room, socket, seat.id)
          else broadcast(room)
          return
        }
        const { room, seat } = connected
        const submitted = actionSchema.parse(input)
        void serialize(room, async () => {
          if (room.checkpoint?.ended) return
          if (submitted.type === 'end-game') {
            if (seat !== room.hostId || !room.checkpoint) throw new Error('Only the host can end a game in progress.')
            const ended = { ...room.checkpoint, ended: true }
            await storage.commit(room.code, room.checkpoint, ended)
            room.checkpoint = ended
            room.turn = undefined
            clearTimeout(room.timer)
            for (const peer of room.sockets.keys()) {
              send(peer, { ended: true })
              peer.close(1000)
            }
            return
          }
          if (submitted.type === 'start') {
            if (seat !== room.hostId || room.checkpoint) throw new Error('Only the host can start a waiting room.')
            if (room.seats.length < minimumPlayers || !allSeatsConnected(room)) {
              throw new Error('At least four players must join and all seats must be connected to start.')
            }
            const order = shuffle(room.seats.map(player => player.id), randomInt)
            const checkpoint = {
              hostId: room.hostId,
              seats: room.seats,
              match: createMatch(submitted.format, order),
              remainingPrompts: shuffle(prompts, randomInt),
            }
            await storage.start(room.code, checkpoint)
            room.checkpoint = checkpoint
            try {
              await beginTurn(room)
            } finally {
              schedule(room)
            }
          } else {
            if (!room.turn || submitted.turnId !== room.turn.id) throw new Error('That action is no longer available.')
            const phase = room.turn.phase
            room.turn = action(room.turn, seat, submitted, Date.now())
            if (room.turn.phase !== phase) schedule(room)
          }
          broadcast(room)
        }).catch(error => send(socket, { error: error.message }))
      } catch {
        send(socket, { error: 'Enter a valid action or reconnect with your saved seat.' })
      }
    })
  })

  if (serveClient) {
    await app.register(staticFiles, { root: resolve('client/dist') })
    for (const path of ['/how-to-play', '/room/:code']) app.get(path, (_, reply) => reply.sendFile('index.html'))
  }
  app.addHook('preClose', async () => {
    closing = true
    for (const room of rooms.values()) clearTimeout(room.timer)
  })
  app.addHook('onClose', async () => {
    await Promise.all([...rooms.values()].map(room => room.queue))
    await storage.close()
  })
  return app
}
