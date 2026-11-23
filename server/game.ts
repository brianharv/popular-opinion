import type { Action, Entry, Modifier, Phase, Player, Result, RoomView } from '../shared/protocol'

export const durations = { answering: 30_000, buffer: 3_000, response: 30_000, voting: 30_000, scoring: 10_000 }
export const fixtureDraw = (prompt = 'Best vacation destination') => ({
  prompt,
  modifier: {
    name: 'The Troll',
    rule: 'Earn 2 points per challenger and 5 if you retain zero votes. Lose 5 if nobody challenges. Triple the subtotal if everyone challenges. Challengers earn zero.',
  },
})

type Turn = {
  id: string
  phase: Exclude<Phase, 'lobby'>
  deadline?: number
  players: Player[]
  answeringId: string
  prompt: string
  modifier: Modifier
  original?: Entry
  challenges: Entry[]
  answerIds: Record<string, string>
  responses: Record<string, Action>
  votes: Record<string, string>
  result?: Result
  durations: typeof durations
}

export function createTurn(players: Player[], answeringId: string, clock: () => number,
  draw: () => { prompt: string; modifier: Modifier }, nextId: () => string, timing = durations): Turn {
  return {
    id: nextId(), ...draw(), players, answeringId, phase: 'answering', deadline: clock() + timing.answering,
    challenges: [], responses: {}, votes: {}, durations: timing,
    answerIds: Object.fromEntries(players.map(player => [player.id, nextId()])),
  }
}

export function action(turn: Turn, seat: string, input: Action, now: number): Turn {
  if (input.phase !== turn.phase || turn.deadline === undefined || now >= turn.deadline ||
    !turn.players.some(player => player.id === seat)) throw new Error('That action is no longer available.')
  const answering = seat === turn.answeringId
  switch (input.type) {
    case 'answer':
      if (answering) return { ...turn, original: { id: turn.answerIds[seat], authorId: seat, text: input.text } }
      break
    case 'support':
    case 'challenge':
      if (!answering) return { ...turn, responses: { ...turn.responses, [seat]: input } }
      break
    case 'vote':
      if (turn.votes[seat] && [turn.original, ...turn.challenges].some(entry => entry?.id === input.answerId)) {
        return { ...turn, votes: { ...turn.votes, [seat]: input.answerId } }
      }
      break
  }
  throw new Error('That action is unavailable for your seat.')
}

function score(turn: Turn, now: number): Turn {
  const entries = turn.original ? [turn.original, ...turn.challenges] : []
  const allocations = Object.values(turn.votes)
  const totals = Object.fromEntries(entries.map(entry => [entry.id, allocations.filter(id => id === entry.id).length]))
  const awards = Object.fromEntries(turn.players.map(player => [player.id, 0]))
  if (turn.original) {
    const challengers = turn.challenges.length
    const retained = totals[turn.original.id]
    const subtotal = 2 * challengers + (retained === 0 ? 5 : 0) - (challengers === 0 ? 5 : 0)
    awards[turn.answeringId] = subtotal * (challengers === turn.players.length - 1 ? 3 : 1)
  }
  return {
    ...turn, phase: 'scoring', deadline: now + turn.durations.scoring,
    result: { entries, awards, totals, votes: turn.votes, missed: !turn.original, modifier: turn.original ? turn.modifier : undefined },
  }
}

export function advance(turn: Turn, now: number): Turn {
  if (turn.deadline === undefined || now < turn.deadline) return turn
  switch (turn.phase) {
    case 'answering':
      return turn.original ? { ...turn, phase: 'buffer', deadline: now + turn.durations.buffer } : score(turn, now)
    case 'buffer':
      return { ...turn, phase: 'response', deadline: now + turn.durations.response }
    case 'response': {
      const challenges: Entry[] = []
      const votes: Turn['votes'] = {}
      for (const { id } of turn.players) {
        if (id === turn.answeringId) continue
        const response = turn.responses[id]
        if (response?.type === 'challenge') challenges.push({ id: turn.answerIds[id], authorId: id, text: response.text })
        else votes[id] = turn.original!.id
      }
      const voting = { ...turn, challenges, votes, phase: 'voting' as const, deadline: now + turn.durations.voting }
      return Object.keys(votes).length ? voting : score(voting, now)
    }
    case 'voting':
      return score(turn, now)
    case 'scoring':
      return { ...turn, phase: 'complete', deadline: undefined }
    case 'complete':
      return turn
  }
}

export function view(code: string, players: Player[], hostId: string, you: string,
  turn: Turn | undefined, now: number, savedResult?: Result): RoomView {
  const base = { code, players, hostId, you, serverTime: now, entries: [] }
  if (!turn) return savedResult
    ? { ...base, phase: 'complete', result: savedResult }
    : { ...base, phase: 'lobby' }
  const { phase, deadline, answeringId, prompt, original, challenges, result } = turn
  const answering = answeringId === you
  return {
    ...base, phase, deadline, answeringId, prompt, result, turnId: turn.id,
    bannerUntil: !answering && phase === 'answering' && deadline !== undefined
      ? deadline - turn.durations.answering + 1000 : undefined,
    modifier: !result && answering ? turn.modifier : undefined,
    entries: phase === 'response' && original ? [original]
      : phase === 'voting' && original ? [original, ...challenges] : [],
    accepted: phase === 'answering' && answering && original
      ? { type: 'answer', phase, text: original.text }
      : phase === 'response' ? turn.responses[you] : undefined,
    vote: phase === 'voting' ? turn.votes[you] : undefined,
  }
}
