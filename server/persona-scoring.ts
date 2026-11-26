import type { Entry } from '../shared/protocol';
import type { PersonaId } from '../shared/personas';

export function scorePersona(
  id: PersonaId,
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
  let bonusTurn = id === 'karma-farmer';

  if (
    support > 0 &&
    id !== 'troll' &&
    id !== 'bipartisan' &&
    id !== 'ken-m' &&
    id !== 'fifa-president'
  ) {
    for (const entry of challenges) {
      const votes = totals[entry.id];
      if (entry.disqualified) {
        if (id !== 'mr-agreeable') awards[entry.authorId] = -2;
        continue;
      }
      if (id === 'mr-agreeable' && votes !== best) continue;
      if (votes === 0) {
        if (id !== 'mr-agreeable') awards[entry.authorId] = -1;
        continue;
      }
      if (id === 'yojimbo') continue;
      awards[entry.authorId] = votes * (votes === best ? 4 : 2);
      if (id === 'tl-dr') awards[entry.authorId] += votes;
    }
  }

  const leads = (points: number) =>
    playerIds.every((id) => id === answeringId || points > awards[id]);

  if (id === 'ken-m') {
    award = 2 * count - (support === 0 ? 1 : 0);
    for (const { authorId, disqualified } of challenges) {
      awards[authorId] = disqualified ? -4 : -2;
    }
    bonusTurn = true;
  } else if (support === 0) {
    award = -1;
    if (id === 'troll') award = (2 * count + 5) * 2 - 1;
    if (id === 'provocateur') award = -5;
    if (id === 'suddenly-libertarian') award = 3 * count;
  } else {
    switch (id) {
      case 'painfully-earnest':
        award = (2 * support + retained) * (count === 0 ? 2 : 1);
        break;
      case 'panderer':
        award = 3 * support + retained - 3 * count + (count === 0 ? 5 : 0);
        break;
      case 'ice-breaker':
        award = count === 0 ? -3 : 3 * (retained + best);
        break;
      case 'troll':
        award = 2 * count + (retained === 0 ? 5 : 0);
        break;
      case 'provocateur':
        award = (2 * count + 2 * retained) * (count > 0 && best === 0 ? 2 : 1);
        break;
      case 'bipartisan':
        award =
          retained > 0 &&
          challenges.some((entry) => totals[entry.id] === retained)
            ? 10
            : 0;
        break;
      case 'yojimbo': {
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
      case 'sir-john-falstaff':
        award = count + 2 * retained + (retained >= best ? 5 : 0);
        break;
      case 'suddenly-libertarian':
        award = 3 * Math.max(retained, count);
        break;
      case 'finsta':
        for (const { authorId } of challenges) {
          awards[authorId] = Math.max(0, awards[authorId] - 1);
        }
        award = 3 * retained;
        if (leads(award)) award += 5;
        break;
      case 'double-down':
        award = 2 * support + 2 * retained;
        if (!leads(award)) award = 0;
        break;
      case 'ambien-defense':
        award = 2 * support + retained;
        bonusTurn = !leads(award);
        break;
      case 'daydreamer':
        award =
          Math.max(0, ...challenges.map(({ authorId }) => awards[authorId])) +
          3;
        break;
      case 'karma-farmer':
      case 'good-bot':
        award = support + retained;
        break;
      case 'tl-dr':
        award = 2 * retained;
        break;
      case 'portia-reader-of-the-papers':
        award = playerIds.length;
        bonusTurn = true;
        break;
      case 'mr-agreeable':
        award = Math.max(...Object.values(awards));
        break;
      case 'fifa-president':
      case 'crowdsourcer': {
        award = id === 'fifa-president' ? support + 2 * retained : 2 * support;
        const supporterAward = id === 'fifa-president' ? Math.ceil(award / 2) : playerIds.length;
        const challengerIds = new Set(
          challenges.map(({ authorId }) => authorId)
        );
        for (const id of playerIds) {
          if (id !== answeringId && !challengerIds.has(id)) {
            awards[id] = supporterAward;
          }
        }
        break;
      }
    }
  }

  awards[answeringId] = award;
  return { awards, bonusTurn };
}
