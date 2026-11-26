import { personas, type PersonaId } from '../shared/personas'
import { shuffle } from './prompts'

const cardsById = new Map(personas.map(card => [card.id, card]))
const catalogIds = [...cardsById.keys()]

export function drawNextPersona(
  remaining: readonly PersonaId[] | undefined,
  pickIndex: (upperBound: number) => number
) {
  const available = remaining?.filter(id => cardsById.has(id))
  const deck = available?.length ? available : shuffle(catalogIds, pickIndex)
  const [id, ...remainingPersonas] = deck
  return { persona: cardsById.get(id)!, remainingPersonas }
}
