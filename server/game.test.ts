import { expect, test } from 'vitest'
import { action, advance, createTurn, view, fixtureDraw } from './game'
import type { Action } from '../shared/protocol'

function setup() {
  let now = 0
  const clock = () => now
  const players = ['a', 'b', 'c', 'd'].map(id => ({ id, name: id }))
  let entry = 0
  let turn = createTurn(players, 'a', clock, fixtureDraw, () => `entry-${++entry}`)
  return {
    send: (seat: string, input: Action, at = now) => {
      turn = action(turn, seat, input, at)
    },
    show: (id: string) => view('ROOM', players, 'a', id, turn, now),
    next: (ms: number) => { now += ms; turn = advance(turn, now) },
  }
}

test('locks Paris, reveals after the buffer, and privately moves a support vote', () => {
  const game = setup()
  game.send('a', { type: 'answer', phase: 'answering', text: 'Paris' }, 0)
  expect(game.show('b')).toMatchObject({ entries: [] })
  expect(game.show('b').modifier).toBeUndefined()
  game.next(30_000)
  expect(game.show('b').entries).toEqual([])
  game.next(3_000)
  expect(game.show('b').entries[0].text).toBe('Paris')
  game.send('b', { type: 'challenge', phase: 'response', text: 'Rome' }, 33_000)
  game.send('c', { type: 'challenge', phase: 'response', text: 'Oslo' }, 33_000)
  game.next(30_000)
  const rome = game.show('d').entries[1].id
  game.send('d', { type: 'vote', phase: 'voting', answerId: rome }, 63_000)
  expect(game.show('d').vote).toBe(rome)
  expect(game.show('b').vote).toBeUndefined()
  game.next(30_000)
  expect(game.show('b').result?.awards).toEqual({ a: 9, b: 0, c: 0, d: 0 })
  expect(game.show('b').result?.votes).toEqual({ d: rome })
})

test('all opponents challenging skips Phase 2 and awards Troll 33', () => {
  const game = setup()
  game.send('a', { type: 'answer', phase: 'answering', text: 'Paris' }, 0)
  game.next(30_000)
  game.next(3_000)
  for (const id of ['b', 'c', 'd']) {
    game.send(id, { type: 'challenge', phase: 'response', text: id }, 33_000)
  }
  game.next(30_000)
  expect(game.show('b')).toMatchObject({ phase: 'scoring', result: { awards: { a: 33, b: 0, c: 0, d: 0 } } })
})

test('a late answer is rejected and a missed turn hides the Modifier', () => {
  const game = setup()
  expect(() => game.send('a', { type: 'answer', phase: 'answering', text: 'Paris' }, 30_000)).toThrow()
  game.next(30_000)
  expect(game.show('b').result).toMatchObject({ missed: true, awards: { a: 0, b: 0, c: 0, d: 0 } })
  expect(game.show('b').result?.modifier).toBeUndefined()
})
