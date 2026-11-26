import { expect, test } from 'vitest'
import { createMatch, nextAnswerer, recordTurn } from '../match'

const order = ['a', 'b', 'c', 'd']

test.each([5, 7, 10] as const)('%i rounds give everyone that many turns in the saved order', rounds => {
  let match = createMatch({ type: 'rounds', rounds }, order)
  const answerers: string[] = []
  for (let i = 0; i < rounds * 4; i++) {
    expect(match.outcome).toBeUndefined()
    const answerer = nextAnswerer(match)
    answerers.push(answerer)
    // A missed turn has no awards and still counts toward the rotation.
    match = recordTurn(match, answerer === 'a' ? { a: 3 } : {})
  }
  expect(answerers).toEqual(Array.from({ length: rounds }, () => order).flat())
  expect(match.outcome).toEqual({ type: 'winner', playerIds: ['a'] })
  expect(match.scores.a).toBe(rounds * 3)
})

test('point targets count every award before comparing scores', () => {
  let match = createMatch({ type: 'points', target: 50 }, order)
  match = recordTurn(match, { a: 44, b: 48, c: 49, d: -3 })
  expect(match.outcome).toBeUndefined()
  match = recordTurn(match, { a: 14, b: 2 })
  expect(match.scores).toEqual({ a: 58, b: 50, c: 49, d: -3 })
  expect(match.outcome).toEqual({ type: 'tiebreaker', playerIds: ['a', 'b'] })
})

test.each([50, 100, 200] as const)('one player at %i points wins immediately', target => {
  const match = createMatch({ type: 'points', target }, order)
  expect(recordTurn(match, { a: target }).outcome).toEqual({ type: 'winner', playerIds: ['a'] })
})

test('everyone qualifying gives the roster a shared tie', () => {
  const match = createMatch({ type: 'points', target: 50 }, order)
  expect(recordTurn(match, { a: 60, b: 50, c: 58, d: 51 }).outcome)
    .toEqual({ type: 'shared-tie', playerIds: order })
})

test('the last round sends only players tied for the lead to a tiebreaker', () => {
  let match = createMatch({ type: 'rounds', rounds: 5 }, order)
  for (let i = 0; i < 19; i++) match = recordTurn(match, {})
  expect(match.outcome).toBeUndefined()
  match = recordTurn(match, { a: 5, b: 5, c: 4 })
  expect(match.outcome).toEqual({ type: 'tiebreaker', playerIds: ['a', 'b'] })
})

test('bonus turns chain after the final scheduled turn before checking standings', () => {
  let match = createMatch({ type: 'rounds', rounds: 5 }, order)
  for (let i = 0; i < 19; i++) match = recordTurn(match, {})
  match = recordTurn(match, { a: 3, d: 1 }, true)
  expect(match.outcome).toBeUndefined()
  expect(nextAnswerer(match)).toBe('d')
  match = recordTurn(match, { d: 1 }, true)
  expect(match.outcome).toBeUndefined()
  expect(nextAnswerer(match)).toBe('d')
  match = recordTurn(match, { d: 2 })
  expect(match.completedTurns).toBe(20)
  expect(match.playedTurns).toBe(22)
  expect(match.outcome).toEqual({ type: 'winner', playerIds: ['d'] })
})

test('a score-target outcome takes precedence over a bonus', () => {
  const match = recordTurn(createMatch({ type: 'points', target: 50 }, order), { a: 58, b: 50 }, true)
  expect(match.outcome).toEqual({ type: 'tiebreaker', playerIds: ['a', 'b'] })
  expect(match.bonusAnswerer).toBeUndefined()
})
