import type { Entry } from '../shared/protocol';

// Rules follow the Game Bible Persona catalog.
export const personas = [
  {
    name: 'Painfully Earnest',
    rule: '2 points per support vote plus 1 point per retained vote. Double this amount if nobody challenged.'
  },
  {
    name: 'The Panderer',
    rule: 'Score 3 points per support vote plus 1 point per retained vote. Subtract 3 points per challenger. Gain 5 bonus points if nobody challenged.'
  },
  {
    name: 'The Ice Breaker',
    rule: 'Lose 3 points if nobody challenged. Otherwise triple the sum of your retained votes and the highest vote count received by a challenger.'
  },
  {
    name: 'The Troll',
    rule: 'Earn 2 points per challenger. Earn an additional 5 points if you retain zero votes. If everyone challenges, double your score and then subtract 1 point. Challengers cannot gain or lose points.'
  },
  {
    name: 'The Provocateur',
    rule: '2 points per challenger plus 2 points per retained vote. Double your points if at least one opponent challenges and no challenger receives a vote. If every opponent challenges, lose 5 points instead.'
  },
  {
    name: 'The Bipartisan',
    rule: 'Your goal is to retain at least one vote while ending the round with the same vote tally as another challenger. Do this and score 10 points this round. Challengers cannot gain or lose points.'
  },
  {
    name: 'Yojimbo',
    rule: 'Your goal is to get at least 2 challengers to tie in votes. If this happens, score 5 points for each tying challenger. Challengers cannot gain points.'
  },
  {
    name: 'Sir John Falstaff',
    rule: 'Score 1 point per challenger and 2 points per retained vote. If you end the round with the most votes, gain 5 bonus points.'
  },
  {
    name: 'Suddenly Libertarian',
    rule: 'Take whichever is higher: your retained votes or the number of challengers. Triple that number. This still applies if everyone challenges.'
  },
  {
    name: 'The Finsta',
    rule: "Score 3 points per retained vote. At scoring, deduct 3 points from each challenger's point total for this round. If you score the most points this round, earn a bonus 5 points."
  },
  {
    name: 'The Double Down',
    rule: 'Score 2 points per support vote plus 2 points per retained vote. If you score the highest this round, take a bonus turn. Otherwise your score this turn is zero.'
  },
  {
    name: 'The Ambien Defense',
    rule: 'Score 2 points per support vote plus 1 point per retained vote. Unless you score the highest this turn, take a bonus turn.'
  },
  {
    name: 'The Daydreamer',
    rule: 'Your answer is tangentially related at best. Set your score to that of the highest scoring challenger and add 3 bonus points.'
  },
  {
    name: 'The Karma Farmer',
    rule: 'Score 1 point for each support vote and each retained vote. Take another turn.'
  },
  {
    name: 'Ken M.',
    rule: 'Score 2 points for each challenger. Instead of scoring, each challenger loses 2 points. Disqualified challengers lose 2 more. If everyone challenges, subtract 1 point from your award. Take another turn.'
  },
  {
    name: 'TL;DR',
    rule: 'Score 2 points per retained vote. Challengers score an extra point per vote.'
  },
  {
    name: 'Portia, Reader of the Papers',
    rule: 'Gain 1 point per player. Take another turn.'
  },
  {
    name: 'Good Bot',
    rule: 'Score 1 point per support and 1 point per retained vote.'
  },
  {
    name: 'Mr. Agreeable',
    rule: 'Only the challenger with the most votes (ties included) scores. You score the same amount this round.'
  },
  {
    name: 'FIFA President',
    rule: 'Score 1 point per support and 2 per retained vote. Supporters gain half these points. Challengers do not score.'
  }
] as const;

type PersonaName = (typeof personas)[number]['name'];

export function scorePersona(
  name: PersonaName,
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
  let bonusTurn = name === 'The Karma Farmer';

  if (
    support > 0 &&
    name !== 'The Troll' &&
    name !== 'The Bipartisan' &&
    name !== 'Ken M.' &&
    name !== 'FIFA President'
  ) {
    for (const entry of challenges) {
      const votes = totals[entry.id];
      if (entry.disqualified) {
        if (name !== 'Mr. Agreeable') awards[entry.authorId] = -2;
        continue;
      }
      if (name === 'Mr. Agreeable' && votes !== best) continue;
      if (votes === 0) {
        if (name !== 'Mr. Agreeable') awards[entry.authorId] = -1;
        continue;
      }
      if (name === 'Yojimbo') continue;
      awards[entry.authorId] = votes * (votes === best ? 4 : 2);
      if (name === 'TL;DR') awards[entry.authorId] += votes;
    }
  }

  const leads = (points: number) =>
    playerIds.every((id) => id === answeringId || points > awards[id]);

  if (name === 'Ken M.') {
    award = 2 * count - (support === 0 ? 1 : 0);
    for (const { authorId, disqualified } of challenges) {
      awards[authorId] = disqualified ? -4 : -2;
    }
    bonusTurn = true;
  } else if (support === 0) {
    award = -1;
    if (name === 'The Troll') award = (2 * count + 5) * 2 - 1;
    if (name === 'The Provocateur') award = -5;
    if (name === 'Suddenly Libertarian') award = 3 * count;
  } else {
    switch (name) {
      case 'Painfully Earnest':
        award = (2 * support + retained) * (count === 0 ? 2 : 1);
        break;
      case 'The Panderer':
        award = 3 * support + retained - 3 * count + (count === 0 ? 5 : 0);
        break;
      case 'The Ice Breaker':
        award = count === 0 ? -3 : 3 * (retained + best);
        break;
      case 'The Troll':
        award = 2 * count + (retained === 0 ? 5 : 0);
        break;
      case 'The Provocateur':
        award = (2 * count + 2 * retained) * (count > 0 && best === 0 ? 2 : 1);
        break;
      case 'The Bipartisan':
        award =
          retained > 0 &&
          challenges.some((entry) => totals[entry.id] === retained)
            ? 10
            : 0;
        break;
      case 'Yojimbo': {
        const challengersByTally = new Map<number, number>();
        for (const entry of challenges) {
          const votes = totals[entry.id];
          if (!entry.disqualified && votes > 0) {
            challengersByTally.set(
              votes,
              (challengersByTally.get(votes) ?? 0) + 1
            );
          }
        }
        for (const count of challengersByTally.values()) {
          if (count >= 2) award += 5 * count;
        }
        break;
      }
      case 'Sir John Falstaff':
        award = count + 2 * retained + (retained >= best ? 5 : 0);
        break;
      case 'Suddenly Libertarian':
        award = 3 * Math.max(retained, count);
        break;
      case 'The Finsta':
        for (const { authorId } of challenges) {
          awards[authorId] = Math.max(0, awards[authorId] - 3);
        }
        award = 3 * retained;
        if (leads(award)) award += 5;
        break;
      case 'The Double Down':
        award = 2 * support + 2 * retained;
        bonusTurn = leads(award);
        if (!bonusTurn) award = 0;
        break;
      case 'The Ambien Defense':
        award = 2 * support + retained;
        bonusTurn = !leads(award);
        break;
      case 'The Daydreamer':
        award =
          Math.max(0, ...challenges.map(({ authorId }) => awards[authorId])) +
          3;
        break;
      case 'The Karma Farmer':
      case 'Good Bot':
        award = support + retained;
        break;
      case 'TL;DR':
        award = 2 * retained;
        break;
      case 'Portia, Reader of the Papers':
        award = playerIds.length;
        bonusTurn = true;
        break;
      case 'Mr. Agreeable':
        award = Math.max(...Object.values(awards));
        break;
      case 'FIFA President': {
        award = support + 2 * retained;
        const challengerIds = new Set(
          challenges.map(({ authorId }) => authorId)
        );
        for (const id of playerIds) {
          if (id !== answeringId && !challengerIds.has(id)) {
            awards[id] = Math.ceil(award / 2);
          }
        }
        break;
      }
    }
  }

  awards[answeringId] = award;
  return { awards, bonusTurn };
}
