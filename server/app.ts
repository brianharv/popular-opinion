import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import Fastify from 'fastify'
import websocket from '@fastify/websocket'
import staticFiles from '@fastify/static'
import type { WebSocket } from 'ws'
import { z } from 'zod'
import { actionSchema, nameSchema } from '../shared/protocol'
import { action, advance, createTurn, durations, fixtureDraw, view } from './game'
import { openStorage, type Checkpoint, type Seat } from './storage'

type Room = {
  code: string
  hostId: string
  seats: Seat[]
  checkpoint?: Checkpoint
  turn?: ReturnType<typeof createTurn>
  queue: Promise<void>
  sockets: Map<WebSocket, string>
  timer?: ReturnType<typeof setTimeout>
}
const codeSchema = z.string().regex(/^[A-F0-9]{8}$/)
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const roster = (room: Room) => room.seats.map(({ id, name }) => ({ id, name }))

export async function createApp(url: string, timing = durations, serveClient = false) {
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
    send(socket, { view: view(room.code, roster(room), room.hostId, seat, room.turn, Date.now(), room.checkpoint?.result) })
  }

  function broadcast(room: Room) {
    for (const [socket, seat] of room.sockets) snapshot(room, socket, seat)
  }

  function schedule(room: Room, retry = false) {
    clearTimeout(room.timer)
    if (closing || room.turn?.deadline === undefined) return
    room.timer = setTimeout(() => {
      void serialize(room, async () => {
        const next = advance(room.turn!, Date.now())
        if (next.phase === 'scoring' && room.turn!.phase !== 'scoring') {
          await storage.commit(room.code, room.checkpoint!, next.result!)
          next.deadline = Date.now() + timing.scoring
        }
        room.turn = next
        broadcast(room)
        schedule(room)
      }).catch(error => {
        app.log.error(error)
        schedule(room, true)
      })
    }, retry ? 1000 : Math.max(0, room.turn.deadline - Date.now()))
  }

  for (const { code, checkpoint } of await storage.load()) {
    const room = makeRoom(code, checkpoint.hostId, checkpoint.seats)
    room.checkpoint = checkpoint
    if (!checkpoint.result) {
      room.turn = createTurn(roster(room), checkpoint.answeringId, Date.now, fixtureDraw, randomUUID, timing)
      schedule(room)
    }
  }

  function addSeat(room: Room, name: string) {
    const token = randomBytes(32).toString('hex')
    room.seats.push({ id: randomUUID(), name, tokenHash: hash(token) })
    broadcast(room)
    return { code: room.code, token }
  }

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
      if (room.checkpoint || room.seats.length >= 12) return reply.code(409).send({ error: 'This room is closed to new players.' })
      if (room.seats.some(seat => seat.name.toLowerCase() === body.data.name.toLowerCase())) {
        return reply.code(409).send({ error: 'Choose a different screen name.' })
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
    socket.on('close', () => connected?.room.sockets.delete(socket))
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
          connected = { room, seat: seat.id }
          room.sockets.set(socket, seat.id)
          snapshot(room, socket, seat.id)
          return
        }
        const { room, seat } = connected
        const submitted = actionSchema.parse(input)
        void serialize(room, async () => {
          if (submitted.type === 'start') {
            if (seat !== room.hostId || room.checkpoint) throw new Error('Only the host can start a waiting room.')
            const eligible = new Set(room.sockets.values())
            if (room.seats.length < 4 || room.seats.some(player => !eligible.has(player.id))) {
              throw new Error('At least four players must join and all seats must be connected to start.')
            }
            const checkpoint = { hostId: room.hostId, seats: room.seats, answeringId: room.seats[randomInt(room.seats.length)].id }
            await storage.start(room.code, checkpoint)
            room.checkpoint = checkpoint
            room.turn = createTurn(roster(room), checkpoint.answeringId, Date.now, fixtureDraw, randomUUID, timing)
            schedule(room)
          } else {
            if (!room.turn) throw new Error('The turn has not started.')
            room.turn = action(room.turn, seat, submitted, Date.now())
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
