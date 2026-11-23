import type {
  Action,
  Entry,
  Modifier,
  Phase,
  Player,
  Result,
  RoomView
} from '../shared/protocol';

export const durations = {
  'modifier-preview': 5_000,
  'prompt-preview': 5_000,
  answering: 30_000,
  response: 30_000,
  voting: 15_000,
  'duplicate-review': 10_000,
  'duplicate-result': 2_000,
  'final-votes': 5_000,
  scoring: 10_000
};
export const fixtureDraw = (prompt = 'Best vacation destination') => ({
  prompt,
  modifier: {
    name: 'The Troll',
    rule: 'Earn 2 points per challenger. Earn an additional 5 points if you retain zero votes. Triple your score this round if everyone challenges. Lose 5 points if nobody challenges. Challengers earn no points.'
  }
});

type Turn = {
  id: string;
  phase: Exclude<Phase, 'lobby'>;
  deadline?: number;
  players: Player[];
  answeringId: string;
  prompt: string;
  modifier: Modifier;
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
  draw: () => { prompt: string; modifier: Modifier },
  nextId: () => string,
  timing = durations
): Turn {
  return {
    id: nextId(),
    ...draw(),
    players,
    answeringId,
    phase: 'modifier-preview',
    deadline: clock() + timing['modifier-preview'],
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
      const flagged = turn.challenges.filter(({ id }) => answerIds.includes(id));
      if (
        !canFlagDuplicates(turn, seat) ||
        answerIds.length < 2 ||
        flagged.length !== answerIds.length ||
        flagged.every((entry) => entry.disqualified) ||
        turn.flags.some((flag) => flag.answerIds.length === answerIds.length &&
          flag.answerIds.every((id, index) => id === answerIds[index]))
      ) break;
      return {
        ...turn,
        phase: 'duplicate-review',
        deadline: now + turn.durations['duplicate-review'],
        flags: [...turn.flags, { seat, answerIds }],
        returnedVotes: undefined,
        review: {
          answerIds,
          eligible: turn.players.filter(({ id }) => !flagged.some((entry) => entry.authorId === id)).map(({ id }) => id),
          ballots: {},
          pausedTime: turn.deadline - now
        }
      };
    }
    case 'vote-duplicates':
      if (turn.review?.eligible.includes(seat)) {
        return { ...turn, review: { ...turn.review, ballots: { ...turn.review.ballots, [seat]: input.yes } } };
      }
      break;
  }
  throw new Error('That action is unavailable for your seat.');
}

function canFlagDuplicates(turn: Turn, seat: string) {
  return seat !== turn.answeringId && turn.challenges.length >= 2 &&
    turn.challenges.some((entry) => !entry.disqualified) &&
    !turn.flags.some((flag) => flag.seat === seat);
}

function finishReview(turn: Turn, now: number): Turn {
  const review = turn.review!;
  const no = review.eligible.filter((id) => review.ballots[id] === false).length;
  const yes = review.eligible.length - no;
  const passed = yes > no;
  const returnedVotes = passed
    ? Object.keys(turn.votes).filter((id) => review.answerIds.includes(turn.votes[id]))
    : [];
  const votes = { ...turn.votes };
  for (const id of returnedVotes) votes[id] = turn.original!.id;
  return {
    ...turn,
    phase: 'duplicate-result',
    deadline: now + turn.durations['duplicate-result'],
    review: { ...review, outcome: { passed, yes, no } },
    challenges: passed
      ? turn.challenges.map((entry) => review.answerIds.includes(entry.id) ? { ...entry, disqualified: true } : entry)
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
  const awards = Object.fromEntries(
    turn.players.map((player) => [player.id, 0])
  );
  if (turn.original) {
    const challengers = turn.challenges.length;
    const retained = totals[turn.original.id];
    const subtotal =
      2 * challengers + (retained === 0 ? 5 : 0) - (challengers === 0 ? 5 : 0);
    awards[turn.answeringId] =
      subtotal * (challengers === turn.players.length - 1 ? 3 : 1);
  }
  const phase = turn.original ? 'final-votes' : 'scoring';
  return {
    ...turn,
    phase,
    deadline: now + turn.durations[phase],
    result: {
      entries,
      awards,
      totals,
      votes: turn.votes,
      missed: !turn.original,
      modifier: turn.original ? turn.modifier : undefined
    }
  };
}

export function advance(turn: Turn, now: number): Turn {
  if (turn.deadline === undefined || now < turn.deadline) return turn;
  switch (turn.phase) {
    case 'modifier-preview':
      return {
        ...turn,
        phase: 'prompt-preview',
        deadline: now + turn.durations['prompt-preview']
      };
    case 'prompt-preview':
      return {
        ...turn,
        phase: 'answering',
        deadline: now + turn.durations.answering
      };
    case 'answering':
      return turn.original
        ? { ...turn, phase: 'response', deadline: now + turn.durations.response }
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
      const voting = {
        ...turn,
        // Use the random answer IDs so roster order cannot identify authors.
        challenges: challenges.sort((a, b) => a.id.localeCompare(b.id)),
        votes,
        phase: 'voting' as const,
        deadline: now + turn.durations.voting
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
      return { ...turn, phase: 'scoring', deadline: now + turn.durations.scoring };
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
  savedResult?: Result
): RoomView {
  const base = { code, players, hostId, you, serverTime: now, entries: [] };
  if (!turn)
    return savedResult
      ? { ...base, phase: 'complete', result: savedResult }
      : { ...base, phase: 'lobby' };
  const { phase, deadline, answeringId, prompt, original, challenges, result } =
    turn;
  const answering = answeringId === you;
  const previewing = phase === 'modifier-preview' || phase === 'prompt-preview';
  const entries = turn.review ? challenges.filter(({ id }) => turn.review!.answerIds.includes(id))
    : !original ? []
    : phase === 'voting' ? [original, ...challenges]
    : phase === 'response' ? [original]
    : [];
  return {
    ...base,
    phase,
    deadline,
    answeringId,
    prompt: previewing && (!answering || phase === 'modifier-preview') ? undefined : prompt,
    result,
    turnId: turn.id,
    phaseDuration: phase === 'complete' ? undefined : turn.durations[phase],
    previewWait:
      !answering && previewing && deadline !== undefined
        ? {
            deadline: deadline + (phase === 'modifier-preview' ? turn.durations['prompt-preview'] : 0),
            duration: turn.durations['modifier-preview'] + turn.durations['prompt-preview']
          }
        : undefined,
    modifier: !result && answering && phase !== 'prompt-preview' ? turn.modifier : undefined,
    entries: entries.map(({ id, text, disqualified }) => ({ id, text, disqualified })),
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
