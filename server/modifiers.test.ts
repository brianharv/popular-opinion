import { expect, test } from 'vitest';
import { modifiers, scoreModifier } from './modifiers';

const players = ['a', 'b', 'c', 'd', 'e', 'f'];
const challenges = [
  { id: 'x', authorId: 'b', text: 'Paris' },
  { id: 'y', authorId: 'c', text: 'Rome' }
];

test.each([
  ['The College Try', 7, 4, false],
  ['Panderer', 4, 4, false],
  ['Ice Breaker', 6, 4, false],
  ['The Troll', 4, 0, false],
  ['Provocateur', 6, 4, false],
  ['Touché', 5, 4, false],
  ['Deadlock', 15, 0, false],
  ['Good Yard, Sir', 15, 4, false],
  ['Suddenly Libertarian', 4, 4, false],
  ['Finsta', 8, 1, false],
  ['Double Down', 8, 4, true],
  ['The Ambien Defense', 7, 4, false]
] as const)(
  '%s scores a tied challenger ballot',
  (name, answering, challenger, bonusTurn) => {
    expect(
      scoreModifier(name, 'a', players, challenges, { x: 1, y: 1 }, 1)
    ).toEqual({
      awards: { a: answering, b: challenger, c: challenger, d: 0, e: 0, f: 0 },
      bonusTurn
    });
  }
);

test('only the confirmed exceptions score when everyone challenges', () => {
  const allChallenges = [
    ...challenges,
    { id: 'z', authorId: 'd', text: 'Oslo' }
  ];
  const overrides: Record<string, number> = {
    'The Troll': 33,
    Provocateur: -5,
    'Suddenly Libertarian': 4
  };
  for (const { name } of modifiers) {
    expect(
      scoreModifier(
        name,
        'a',
        players.slice(0, 4),
        allChallenges,
        { x: 0, y: 0, z: 0 },
        0
      )
    ).toEqual({
      awards: { a: overrides[name] ?? 0, b: 0, c: 0, d: 0 },
      bonusTurn: false
    });
  }
});

test('disqualified challenges still count and Finsta deducts from each', () => {
  const entries = [
    ...challenges.map((entry) => ({ ...entry, disqualified: true })),
    { id: 'z', authorId: 'd', text: 'Oslo' }
  ];
  const score = (name: Parameters<typeof scoreModifier>[0]) =>
    scoreModifier(name, 'a', players, entries, { x: 0, y: 0, z: 1 }, 1).awards;
  expect(score('The Troll').a).toBe(6);
  expect(score('Panderer').a).toBe(-2);
  expect(score('Finsta')).toEqual({ a: 8, b: -3, c: -3, d: 1, e: 0, f: 0 });
});

test('a challenger lead earns Ambien a bonus and wipes out Double Down', () => {
  const score = (name: 'Double Down' | 'The Ambien Defense') =>
    scoreModifier(
      name,
      'a',
      players.slice(0, 4),
      challenges,
      { x: 1, y: 0 },
      0
    );
  expect(score('Double Down')).toMatchObject({
    awards: { a: 0, b: 4 },
    bonusTurn: false
  });
  expect(score('The Ambien Defense')).toMatchObject({
    awards: { a: 2, b: 4 },
    bonusTurn: true
  });
});
