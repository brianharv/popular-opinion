import { expect, test } from 'vitest'
import { personas, type PersonaId } from '../../shared/personas'
import { drawNextPersona } from '../persona-deck'

test('every persona is drawn once before a reshuffle, which can repeat the last card', () => {
  const catalog = personas.map(card => card.id)
  let remaining: PersonaId[] | undefined
  const firstCycle = catalog.map(() => {
    const draw = drawNextPersona(remaining, () => 0)
    remaining = draw.remainingPersonas
    return draw.persona.id
  })
  expect(firstCycle.toSorted()).toEqual(catalog.toSorted())
  expect(remaining).toEqual([])

  // Fisher–Yates swaps the chosen index into the current last slot.
  const afterReshuffle = drawNextPersona(remaining, upperBound => upperBound - 1)
  expect(afterReshuffle.persona.id).toBe(firstCycle.at(-1))
  expect(afterReshuffle.remainingPersonas).toHaveLength(catalog.length - 1)
})
