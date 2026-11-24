import { expect, test } from 'vitest';
import { personas, scorePersona } from './personas';

const players = ['a', 'b', 'c', 'd', 'e', 'f'];
const challenges = [
  { id: 'x', authorId: 'b', text: 'Paris' },
  { id: 'y', authorId: 'c', text: 'Rome' }
];

test.each([
  ['Painfully Earnest', 7, 4, false],
  ['The Panderer', 4, 4, false],
  ['The Ice Breaker', 6, 4, false],
  ['The Troll', 4, 0, false],
  ['The Provocateur', 6, 4, false],
  ['The Bipartisan', 10, 0, false],
  ['Yojimbo', 10, 0, false],
  ['Sir John Falstaff', 9, 4, false],
  ['Suddenly Libertarian', 1, 4, false],
  ['The Finsta', 8, 1, false],
  ['The Double Down', 8, 4, true],
  ['The Ambien Defense', 7, 4, false],
  ['The Daydreamer', 7, 4, false],
  ['The Karma Farmer', 4, 4, true],
  ['Ken M.', 4, -2, true]
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
  expect(result.awards).toEqual(Object.fromEntries(roster.map(id => [id, id === 'a' ? expected : 0])));
});

test('The Daydreamer copies the highest challenger award and adds three', () => {
  expect(scorePersona('The Daydreamer', 'a', players, challenges, { x: 2, y: 1 }, 0).awards)
    .toEqual({ a: 11, b: 8, c: 2, d: 0, e: 0, f: 0 });
  expect(scorePersona('The Daydreamer', 'a', players, [], {}, 5).awards.a).toBe(3);
});

test('only the confirmed exceptions score when everyone challenges', () => {
  const allChallenges = [
    ...challenges,
    { id: 'z', authorId: 'd', text: 'Oslo' }
  ];
  const overrides: Record<string, number> = {
    'The Troll': 33,
    'The Provocateur': -5,
    'Suddenly Libertarian': 4,
    'Ken M.': 6
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
      awards: { a: overrides[name] ?? 0, ...challengerAwards },
      bonusTurn: name === 'The Karma Farmer' || name === 'Ken M.'
    });
  }
});

test('disqualified challenges still count and The Finsta deducts from each', () => {
  const entries = [
    ...challenges.map((entry) => ({ ...entry, disqualified: true })),
    { id: 'z', authorId: 'd', text: 'Oslo' }
  ];
  const score = (name: Parameters<typeof scorePersona>[0]) =>
    scorePersona(name, 'a', players, entries, { x: 0, y: 0, z: 1 }, 1).awards;
  expect(score('The Troll').a).toBe(6);
  expect(score('The Panderer').a).toBe(-2);
  expect(score('The Finsta')).toEqual({ a: 8, b: -3, c: -3, d: 1, e: 0, f: 0 });
  expect(score('Ken M.')).toEqual({ a: 6, b: -2, c: -2, d: -2, e: 0, f: 0 });
});

test('The Finsta awards no bonus when round points are tied after deductions', () => {
  expect(scorePersona('The Finsta', 'a', [...players, 'g', 'h', 'i'], challenges, { x: 3, y: 0 }, 3).awards)
    .toMatchObject({ a: 9, b: 9, c: -3 });
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
