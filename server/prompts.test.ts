import { expect, test } from 'vitest'
import { prompts, shuffle } from './prompts'

test('a new deck shuffles all 292 unique Prompts without changing the catalog', () => {
  const first = shuffle(prompts, () => 0)
  const second = shuffle(prompts, upperBound => upperBound - 2)
  expect(first).not.toEqual(prompts)
  expect(first).not.toEqual(second)
  expect([...first].sort()).toEqual([...prompts].sort())
  expect(new Set(first).size).toBe(292)
})
