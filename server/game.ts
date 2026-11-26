import type {
  Action,
  Entry,
  Persona,
  Phase,
  Player,
  Result,
  RoomView
} from '../shared/protocol';
import { personas, scorePersona } from './personas';

export const durations = {
  'turn-intro': 3_000,
  'persona-preview': 5_000,
  answering: 25_000,
  response: 30_000,
  voting: 15_000,
  'duplicate-review': 10_000,
  'duplicate-result': 2_000,
  'final-votes': 5_000,
  scoring: 8_000
};
export const fixtureDraw = (
  prompt = 'What’s the best vacation destination?'
): { prompt: string; persona: Persona } => ({
  prompt,
  persona: personas.find(({ name }) => name === 'The Troll')!
});

type Turn = {
  id: string;
  phase: Exclude<Phase, 'lobby'>;
  deadline?: number;
  players: Player[];
  answeringId: string;
  prompt: string;
  persona: Persona;
  original?: Entry;
  challenges: Entry[];
  answerIds: Record<string, string>;
  responses: Record<string, Action>;
  votes: Record<string, string>;
  flags: { seat: string; answerIds: string[] }[];
  review?: {
    answerIds: string[];
    eligible: string[];
    ballots: Record<string, boolean>;
    pausedTime: number;
    outcome?: { passed: boolean; yes: number; no: number };
  };
  returnedVotes?: string[];
  result?: Result;
  durations: typeof durations;
};

export function createTurn(
  players: Player[],
  answeringId: string,
  clock: () => number,
  draw: () => { prompt: string; persona: Persona },
  nextId: () => string,
  timing = durations
): Turn {
  return {
    id: nextId(),
    ...draw(),
    players,
    answeringId,
    phase: 'turn-intro',
    deadline: clock() + timing['turn-intro'],
    challenges: [],
    responses: {},
    votes: {},
    flags: [],
    durations: timing,
    answerIds: Object.fromEntries(
      players.map((player) => [player.id, nextId()])
    )
  };
}

export function action(
  turn: Turn,
  seat: string,
  input: Action,
  now: number
): Turn {
  if (
    input.phase !== turn.phase ||
    turn.deadline === undefined ||
    now >= turn.deadline ||
    !turn.players.some((player) => player.id === seat)
  )
    throw new Error('That action is no longer available.');
  const answering = seat === turn.answeringId;
  switch (input.type) {
    case 'answer':
      if (answering)
        return {
          ...turn,
          original: {
            id: turn.answerIds[seat],
            authorId: seat,
            text: input.text
          }
        };
      break;
    case 'support':
    case 'challenge':
      if (!answering)
        return { ...turn, responses: { ...turn.responses, [seat]: input } };
      break;
    case 'vote':
      if (
        turn.votes[seat] &&
        [turn.original, ...turn.challenges].some(
          (entry) => entry?.id === input.answerId && !entry.disqualified
        )
      ) {
        return { ...turn, votes: { ...turn.votes, [seat]: input.answerId } };
      }
      break;
    case 'flag-duplicates': {
      const answerIds = [...new Set(input.answerIds)].sort();
      const flagged = turn.challenges.filter(({ id }) =>
        answerIds.includes(id)
      );
      if (
        !canFlagDuplicates(turn, seat) ||
        answerIds.length < 2 ||
        flagged.length !== answerIds.length ||
        flagged.every((entry) => entry.disqualified) ||
        turn.flags.some(
          (flag) =>
            flag.answerIds.length === answerIds.length &&
            flag.answerIds.every((id, index) => id === answerIds[index])
        )
      )
        break;
      return {
        ...turn,
        phase: 'duplicate-review',
        deadline: now + turn.durations['duplicate-review'],
        flags: [...turn.flags, { seat, answerIds }],
        returnedVotes: undefined,
        review: {
          answerIds,
          eligible: turn.players
            .filter(({ id }) => !flagged.some((entry) => entry.authorId === id))
            .map(({ id }) => id),
          ballots: {},
          pausedTime: turn.deadline - now
        }
      };
    }
    case 'vote-duplicates':
      if (turn.review?.eligible.includes(seat)) {
        return {
          ...turn,
          review: {
            ...turn.review,
            ballots: { ...turn.review.ballots, [seat]: input.yes }
          }
        };
      }
      break;
  }
  throw new Error('That action is unavailable for your seat.');
}

function canFlagDuplicates(turn: Turn, seat: string) {
  return (
    seat !== turn.answeringId &&
    turn.challenges.length >= 2 &&
    turn.challenges.some((entry) => !entry.disqualified) &&
    !turn.flags.some((flag) => flag.seat === seat)
  );
}

function finishReview(turn: Turn, now: number): Turn {
  const review = turn.review!;
  const no = review.eligible.filter(
    (id) => review.ballots[id] === false
  ).length;
  const yes = review.eligible.length - no;
  const passed = yes > no;
  const returnedVotes = passed
    ? Object.keys(turn.votes).filter((id) =>
        review.answerIds.includes(turn.votes[id])
      )
    : [];
  const votes = { ...turn.votes };
  for (const id of returnedVotes) votes[id] = turn.original!.id;
  return {
    ...turn,
    phase: 'duplicate-result',
    deadline: now + turn.durations['duplicate-result'],
    review: { ...review, outcome: { passed, yes, no } },
    challenges: passed
      ? turn.challenges.map((entry) =>
          review.answerIds.includes(entry.id)
            ? { ...entry, disqualified: true }
            : entry
        )
      : turn.challenges,
    votes,
    returnedVotes
  };
}

function score(turn: Turn, now: number): Turn {
  const entries = turn.original ? [turn.original, ...turn.challenges] : [];
  const allocations = Object.values(turn.votes);
  const totals = Object.fromEntries(
    entries.map((entry) => [
      entry.id,
      allocations.filter((id) => id === entry.id).length
    ])
  );
  const playerIds = turn.players.map(({ id }) => id);
  const card = personas.find(({ name }) => name === turn.persona.name);
  const { awards, bonusTurn } =
    turn.original && card
      ? scorePersona(
          card.name,
          turn.answeringId,
          playerIds,
          turn.challenges,
          totals,
          totals[turn.original.id]
        )
      : {
          awards: Object.fromEntries(playerIds.map((id) => [id, 0])),
          bonusTurn: false
        };
  const kenAllChallenged =
    card?.name === 'Ken M.' && turn.challenges.length === playerIds.length - 1;
  const phase =
    turn.original && !kenAllChallenged && turn.durations['final-votes'] > 0
      ? 'final-votes'
      : 'scoring';
  return {
    ...turn,
    phase,
    deadline: now + turn.durations[phase],
    result: {
      entries,
      awards,
      bonusTurn: bonusTurn || undefined,
      totals,
      votes: turn.votes,
      missed: !turn.original,
      persona: turn.original ? turn.persona : undefined
    }
  };
}

export function advance(turn: Turn, now: number): Turn {
  if (turn.deadline === undefined || now < turn.deadline) return turn;
  switch (turn.phase) {
    case 'turn-intro':
      return {
        ...turn,
        phase: 'persona-preview',
        deadline: now + turn.durations['persona-preview']
      };
    case 'persona-preview':
      return {
        ...turn,
        phase: 'answering',
        deadline: now + turn.durations.answering
      };
    case 'answering':
      return turn.original
        ? {
            ...turn,
            phase: 'response',
            deadline: now + turn.durations.response
          }
        : score(turn, now);
    case 'response': {
      const challenges: Entry[] = [];
      const votes: Turn['votes'] = {};
      for (const { id } of turn.players) {
        if (id === turn.answeringId) continue;
        const response = turn.responses[id];
        if (response?.type === 'challenge')
          challenges.push({
            id: turn.answerIds[id],
            authorId: id,
            text: response.text
          });
        else votes[id] = turn.original!.id;
      }
      const durations =
        challenges.length === 0
          ? {
              ...turn.durations,
              voting: turn.durations.voting / 2,
              'final-votes': turn.durations['final-votes'] / 2
            }
          : turn.durations;
      const voting = {
        ...turn,
        // Use the random answer IDs so roster order cannot identify authors.
        challenges: challenges.sort((a, b) => a.id.localeCompare(b.id)),
        votes,
        durations,
        phase: 'voting' as const,
        deadline: now + durations.voting
      };
      return Object.keys(votes).length ? voting : score(voting, now);
    }
    case 'voting':
      return score(turn, now);
    case 'duplicate-review':
      return finishReview(turn, now);
    case 'duplicate-result':
      return {
        ...turn,
        phase: 'voting',
        deadline: now + Math.max(turn.review!.pausedTime, 10_000),
        review: undefined
      };
    case 'final-votes':
      return {
        ...turn,
        phase: 'scoring',
        deadline: now + turn.durations.scoring
      };
    case 'scoring':
      return { ...turn, phase: 'complete', deadline: undefined };
    case 'complete':
      return turn;
  }
}

export function view(
  code: string,
  players: Player[],
  hostId: string,
  you: string,
  turn: Turn | undefined,
  now: number,
  savedResult?: Result & { modifier?: Persona }
): RoomView {
  const base = { code, players, hostId, you, serverTime: now, entries: [] };
  if (!turn) {
    if (!savedResult) return { ...base, phase: 'lobby' };
    const { modifier: legacyPersona, ...result } = savedResult;
    return {
      ...base,
      phase: 'complete',
      result: { ...result, persona: result.persona ?? legacyPersona }
    };
  }
  const { phase, deadline, answeringId, prompt, original, challenges, result } =
    turn;
  const answering = answeringId === you;
  const previewing = phase === 'turn-intro' || phase === 'persona-preview';
  const entries = turn.review
    ? challenges.filter(({ id }) => turn.review!.answerIds.includes(id))
    : !original
      ? []
      : phase === 'voting'
        ? [original, ...challenges]
        : phase === 'response'
          ? [original]
          : [];
  return {
    ...base,
    phase,
    deadline,
    answeringId,
    prompt: previewing ? undefined : prompt,
    result,
    turnId: turn.id,
    phaseDuration: phase === 'complete' ? undefined : turn.durations[phase],
    previewWait:
      !answering && previewing && deadline !== undefined
        ? {
            deadline:
              deadline +
              (phase === 'turn-intro' ? turn.durations['persona-preview'] : 0),
            duration:
              turn.durations['turn-intro'] + turn.durations['persona-preview']
          }
        : undefined,
    persona:
      !result && answering && phase !== 'turn-intro' ? turn.persona : undefined,
    entries: entries.map(({ id, text, disqualified }) => ({
      id,
      text,
      disqualified
    })),
    canFlagDuplicates: phase === 'voting' && canFlagDuplicates(turn, you),
    duplicateReview: turn.review && {
      eligible: turn.review.eligible.includes(you),
      ballot: turn.review.ballots[you],
      outcome: turn.review.outcome
    },
    voteReturned: phase === 'voting' && turn.returnedVotes?.includes(you),
    accepted:
      phase === 'answering' && answering && original
        ? { type: 'answer', phase, text: original.text }
        : phase === 'response'
          ? turn.responses[you]
          : undefined,
    vote: phase === 'voting' ? turn.votes[you] : undefined
  };
}
