import { expect, test } from 'vitest';
import { personas, scorePersona } from './personas';

const players = ['a', 'b', 'c', 'd', 'e', 'f'];
const challenges = [
  { id: 'x', authorId: 'b', text: 'Paris' },
  { id: 'y', authorId: 'c', text: 'Rome' }
];

test('The Panderer earns a five-point bonus when nobody challenges', () => {
  expect(scorePersona('The Panderer', 'a', players.slice(0, 4), [], {}, 3).awards)
    .toEqual({ a: 17, b: 0, c: 0, d: 0 });
});

test('The Provocateur doubles points when challengers receive no votes', () => {
  expect(scorePersona('The Provocateur', 'a', players, challenges, { x: 0, y: 0 }, 3).awards)
    .toEqual({ a: 20, b: -1, c: -1, d: 0, e: 0, f: 0 });
});

test.each([
  ['Painfully Earnest', 7, 4, false],
  ['The Panderer', 4, 4, false],
  ['The Ice Breaker', 6, 4, false],
  ['The Troll', 4, 0, false],
  ['The Provocateur', 6, 4, false],
  ['The Bipartisan', 10, 0, false],
  ['Yojimbo', 10, 0, false],
  ['Sir John Falstaff', 9, 4, false],
  ['Suddenly Libertarian', 6, 4, false],
  ['The Finsta', 8, 1, false],
  ['The Double Down', 8, 4, true],
  ['The Ambien Defense', 7, 4, false],
  ['The Daydreamer', 7, 4, false],
  ['The Karma Farmer', 4, 4, true],
  ['Ken M.', 4, -2, true],
  ['TL;DR', 2, 5, false],
  ['Portia, Reader of the Papers', 6, 4, true],
  ['Good Bot', 4, 4, false],
  ['Mr. Agreeable', 4, 4, false]
] as const)(
  '%s scores a tied challenger ballot',
  (name, answering, challenger, bonusTurn) => {
    expect(
      scorePersona(name, 'a', players, challenges, { x: 1, y: 1 }, 1)
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
  const result = scorePersona('The Bipartisan', 'a', [...players, 'g', 'h', 'i'], challenges, totals, retained);
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
  const result = scorePersona('Yojimbo', 'a', roster, entries, totals, retained);
  const expectedAwards = Object.fromEntries(roster.map(id => [id, id === 'a' ? expected : 0]));
  entries.forEach(({ authorId }, index) => {
    if (votes[index] === 0) expectedAwards[authorId] = -1;
  });
  expect(result.awards).toEqual(expectedAwards);
});

test('The Daydreamer copies the highest challenger award and adds three', () => {
  expect(scorePersona('The Daydreamer', 'a', players, challenges, { x: 2, y: 1 }, 0).awards)
    .toEqual({ a: 11, b: 8, c: 2, d: 0, e: 0, f: 0 });
  expect(scorePersona('The Daydreamer', 'a', players, [], {}, 5).awards.a).toBe(3);
});

test('the new challenger rules preserve the distinct tallies', () => {
  const roster = [...players, 'g'];
  const totals = { x: 2, y: 1 };
  expect(scorePersona('TL;DR', 'a', roster, challenges, totals, 1).awards)
    .toMatchObject({ a: 2, b: 10, c: 3 });
  expect(scorePersona('Mr. Agreeable', 'a', roster, challenges, totals, 1).awards)
    .toMatchObject({ a: 8, b: 8, c: 0 });
});

test('FIFA President rounds up the award for every initial supporter', () => {
  expect(scorePersona('FIFA President', 'a', players, challenges, { x: 1, y: 1 }, 1).awards)
    .toEqual({ a: 5, b: 0, c: 0, d: 3, e: 3, f: 3 });
});

test('the answering player loses one point when everyone challenges unless the persona overrides it', () => {
  const allChallenges = [
    ...challenges,
    { id: 'z', authorId: 'd', text: 'Oslo' }
  ];
  const overrides: Record<string, number> = {
    'The Troll': 21,
    'The Provocateur': -5,
    'Suddenly Libertarian': 9,
    'Ken M.': 5
  };
  for (const { name } of personas) {
    const challengerPoints = name === 'Ken M.' ? -2 : 0;
    const challengerAwards = { b: challengerPoints, c: challengerPoints, d: challengerPoints };
    expect(
      scorePersona(
        name,
        'a',
        players.slice(0, 4),
        allChallenges,
        { x: 0, y: 0, z: 0 },
        0
      )
    ).toEqual({
      awards: { a: overrides[name] ?? -1, ...challengerAwards },
      bonusTurn: name === 'The Karma Farmer' || name === 'Ken M.'
    });
  }
});

test('disqualified challenges still count and The Finsta leaves their awards at zero', () => {
  const entries = [
    ...challenges.map((entry) => ({ ...entry, disqualified: true })),
    { id: 'z', authorId: 'd', text: 'Oslo' }
  ];
  const score = (name: Parameters<typeof scorePersona>[0]) =>
    scorePersona(name, 'a', players, entries, { x: 0, y: 0, z: 1 }, 1).awards;
  expect(score('The Troll').a).toBe(6);
  expect(score('The Panderer')).toEqual({ a: -2, b: -2, c: -2, d: 4, e: 0, f: 0 });
  expect(score('Yojimbo')).toEqual({ a: 0, b: -2, c: -2, d: 0, e: 0, f: 0 });
  expect(score('The Finsta')).toEqual({ a: 8, b: 0, c: 0, d: 1, e: 0, f: 0 });
  expect(score('Ken M.')).toEqual({ a: 6, b: -4, c: -4, d: -2, e: 0, f: 0 });
});

test('Suddenly Libertarian triples retained votes when they outnumber challengers', () => {
  expect(scorePersona('Suddenly Libertarian', 'a', players, challenges, { x: 0, y: 0 }, 3).awards)
    .toEqual({ a: 9, b: -1, c: -1, d: 0, e: 0, f: 0 });
});

test('The Finsta awards no bonus when round points are tied after deductions', () => {
  expect(scorePersona('The Finsta', 'a', [...players, 'g', 'h', 'i'], challenges, { x: 3, y: 0 }, 3).awards)
    .toMatchObject({ a: 9, b: 9, c: 0 });
});

test('The Finsta floors a positive challenger award below three at zero', () => {
  expect(scorePersona('The Finsta', 'a', players, challenges, { x: 2, y: 1 }, 0).awards)
    .toMatchObject({ a: 0, b: 5, c: 0 });
});

test('a challenger lead earns Ambien a bonus and wipes out The Double Down', () => {
  const score = (name: 'The Double Down' | 'The Ambien Defense') =>
    scorePersona(
      name,
      'a',
      players.slice(0, 4),
      challenges,
      { x: 1, y: 0 },
      0
    );
  expect(score('The Double Down')).toMatchObject({
    awards: { a: 0, b: 4 },
    bonusTurn: false
  });
  expect(score('The Ambien Defense')).toMatchObject({
    awards: { a: 2, b: 4 },
    bonusTurn: true
  });
});
