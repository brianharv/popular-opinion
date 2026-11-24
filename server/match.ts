import type { MatchFormat, MatchOutcome, Result } from '../shared/protocol'

export type Match = {
  format: MatchFormat
  order: string[]
  completedTurns: number
  playedTurns?: number
  bonusAnswerer?: string
  scores: Record<string, number>
  outcome?: MatchOutcome
}

export function createMatch(format: MatchFormat, order: string[]): Match {
  return { format, order, completedTurns: 0, scores: Object.fromEntries(order.map(id => [id, 0])) }
}

export function nextAnswerer(match: Match): string {
  return match.bonusAnswerer ?? match.order[match.completedTurns % match.order.length]
}

export function recordTurn(match: Match, awards: Result['awards'], grantsBonus = false): Match {
  const { format, order } = match
  const completedTurns = match.completedTurns + (match.bonusAnswerer ? 0 : 1)
  const playedTurns = (match.playedTurns ?? match.completedTurns) + 1
  const scores = Object.fromEntries(order.map(id => [id, match.scores[id] + (awards[id] ?? 0)]))
  let contenders: string[] = []
  if (format.type === 'points') {
    contenders = order.filter(id => scores[id] >= format.target)
  } else if (!grantsBonus && completedTurns === format.rounds * order.length) {
    const highest = Math.max(...Object.values(scores))
    contenders = order.filter(id => scores[id] === highest)
  }

  let outcome: MatchOutcome | undefined
  if (contenders.length) {
    const type = contenders.length === 1 ? 'winner' : contenders.length === order.length ? 'shared-tie' : 'tiebreaker'
    outcome = { type, playerIds: contenders }
  }
  return {
    ...match, completedTurns, playedTurns, scores, outcome,
    bonusAnswerer: grantsBonus && !outcome ? nextAnswerer(match) : undefined
  }
}
