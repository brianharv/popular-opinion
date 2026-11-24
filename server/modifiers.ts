import type { Entry } from '../shared/protocol';

// Rules follow the Game Bible Modifier catalog.
export const modifiers = [
  {
    name: 'The College Try',
    rule: '2 points per support vote plus 1 point per retained vote. Double this amount if nobody challenged.'
  },
  {
    name: 'Panderer',
    rule: 'Score 3 points per support vote plus 1 point per retained vote. Subtract 3 points per challenger. Gain 10 bonus points if nobody challenged.'
  },
  {
    name: 'Ice Breaker',
    rule: 'Lose 3 points if nobody challenged. Otherwise triple the sum of your retained votes and the highest vote count received by a challenger.'
  },
  {
    name: 'The Troll',
    rule: 'Earn 2 points per challenger. Earn an additional 5 points if you retain zero votes. Triple your score this round if everyone challenges. Lose 5 points if nobody challenges. Challengers earn no points.'
  },
  {
    name: 'Provacateur',
    rule: '2 points per challenger plus 2 points per retained vote. Triple if at least one opponent challenges and no challenger receives a vote. If every opponent challenges, lose 5 points instead.'
  },
  {
    name: 'Touché',
    rule: '5 points per retained vote if at least one vote was retained and any challenger receives the same number. Otherwise zero.'
  },
  {
    name: 'Deadlock',
    rule: 'Receive a bonus 3 points plus 2 points per retained vote. Triple if at least two challengers receive the same positive number of votes. Challengers do not score this round.'
  },
  {
    name: 'Good Yard, Sir',
    rule: '1 point per support vote plus 2 points per retained vote. Add 10 points if you lead or tie for the lead in final votes.'
  },
  {
    name: 'Suddenly Libertarian',
    rule: 'Take whichever is higher: your support votes or the number of challengers. Triple that number, then subtract 5 points. This still applies if everyone challenges.'
  },
  {
    name: 'Finsta',
    rule: "3 points per retained vote. Deduct 3 points from each challenger's point total this round (including disqualified challengers). Add 5 points to your score if you have a clear lead in points for the turn after these deductions."
  },
  {
    name: 'Double Down',
    rule: 'Score 2 points per support vote plus 2 points per retained vote. If you have a clear lead in points for the turn, take a bonus turn. Otherwise your score this turn is zero.'
  },
  {
    name: 'The Ambien Defense',
    rule: '2 points per support vote plus 1 point per retained vote. Take a bonus turn unless you score more points than every other player.'
  }
] as const;

type ModifierName = (typeof modifiers)[number]['name'];

export function scoreModifier(
  name: ModifierName,
  answeringId: string,
  playerIds: string[],
  challenges: Entry[],
  totals: Record<string, number>,
  retained: number
) {
  const awards = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const support = playerIds.length - 1 - challenges.length;
  const count = challenges.length;
  const best = Math.max(0, ...challenges.map((entry) => totals[entry.id]));
  let award = 0;
  let bonusTurn = false;

  if (support > 0 && name !== 'The Troll' && name !== 'Deadlock') {
    for (const entry of challenges) {
      if (!entry.disqualified) {
        const votes = totals[entry.id];
        awards[entry.authorId] = votes * (votes === best ? 4 : 2);
      }
    }
  }

  const leads = (points: number) =>
    playerIds.every((id) => id === answeringId || points > awards[id]);

  if (support === 0) {
    if (name === 'The Troll') award = (2 * count + 5) * 3;
    if (name === 'Provacateur') award = -5;
    if (name === 'Suddenly Libertarian') award = 3 * count - 5;
  } else {
    switch (name) {
      case 'The College Try':
        award = (2 * support + retained) * (count === 0 ? 2 : 1);
        break;
      case 'Panderer':
        award = 3 * support + retained - 3 * count + (count === 0 ? 10 : 0);
        break;
      case 'Ice Breaker':
        award = count === 0 ? -3 : 3 * (retained + best);
        break;
      case 'The Troll':
        award = 2 * count + (retained === 0 ? 5 : 0) - (count === 0 ? 5 : 0);
        break;
      case 'Provacateur':
        award = (2 * count + 2 * retained) * (count > 0 && best === 0 ? 3 : 1);
        break;
      case 'Touché':
        award =
          retained > 0 &&
          challenges.some((entry) => totals[entry.id] === retained)
            ? 5 * retained
            : 0;
        break;
      case 'Deadlock': {
        const positiveVotes = challenges
          .map((entry) => totals[entry.id])
          .filter((votes) => votes > 0);
        award =
          (3 + 2 * retained) *
          (new Set(positiveVotes).size < positiveVotes.length ? 3 : 1);
        break;
      }
      case 'Good Yard, Sir':
        award = support + 2 * retained + (retained >= best ? 10 : 0);
        break;
      case 'Suddenly Libertarian':
        award = 3 * Math.max(support, count) - 5;
        break;
      case 'Finsta':
        for (const entry of challenges) awards[entry.authorId] -= 3;
        award = 3 * retained;
        if (leads(award)) award += 5;
        break;
      case 'Double Down':
        award = 2 * support + 2 * retained;
        bonusTurn = leads(award);
        if (!bonusTurn) award = 0;
        break;
      case 'The Ambien Defense':
        award = 2 * support + retained;
        bonusTurn = !leads(award);
        break;
    }
  }

  awards[answeringId] = award;
  return { awards, bonusTurn };
}
