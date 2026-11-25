import { expect, test } from 'vitest'
import { action, advance, createTurn, view, fixtureDraw } from './game'
import { personas } from './personas'
import type { Action, Persona } from '../shared/protocol'

function setup(ids = ['a', 'b', 'c', 'd'], persona: Persona = fixtureDraw().persona) {
  let now = 0
  const clock = () => now
  const players = ids.map(id => ({ id, name: id }))
  let entry = 0
  let turn = createTurn(players, 'a', clock, () => ({ ...fixtureDraw(), persona }), () => `entry-${++entry}`)
  return {
    send: (seat: string, input: Action, at = now) => {
      turn = action(turn, seat, input, at)
    },
    show: (id: string) => view('ROOM', players, 'a', id, turn, now),
    next: (ms: number) => { now += ms; turn = advance(turn, now) },
  }
}

test('restores the persona from an older result using the current view shape', () => {
  const { persona } = fixtureDraw()
  const saved = { missed: false, awards: { a: 9 }, entries: [], votes: {}, totals: {}, modifier: persona }
  const restored = view('ROOM', [{ id: 'a', name: 'Alice' }], 'a', 'a', undefined, 0, saved)
  expect(restored.result).toEqual({ missed: false, awards: { a: 9 }, entries: [], votes: {}, totals: {}, persona })
})

test.each(personas)('shows the catalog text for $name at preview and scoring', persona => {
  const game = setup(undefined, persona)
  game.next(3000)
  expect(game.show('a').persona).toEqual(persona)
  expect(game.show('b').persona).toBeUndefined()
  game.next(3000)
  game.next(10_000)
  game.next(5000)
  game.send('a', { type: 'answer', phase: 'answering', text: 'Paris' })
  game.next(20_000)
  game.next(30_000)
  game.next(15_000)
  game.next(5000)
  expect(game.show('b').result?.persona).toEqual(persona)
})

test('duplicate review pauses the vote, preserves anonymity, and returns invalidated votes', () => {
  const game = setup(['a', 'b', 'c', 'd', 'e'])
  game.next(3000)
  game.next(10_000)
  game.next(5000)
  game.send('a', { type: 'answer', phase: 'answering', text: 'Paris' })
  game.next(20_000)
  for (const seat of ['b', 'c', 'd']) {
    game.send(seat, { type: 'challenge', phase: 'response', text: seat })
  }
  game.next(30_000)
  const [original, b, c, d] = game.show('e').entries.map(entry => entry.id)
  game.send('e', { type: 'vote', phase: 'voting', answerId: b })
  game.next(1000)
  const flag = (seat: string, ...answerIds: string[]) => game.send(seat, { type: 'flag-duplicates', phase: 'voting', answerIds })
  expect(() => flag('a', b, d)).toThrow()
  expect(() => flag('e', original, b)).toThrow()
  flag('e', b, d)
  expect(game.show('b').duplicateReview?.eligible).toBe(false)
  expect(game.show('a').duplicateReview?.eligible).toBe(true)
  expect(game.show('a').entries.every(entry => !('authorId' in entry))).toBe(true)
  expect(() => game.send('b', { type: 'vote-duplicates', phase: 'duplicate-review', yes: true })).toThrow()
  for (const seat of ['a', 'e']) game.send(seat, { type: 'vote-duplicates', phase: 'duplicate-review', yes: false })
  expect(game.show('a').duplicateReview?.ballot).toBe(false)
  expect(game.show('c').duplicateReview?.ballot).toBeUndefined()
  game.next(9999)
  expect(game.show('a').phase).toBe('duplicate-review')
  game.next(1)
  expect(game.show('c').duplicateReview?.outcome).toEqual({ passed: false, yes: 1, no: 2 })
  game.next(2000)
  expect(game.show('e')).toMatchObject({ phase: 'voting', vote: b })
  expect(game.show('e').deadline! - game.show('e').serverTime).toBe(14_000)
  expect(() => flag('c', d, b)).toThrow()
  expect(() => flag('e', b, c)).toThrow()
  game.next(8000)
  flag('b', b, c)
  game.next(10_000)
  expect(game.show('e').duplicateReview?.outcome).toEqual({ passed: true, yes: 3, no: 0 })
  game.next(2000)
  const resumed = game.show('e')
  expect(resumed.deadline! - resumed.serverTime).toBe(10_000)
  expect(resumed).toMatchObject({ vote: original, voteReturned: true })
  expect(resumed.entries.filter(entry => entry.disqualified).map(entry => entry.id)).toEqual([b, c])
  expect(() => game.send('e', { type: 'vote', phase: 'voting', answerId: b })).toThrow()
  game.send('e', { type: 'vote', phase: 'voting', answerId: d })
  game.next(10_000)
  expect(game.show('a').result?.awards.a).toBe(11)
})

test('reveals Paris as soon as answering ends and runs a private 15-second final vote', () => {
  const game = setup()
  expect(game.show('a')).toMatchObject({ phase: 'turn-intro', deadline: 3000 })
  expect(game.show('a').persona).toBeUndefined()
  expect(game.show('a').prompt).toBeUndefined()
  expect(game.show('b').previewWait).toEqual({ deadline: 18_000, duration: 18_000 })
  game.next(2999)
  expect(game.show('a').phase).toBe('turn-intro')
  game.next(1)
  expect(game.show('a')).toMatchObject({ phase: 'persona-preview', deadline: 13_000, persona: { name: 'The Troll' } })
  expect(game.show('a').prompt).toBeUndefined()
  expect(game.show('b').prompt).toBeUndefined()
  expect(game.show('b').previewWait).toEqual({ deadline: 18_000, duration: 18_000 })
  expect(game.show('b').persona).toBeUndefined()
  expect(() => game.send('a', { type: 'answer', phase: 'answering', text: 'Too early' })).toThrow()
  game.next(9999)
  expect(game.show('a').phase).toBe('persona-preview')
  game.next(1)
  expect(game.show('a')).toMatchObject({ phase: 'prompt-preview', deadline: 18_000, prompt: 'What’s the best vacation destination?' })
  expect(game.show('a').persona).toBeUndefined()
  expect(game.show('b').prompt).toBeUndefined()
  expect(game.show('b').previewWait).toEqual({ deadline: 18_000, duration: 18_000 })
  game.next(4999)
  expect(game.show('a').phase).toBe('prompt-preview')
  game.next(1)
  expect(game.show('a')).toMatchObject({ phase: 'answering', deadline: 38_000, phaseDuration: 20_000 })
  expect(game.show('b').prompt).toBe('What’s the best vacation destination?')
  expect(game.show('b').previewWait).toBeUndefined()
  game.send('a', { type: 'answer', phase: 'answering', text: 'Paris' })
  expect(game.show('b')).toMatchObject({ entries: [] })
  expect(game.show('b').persona).toBeUndefined()
  game.next(19_999)
  expect(game.show('b').entries).toEqual([])
  game.next(1)
  expect(game.show('b').phase).toBe('response')
  expect(game.show('b').entries[0].text).toBe('Paris')
  game.send('b', { type: 'challenge', phase: 'response', text: 'Rome' })
  game.send('c', { type: 'challenge', phase: 'response', text: 'Oslo' })
  game.next(30_000)
  expect(game.show('d')).toMatchObject({ phase: 'voting', phaseDuration: 15_000 })
  const entries = game.show('d').entries
  const rome = entries.find(entry => entry.text === 'Rome')!.id
  expect(entries.every(entry => !('authorId' in entry))).toBe(true)
  game.send('d', { type: 'vote', phase: 'voting', answerId: rome })
  expect(game.show('d').vote).toBe(rome)
  expect(game.show('b').vote).toBeUndefined()
  game.next(14_999)
  expect(game.show('b').phase).toBe('voting')
  game.next(1)
  expect(game.show('b').result?.awards).toEqual({ a: 9, b: 0, c: 0, d: 0 })
  expect(game.show('b').result?.votes).toEqual({ d: rome })
  expect(game.show('b').result?.entries).toContainEqual({ id: rome, text: 'Rome', authorId: 'b' })
  expect(game.show('b')).toMatchObject({ phase: 'final-votes', phaseDuration: 5000 })
  game.next(4999)
  expect(game.show('b').phase).toBe('final-votes')
  game.next(1)
  expect(game.show('b')).toMatchObject({ phase: 'scoring', phaseDuration: 10_000, result: { awards: { a: 9 } } })
})

test.each([
  { name: 'The Troll', points: 33, bonusTurn: undefined },
  { name: 'The Karma Farmer', points: 0, bonusTurn: true },
  { name: 'Ken M.', points: 6, bonusTurn: true }
])('$name scores $points and skips Phase 2 when everyone challenges', ({ name, points, bonusTurn }) => {
  const game = setup(undefined, personas.find(persona => persona.name === name)!)
  game.next(3000)
  game.next(10_000)
  game.next(5000)
  game.send('a', { type: 'answer', phase: 'answering', text: 'Paris' })
  game.next(20_000)
  for (const id of ['b', 'c', 'd']) {
    game.send(id, { type: 'challenge', phase: 'response', text: id })
  }
  game.next(30_000)
  const challengerPoints = name === 'Ken M.' ? -2 : 0
  expect(game.show('b')).toMatchObject({
    phase: name === 'Ken M.' ? 'scoring' : 'final-votes',
    result: { awards: { a: points, b: challengerPoints, c: challengerPoints, d: challengerPoints }, bonusTurn }
  })
})

test('a late answer is rejected and a missed turn hides the Persona', () => {
  const game = setup()
  game.next(3000)
  game.next(10_000)
  game.next(5000)
  expect(() => game.send('a', { type: 'answer', phase: 'answering', text: 'Paris' }, 38_000)).toThrow()
  game.next(20_000)
  expect(game.show('b').phase).toBe('scoring')
  expect(game.show('b').result).toMatchObject({ missed: true, awards: { a: 0, b: 0, c: 0, d: 0 } })
  expect(game.show('b').result?.persona).toBeUndefined()
})
