import { expect, test } from 'vitest';
import { personas } from '../../shared/personas';
import { scorePersona } from '../persona-scoring';

const players = ['a', 'b', 'c', 'd', 'e', 'f'];
const challenges = [
  { id: 'x', authorId: 'b', text: 'Paris' },
  { id: 'y', authorId: 'c', text: 'Rome' }
];

test('The Panderer earns a five-point bonus when nobody challenges', () => {
  expect(scorePersona('panderer', 'a', players.slice(0, 4), [], {}, 3).awards)
    .toEqual({ a: 17, b: 0, c: 0, d: 0 });
});

test('The Provocateur doubles points when challengers receive no votes', () => {
  expect(scorePersona('provocateur', 'a', players, challenges, { x: 0, y: 0 }, 3).awards)
    .toEqual({ a: 20, b: -1, c: -1, d: 0, e: 0, f: 0 });
});

test.each([
  ['painfully-earnest', 7, 4, false],
  ['panderer', 4, 4, false],
  ['ice-breaker', 6, 4, false],
  ['troll', 4, 0, false],
  ['provocateur', 6, 4, false],
  ['bipartisan', 10, 0, false],
  ['yojimbo', 10, 0, false],
  ['sir-john-falstaff', 9, 4, false],
  ['suddenly-libertarian', 6, 4, false],
  ['finsta', 3, 3, false],
  ['double-down', 8, 4, false],
  ['ambien-defense', 7, 4, false],
  ['daydreamer', 7, 4, false],
  ['karma-farmer', 4, 4, true],
  ['ken-m', 4, -2, true],
  ['tl-dr', 2, 5, false],
  ['portia-reader-of-the-papers', 6, 4, true],
  ['good-bot', 4, 4, false],
  ['mr-agreeable', 4, 4, false]
] as const)(
  '%s scores a tied challenger ballot',
  (id, answering, challenger, bonusTurn) => {
    expect(
      scorePersona(id, 'a', players, challenges, { x: 1, y: 1 }, 1)
    ).toEqual({
      awards: { a: answering, b: challenger, c: challenger, d: 0, e: 0, f: 0 },
      bonusTurn
    });
  }
);

test.each([
  { retained: 3, totals: { x: 3, y: 0 }, expected: 10 },
  { retained: 2, totals: { x: 3, y: 1 }, expected: 0 },
  { retained: 0, totals: { x: 6, y: 0 }, expected: 0 }
])('The Bipartisan awards $expected with $retained retained votes', ({ retained, totals, expected }) => {
  const result = scorePersona('bipartisan', 'a', [...players, 'g', 'h', 'i'], challenges, totals, retained);
  expect(result.awards).toMatchObject({ a: expected, b: 0, c: 0 });
});

test.each([
  { votes: [1, 1, 2, 2, 0], expected: 20 },
  { votes: [1, 1, 1, 0, 0], expected: 15 },
  { votes: [1, 2, 3, 0, 0], expected: 0 }
])('Yojimbo awards $expected for challenger tallies $votes', ({ votes, expected }) => {
  const roster = [...players, 'g', 'h', 'i', 'j', 'k', 'l'];
  const entries = roster.slice(1, 6).map((authorId, index) => ({
    id: String(index), authorId, text: authorId
  }));
  const totals = Object.fromEntries(votes.map((tally, index) => [String(index), tally]));
  const retained = 6 - votes.reduce((sum, tally) => sum + tally, 0);
  const result = scorePersona('yojimbo', 'a', roster, entries, totals, retained);
  const expectedAwards = Object.fromEntries(roster.map(id => [id, id === 'a' ? expected : 0]));
  entries.forEach(({ authorId }, index) => {
    if (votes[index] === 0) expectedAwards[authorId] = -1;
  });
  expect(result.awards).toEqual(expectedAwards);
});

test('The Daydreamer copies the highest challenger award and adds three', () => {
  expect(scorePersona('daydreamer', 'a', players, challenges, { x: 2, y: 1 }, 0).awards)
    .toEqual({ a: 11, b: 8, c: 2, d: 0, e: 0, f: 0 });
  expect(scorePersona('daydreamer', 'a', players, [], {}, 5).awards.a).toBe(3);
});

test('the new challenger rules preserve the distinct tallies', () => {
  const roster = [...players, 'g'];
  const totals = { x: 2, y: 1 };
  expect(scorePersona('tl-dr', 'a', roster, challenges, totals, 1).awards)
    .toMatchObject({ a: 2, b: 10, c: 3 });
  expect(scorePersona('mr-agreeable', 'a', roster, challenges, totals, 1).awards)
    .toMatchObject({ a: 8, b: 8, c: 0 });
});

test('The Crowdsourcer awards the roster size to every initial supporter, even those who switch', () => {
  expect(scorePersona('crowdsourcer', 'a', players, challenges, { x: 1, y: 1 }, 1).awards)
    .toEqual({ a: 6, b: 4, c: 4, d: 6, e: 6, f: 6 });
});

test('FIFA President rounds up the award for every initial supporter', () => {
  expect(scorePersona('fifa-president', 'a', players, challenges, { x: 1, y: 1 }, 1).awards)
    .toEqual({ a: 5, b: 0, c: 0, d: 3, e: 3, f: 3 });
});

test('the answering player loses one point when everyone challenges unless the persona overrides it', () => {
  const allChallenges = [
    ...challenges,
    { id: 'z', authorId: 'd', text: 'Oslo' }
  ];
  const overrides: Record<string, number> = {
    'troll': 21,
    'provocateur': -5,
    'suddenly-libertarian': 9,
    'ken-m': 5
  };
  for (const { id } of personas) {
    const challengerPoints = id === 'ken-m' ? -2 : 0;
    const challengerAwards = { b: challengerPoints, c: challengerPoints, d: challengerPoints };
    expect(
      scorePersona(
        id,
        'a',
        players.slice(0, 4),
        allChallenges,
        { x: 0, y: 0, z: 0 },
        0
      )
    ).toEqual({
      awards: { a: overrides[id] ?? -1, ...challengerAwards },
      bonusTurn: id === 'karma-farmer' || id === 'ken-m'
    });
  }
});

test('disqualified challenges still count and The Finsta leaves their awards at zero', () => {
  const entries = [
    ...challenges.map((entry) => ({ ...entry, disqualified: true })),
    { id: 'z', authorId: 'd', text: 'Oslo' }
  ];
  const score = (id: Parameters<typeof scorePersona>[0]) =>
    scorePersona(id, 'a', players, entries, { x: 0, y: 0, z: 1 }, 1).awards;
  expect(score('troll').a).toBe(6);
  expect(score('panderer')).toEqual({ a: -2, b: -2, c: -2, d: 4, e: 0, f: 0 });
  expect(score('yojimbo')).toEqual({ a: 0, b: -2, c: -2, d: 0, e: 0, f: 0 });
  expect(score('finsta')).toEqual({ a: 3, b: 0, c: 0, d: 3, e: 0, f: 0 });
  expect(score('ken-m')).toEqual({ a: 6, b: -4, c: -4, d: -2, e: 0, f: 0 });
});

test('Suddenly Libertarian triples retained votes when they outnumber challengers', () => {
  expect(scorePersona('suddenly-libertarian', 'a', players, challenges, { x: 0, y: 0 }, 3).awards)
    .toEqual({ a: 9, b: -1, c: -1, d: 0, e: 0, f: 0 });
});

test('The Finsta awards no bonus when round points are tied after deductions', () => {
  expect(scorePersona('finsta', 'a', players.slice(0, 5), challenges, { x: 1, y: 0 }, 1).awards)
    .toMatchObject({ a: 3, b: 3, c: 0 });
});

test('The Finsta subtracts one point from both leading and trailing challengers', () => {
  expect(scorePersona('finsta', 'a', players, challenges, { x: 2, y: 1 }, 0).awards)
    .toMatchObject({ a: 0, b: 7, c: 1 });
});

test('a challenger lead earns Ambien a bonus and wipes out The Double Down', () => {
  const score = (id: 'double-down' | 'ambien-defense') =>
    scorePersona(
      id,
      'a',
      players.slice(0, 4),
      challenges,
      { x: 1, y: 0 },
      0
    );
  expect(score('double-down')).toMatchObject({
    awards: { a: 0, b: 4 },
    bonusTurn: false
  });
  expect(score('ambien-defense')).toMatchObject({
    awards: { a: 2, b: 4 },
    bonusTurn: true
  });
});
