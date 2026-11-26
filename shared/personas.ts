// Card text follows the Game Bible Persona catalog.
export const personas = [
  {
    id: 'painfully-earnest',
    name: 'Painfully Earnest',
    subtitle: "Who's a good boy?",
    rule: '2 points per support vote plus 1 point per retained vote. Double this amount if nobody challenged.'
  },
  {
    id: 'panderer',
    name: 'The Panderer',
    subtitle: 'Shut up and play the hits to the cheap seats.',
    rule: 'Score 3 points per support vote plus 1 point per retained vote. Subtract 3 points per challenger. Gain 5 bonus points if nobody challenged.'
  },
  {
    id: 'ice-breaker',
    name: 'The Ice Breaker',
    subtitle: '“Let’s give them something to talk about.”',
    rule: 'Lose 3 points if nobody challenged. Otherwise triple the sum of your retained votes and the highest vote count received by a challenger.'
  },
  {
    id: 'troll',
    name: 'The Troll',
    subtitle:
      '“If you don’t have anything nice to say, say it on the internet.”',
    rule: 'Earn 2 points per challenger. Earn an additional 5 points if you retain zero votes. If everyone challenges, double your score and then subtract 1 point. Challengers cannot gain or lose points.'
  },
  {
    id: 'provocateur',
    name: 'The Provocateur',
    subtitle: 'You never met a pot that didn’t need stirring.',
    rule: '2 points per challenger plus 2 points per retained vote. Double your points if at least one opponent challenges and no challenger receives a vote. If every opponent challenges, lose 5 points instead.'
  },
  {
    id: 'bipartisan',
    name: 'The Bipartisan',
    subtitle: "To each their own (even though you're wrong).",
    rule: 'Your goal is to retain at least one vote while ending the round with the same vote tally as another challenger. Do this and score 10 points this round. Challengers cannot gain or lose points.'
  },
  {
    id: 'yojimbo',
    name: 'Yojimbo',
    subtitle: '“It would seem we have reached an impasse.”',
    rule: 'Your goal is to get at least 2 challengers to tie in votes. If this happens, score 5 points for each tying challenger. Challengers cannot gain points.'
  },
  {
    id: 'sir-john-falstaff',
    name: 'Sir John Falstaff',
    subtitle: 'In vino veritas.',
    rule: 'Score 1 point per challenger and 2 points per retained vote. If you end the round with the most votes, gain 5 bonus points.'
  },
  {
    id: 'suddenly-libertarian',
    name: 'Suddenly Libertarian',
    subtitle:
      'A common maneuver observed in parents trying to stay on the right side of history.',
    rule: 'Take whichever is higher: your retained votes or the number of challengers. Triple that number. This still applies if everyone challenges.'
  },
  {
    id: 'finsta',
    name: 'The Finsta',
    subtitle:
      'The recommended method for arguing with strangers on the social media platform you just bought.',
    rule: "Score 3 points per retained vote. At scoring, deduct 1 point from each challenger's point total for this round. If you score the most points this round, earn a bonus 5 points."
  },
  {
    id: 'double-down',
    name: 'The Double Down',
    subtitle:
      'Prediction markets say this is a key indicator of a forthcoming “break from socials.”',
    rule: 'Score 2 points for each support and retained vote. If you do not score the highest this round, your score is 0 this turn.'
  },
  {
    id: 'ambien-defense',
    name: 'The Ambien Defense',
    subtitle:
      'Side effects include dizziness, dry-mouth, and spontaneous racist tirades brought on by transcontinental flight.',
    rule: 'Score 2 points per support vote plus 1 point per retained vote. Unless you score the highest this turn, take a bonus turn.'
  },
  {
    id: 'daydreamer',
    name: 'The Daydreamer',
    subtitle: '“Could you repeat the question?”',
    rule: 'Your answer is tangentially related at best. Set your score to that of the highest scoring challenger and add 3 bonus points.'
  },
  {
    id: 'karma-farmer',
    name: 'The Karma Farmer',
    subtitle: "It ain't much, but it's honest work.",
    rule: 'Score 1 point for each support vote and each retained vote. Take another turn.'
  },
  {
    id: 'ken-m',
    name: 'Ken M.',
    subtitle:
      "“you'd be suprised at how many people dont know anything about knowledge and yet we should forgive them for they know not what they not know.”",
    rule: 'Score 2 points for each challenger. Instead of scoring, each challenger loses 2 points. Disqualified challengers lose 2 more. If everyone challenges, subtract 1 point from your award. Take another turn.'
  },
  {
    id: 'tl-dr',
    name: 'TL;DR',
    subtitle:
      "It's time to make some sweeping claims based on that headline you read.",
    rule: 'Score 2 points per retained vote. Challengers score an extra point per vote.'
  },
  {
    id: 'portia-reader-of-the-papers',
    name: 'Portia, Reader of the Papers',
    subtitle: "You know what's up.",
    rule: 'Gain 1 point per player. Take another turn.'
  },
  {
    id: 'good-bot',
    name: 'Good Bot',
    subtitle: 'Beep boop beep',
    rule: 'Score 1 point per support and 1 point per retained vote.'
  },
  {
    id: 'mr-agreeable',
    name: 'Mr. Agreeable',
    subtitle: 'What he said.',
    rule: 'Only the challenger with the most votes (ties included) scores. You score the same amount this round.'
  },
  {
    id: 'fifa-president',
    name: 'FIFA President',
    subtitle: 'Kickbacks, get it? Soccer? Kick?',
    rule: 'Score 1 point per support and 2 per retained vote. Supporters gain half these points. Challengers do not score.'
  },
  {
    id: 'crowdsourcer',
    name: 'The Crowdsourcer',
    subtitle: 'You can finally fund that album, get out of medical debt, or go to Disnleyland again.',
    rule: 'Score 2 points per support vote. Supporters score points equal to the number of players in the game.'
  }
] as const;

export type PersonaId = (typeof personas)[number]['id'];

// Old checkpoints stored the display name and rule without an ID.
const legacyIds: Readonly<Record<string, PersonaId | undefined>> = {
  'The College Try': 'painfully-earnest',
  Panderer: 'panderer',
  'Ice Breaker': 'ice-breaker',
  Provocateur: 'provocateur',
  Provacateur: 'provocateur',
  Touché: 'bipartisan',
  Bipartisan: 'bipartisan',
  Deadlock: 'yojimbo',
  Agitator: 'yojimbo',
  'Good Yard, Sir': 'sir-john-falstaff',
  'Good Yard Sir': 'sir-john-falstaff',
  Finsta: 'finsta',
  'Double Down': 'double-down'
};

export function findPersona(persona: { id?: PersonaId; name: string }) {
  const id =
    persona.id ??
    (Object.hasOwn(legacyIds, persona.name)
      ? legacyIds[persona.name]
      : undefined);
  return id === undefined
    ? personas.find((card) => card.name === persona.name)
    : personas.find((card) => card.id === id);
}
