import { expect, test } from 'vitest'
import { createApp } from './app'
import { localDatabase } from './storage'
import type { Credential, RoomView } from '../shared/protocol'

const url = process.env.TEST_DATABASE_URL ?? localDatabase
const timing = { 'modifier-preview': 150, 'prompt-preview': 150, answering: 1800, response: 500, voting: 500, 'duplicate-review': 1000, 'duplicate-result': 400, 'final-votes': 10_000, scoring: 10_000 }

test('a real PostgreSQL checkpoint replays an interrupted turn and preserves committed points once', async () => {
  let app = await createApp(url, timing)
  let address = await app.listen({ host: '127.0.0.1', port: 0 })
  const sockets: WebSocket[] = []
  try {
    const host = (await app.inject({ method: 'POST', url: '/api/rooms', payload: { name: 'Host' } })).json<Credential>()
    const credentials = [host]
    for (const name of ['One', 'Two', 'Three']) {
      credentials.push((await app.inject({ method: 'POST', url: `/api/rooms/${host.code}/join`, payload: { name } })).json<Credential>())
    }

    async function connect(credential: Credential) {
      const socket = new WebSocket(address.replace('http:', 'ws:') + '/ws')
      sockets.push(socket)
      let current: RoomView | undefined
      let error: string | undefined
      socket.addEventListener('message', ({ data }) => {
        const message = JSON.parse(data)
        current = message.view ?? current
        error = message.error
      })
      socket.addEventListener('open', () => socket.send(JSON.stringify(credential)), { once: true })
      await expect.poll(() => current?.code).toBe(host.code)
      return { show: () => current!, error: () => error, send: (input: unknown) => socket.send(JSON.stringify(input)) }
    }

    async function restart() {
      for (const socket of sockets.splice(0)) socket.close()
      await app.close()
      app = await createApp(url, timing)
      address = await app.listen({ host: '127.0.0.1', port: 0 })
    }

    const peers = await Promise.all(credentials.map(connect))
    peers[0].send({ type: 'start', phase: 'lobby', format: { type: 'rounds', rounds: 7 } })
    await expect.poll(() => peers[0].show().phase).toBe('answering')
    const answeringId = peers[0].show().answeringId
    const priorAnswerer = peers.find(peer => peer.show().you === answeringId)!
    const interruptedPrompt = priorAnswerer.show().prompt
    const interruptedId = priorAnswerer.show().turnId
    priorAnswerer.send({ type: 'answer', phase: 'answering', text: 'Interrupted', turnId: interruptedId })
    await expect.poll(() => priorAnswerer.show().accepted).toMatchObject({ text: 'Interrupted' })
    await restart()

    const replay = await Promise.all(credentials.map(connect))
    const answerer = replay.find(peer => peer.show().you === answeringId)!
    await expect.poll(() => answerer.show().phase).toBe('answering')
    expect(answerer.show().answeringId).toBe(answeringId)
    expect(answerer.show().accepted).toBeUndefined()
    expect(answerer.show().prompt).not.toBe(interruptedPrompt)
    const replayPrompt = answerer.show().prompt
    const replayId = answerer.show().turnId
    expect(replayId).not.toBe(interruptedId)
    answerer.send({ type: 'answer', phase: 'answering', text: 'Stale', turnId: interruptedId })
    await expect.poll(answerer.error).toBe('That action is no longer available.')
    expect(answerer.show().accepted).toBeUndefined()
    answerer.send({ type: 'answer', phase: 'answering', text: 'Paris', turnId: replayId })
    await expect.poll(() => answerer.show().phase, { timeout: 3000 }).toBe('response')
    for (const peer of replay.filter(peer => peer !== answerer)) {
      peer.send({ type: 'challenge', phase: 'response', text: 'Rome', turnId: replayId })
    }
    await expect.poll(() => answerer.show().phase).toBe('final-votes')
    const result = answerer.show().result!
    expect(result.awards[answeringId!]).toBe(33)
    await restart()
    const restored = await connect(host)
    await expect.poll(() => restored.show().phase).toBe('answering')
    expect(restored.show()).toMatchObject({
      phase: 'answering',
      match: { format: { type: 'rounds', rounds: 7 }, turnNumber: 2, scores: result.awards },
    })
    expect(restored.show().answeringId).not.toBe(answeringId)
    expect([interruptedPrompt, replayPrompt]).not.toContain(restored.show().prompt)
    expect(restored.show().result).toBeUndefined()

    const guest = await connect(credentials[1])
    guest.send({ type: 'end-game', confirmed: true })
    await expect.poll(guest.error).toBe('Only the host can end a game in progress.')
    restored.send({ type: 'end-game', confirmed: false })
    await expect.poll(restored.error).toBe('Enter a valid action or reconnect with your saved seat.')

    const ended = new Promise(resolve => {
      sockets[0].addEventListener('message', ({ data }) => {
        if (JSON.parse(data).ended) resolve(true)
      })
    })
    restored.send({ type: 'end-game', confirmed: true })
    expect(await ended).toBe(true)
    await restart()

    const reconnect = new WebSocket(address.replace('http:', 'ws:') + '/ws')
    sockets.push(reconnect)
    const reply = new Promise(resolve => {
      reconnect.addEventListener('message', ({ data }) => resolve(JSON.parse(data)), { once: true })
    })
    reconnect.addEventListener('open', () => reconnect.send(JSON.stringify(host)), { once: true })
    expect(await reply).toEqual({ ended: true })
  } finally {
    for (const socket of sockets) socket.close()
    await app.close()
  }
}, 15_000)

test('the thirteenth seat is rejected', async () => {
  const app = await createApp(url, timing)
  try {
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', payload: { name: 'Host' } })).json<Credential>()
    for (let seat = 2; seat <= 13; seat++) {
      const response = await app.inject({
        method: 'POST', url: `/api/rooms/${room.code}/join`, payload: { name: `Player ${seat}` },
      })
      expect(response.statusCode).toBe(seat <= 12 ? 200 : 409)
    }
  } finally {
    await app.close()
  }
})
