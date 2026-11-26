# Popular Opinion — Game Bible

Design reference for the browser version of Popular Opinion. Players gather in the same room and use their own devices to answer Prompts, support an answer, or challenge it. A private Persona determines how the Answering Player scores and can change what happens after scoring.

This edition uses the refined rulings in [AGENTS.md](https://chatgpt.com/library?file_id=libfile_dce70daf99a08191808d235ac1b08eac&account_id=personal). The card spreadsheet supplies the Prompt text. See **Open design decisions** for cases still awaiting a ruling.

## Match setup and winning

Use a private room for 4–12 players. The game is designed for co-located play. Global and regional matchmaking are outside v1.

| Format      | Settings               | End condition                                                                                                      |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Round-based | 5, 7, or 10            | Each player gets that many scheduled answering turns. Resolve any remaining bonus turns, then check the standings. |
| Score-based | 50, 100, or 200 points | Apply the entire turn’s point changes, then check who reached the target.                                          |

- Four eligible players are required to start. Cap the match at 12. Randomize the scheduled turn order before the match and reserve those seats for the duration.
- Round-based options are 5, 7, or 10 scheduled turns per player. A bonus turn plays immediately and does not consume a scheduled turn. Bonus turns can chain, including after the last scheduled turn. Check final standings after the chain. Players tied for the highest score enter a tiebreaker.
- Score-based targets are 50, 100, or 200. Apply every player's award together, then check final totals for the turn. One player at or above target wins. If multiple players qualify on the same turn, all qualify for the tiebreaker even if their totals differ. A victory or tiebreaker takes precedence over a bonus turn.
- If the entire roster qualifies for a tiebreaker, end in a shared tie.
- When a match has a winner, show the winner’s name in a modal three seconds after final standings appear. Dismiss it after three seconds and keep the final standings visible.
- A turn can award points to the Answering Player and to challengers. A missed answering turn still consumes its scheduled turn.

## Card draws

- Regular and bonus turns share one shuffled Persona deck per match. Discard each Persona when drawn. When the deck is empty, reshuffle all Personas. The last draw of one shuffle can match the first draw of the next. Tiebreakers use no Persona.
- Regular turns, bonus turns, and tiebreakers share one Prompt deck per match. Start with the full deck in shuffled order and draw without replacement. When a draw is needed and the deck is empty, restore every Prompt, shuffle the full deck, and continue the same match.
- Persist the remaining Prompt and Persona orders and consume each draw even if the interrupted turn never commits its score. A replay after a server restart draws from the remaining decks, reshuffling any empty deck.

## Anatomy of a turn

1. Draw a Prompt and Persona together. Show the Answering Player a personalized turn announcement for 3 seconds. Then show them only the Persona for 5 seconds. During the announcement and Persona preview, opponents see a single waiting screen with the Answering Player’s name and a countdown. Reveal the Prompt to everyone when the answer timer starts. Keep the Persona private to the Answering Player until scoring.
2. The Answering Player gets 25 seconds to submit and revise. After a submission, show the server-accepted answer and let the player reopen the form to revise it. At zero, lock the last submitted answer. If no answer was submitted, skip directly to an 8-second shared “No answer submitted” scoring view with current standings, zero awards, and no Persona reveal.
3. Reveal the locked answer as soon as the answer timer reaches zero.
4. Run the 30-second Phase 1 response window. Opponents explicitly submit Support or Challenge and can change their submitted choice until the deadline. Show each player their last accepted choice and answer. Draft edits or selecting an option in the form leave the accepted choice intact. An absent response or a challenge without a valid nonblank submission defaults to Support.
5. If support votes total zero, skip Phase 2, reveal the Persona at scoring, and deduct 1 point from the Answering Player by default. Challengers score zero. An explicit Persona override can still award points or deduct points here.
6. Otherwise, reveal challenge answers and run Phase 2 for 15 seconds (7.5 seconds if every opponent supported). Only Phase 1 supporters can move their vote, choosing between the original answer and valid challenge answers. A supporter who takes no action retains their initial allocation. Players see their own current action, and final vote allocations and totals become public at scoring.
7. When the Phase 2 timer reaches zero, all votes must point to valid answers before scoring. Resolve the Persona and challenger awards, commit the outcome, then show Final Votes for 5 seconds (2.5 seconds if every opponent supported), followed by the Results standings for 8 seconds before automatically advancing. Show the same results on every device and highlight the viewer's standings row.

Timed phases run to zero even if everyone has submitted. The voting clock keeps running while a player selects duplicates and pauses when the server accepts the flag. A completed review restores the greater of the paused time and 10 seconds when play resumes.

## Waiting hints

Opponents can cycle through these hints while waiting for the Answering Player. Each player starts at a random hint and advances through this order.

1. By default, challengers score 2 points per vote. Pay attention, some personas change this.
2. Provided there is enough time, you can always change your response by clicking “Change your mind?”
3. Some personas punish challengers.
4. By default, the challenger(s) with the most votes out of all players that round scores double.
5. Usually, if an answer receives all challenges and no support, the round ends immediately and the answering player loses a point. Some personas change this rule…
6. If an answer seems intentionally bad, there might be a good reason for that...
7. A retained vote is a support vote that stays on the original answer through the end of final voting.
8. If you do not support or challenge an answer before the timer runs out, you will automatically vote “support.”
9. It is possible to gain and lose points in the same turn
10. Duplicate or closely related answers should be disqualified. Click “Report Duplicates” to put them to a vote.
11. Personas are drawn from a shuffled deck. Once the deck runs out, every persona becomes available again.
12. It’s in the spirit of the game to avoid collusion.
13. If you lose connection, rejoin with the room code to reclaim your seat.
14. If you challenge, you cannot vote that round.
15. Challengers can flag duplicate answers.
16. Disqualified challengers can still be penalized by the modifier.
17. Some personas reward supporters more than other players

## Duplicate review

- During Phase 2, when at least two challenge answers can be selected, any player except the Answering Player can select two or more for review. Give selection a Cancel action and accept flags until the voting deadline. Canceling preserves the player's opportunity to flag.
- Each player can initiate one submitted review per turn. The same unordered set of answer IDs can be reviewed only once per turn. A new set can include previously reviewed or disqualified entries if it includes at least one answer still in play.
- Everyone sees the flagged answers. Players whose answers are flagged spectate with an explanation. Other players, including the Answering Player, are eligible to vote.
- The review timer runs for 10 seconds. At zero, assign yes to eligible players without a ballot. A strict majority of eligible voters is required. Ties fail.
- If review passes, disable the flagged answers. Atomically return their allocated votes to the original answer, then notify affected voters that they can move their vote again. A failed review leaves existing disqualifications in place. Show the review result briefly before resuming final voting.

## Scoring

Use **support votes** for initial Phase 1 support, including defaults, **retained votes** for votes on the original answer at the end of Phase 2, and **votes for a challenger** for final votes on that challenger's answer. Count valid Phase 1 challenges even if an answer is subsequently disqualified, unless the Persona explicitly says otherwise.

Default challenger award is 2 points per final vote, doubled for every eligible challenger tied for the most votes among challengers. Eligible challengers with zero final votes lose 1 point if Phase 2 took place. Disqualified challengers lose 2 points under default scoring. Persona text takes precedence over the default rules where it explicitly addresses them. A missed original answer always gives everyone zero. Cumulative scores can go below zero. Apply deductions in full and show negative totals in the standings.

**Zero support.** The Troll, The Provocateur, Suddenly Libertarian, and Ken M. have confirmed scoring overrides when everyone challenges. Phase 2 is still skipped. A turn with no submitted original answer follows the separate “No answer submitted” outcome.

## Persona catalog

### Painfully Earnest

_Who's a good boy?_

2 per support vote plus 1 per retained vote. Double the subtotal if nobody challenged.

### The Panderer

_Shut up and play the hits to the cheap seats._

3 per support vote plus 1 per retained vote, minus 3 per challenger, plus 5 if nobody challenged.

### The Ice Breaker

_“Let’s give them something to talk about.”_

Lose 3 if nobody challenged. Otherwise triple the sum of retained votes and the greatest vote count received by any single challenger.

### The Troll

_“If you don’t have anything nice to say, say it on the internet.”_

2 per challenger, plus 5 if zero retained votes. Double the subtotal and subtract 1 point if all opponents challenged. This applies when Phase 2 is skipped. Challengers score zero.

### The Provocateur

_You never met a pot that didn’t need stirring._

2 per challenger plus 2 per retained vote. Double if at least one opponent challenged and no challenger receives a vote. If zero support votes and every opponent challenged, replace the award with −5.

### The Bipartisan

_To each their own (even though you're wrong)._

Your goal is to retain at least one vote while ending the round with the same vote tally as another challenger. Do this and score 10 points this round. Challengers do not score this round.

### Yojimbo

_“It would seem we have reached an impasse.”_

Score 5 points per eligible challenger whose positive final vote tally ties another challenger’s. Challengers cannot earn points. Those with zero final votes lose 1 point if eligible or 2 points if disqualified.

### Sir John Falstaff

_In vino veritas._

1 per challenger plus 2 per retained vote. Add 5 if the Answering Player leads or ties for the lead in final votes.

### Suddenly Libertarian

_A common maneuver observed in parents trying to stay on the right side of history._

Take whichever is higher: your retained votes or the number of challengers. Triple that number. This still applies if everyone challenges.

### The Finsta

_The recommended method for arguing with strangers on the social media platform you just bought._

3 per retained vote. Subtract 1 from each challenger’s award for the round, with a minimum award of zero. Add 5 if the Answering Player has the most round points outright after those deductions and before the bonus.

### The Double Down

_Prediction markets say this is a key indicator of a forthcoming “break from socials.”_

Score 2 points for each support and retained vote. If you do not score the highest this round, your score is 0 this turn.

### The Ambien Defense

_Side effects include dizziness, dry-mouth, and spontaneous racist tirades brought on by transcontinental flight._

Score 2 points per support vote plus 1 point per retained vote. Unless you score the highest this turn, take a bonus turn.

### The Daydreamer

_“Could you repeat the question?”_

Your answer is tangentially related at best. Set your score to that of the highest scoring challenger and add 3 bonus points.

Use zero as the starting award if nobody challenged. The standard zero-support rule still applies.

### The Karma Farmer

_It ain't much, but it's honest work._

Score 1 point for each support vote and each retained vote. Take another turn.

When everyone challenges, skip Phase 2. The Answering Player loses 1 point and still earns the bonus turn. Challengers score zero.

### Ken M.

_“you'd be suprised at how many people dont know anything about knowledge and yet we should forgive them for they know not what they not know.”_

Score 2 points for each challenger. Instead of scoring, each challenger loses 2 points. Disqualified challengers lose 2 more. Take another turn.

If everyone challenges, go straight to the scoring view, subtract 1 point from the Answering Player’s award, and grant the bonus turn.

### TL;DR

_It's time to make some sweeping claims based on that headline you read._

Score 2 points per retained vote. Challengers score an extra point per vote, added to their default award.

### Portia, Reader of the Papers

_You know what's up._

Gain 1 point per player, including yourself. Take another turn.

### Good Bot

_Beep boop beep_

Score 1 point per support vote and 1 point per retained vote.

### Mr. Agreeable

_What he said._

Only eligible challengers tied for the most votes receive their default award. Match the award of one such challenger, or score zero if nobody challenged.

### FIFA President

_Kickbacks, get it? Soccer? Kick?_

Score 1 point per support vote and 2 per retained vote. Each initial supporter gains half your award, rounded up. Challengers score zero.

### The Crowdsourcer

_You can finally fund that album, get out of medical debt, or go to Disnleyland again._

Score 2 points per support vote. Supporters score points equal to the number of players in the game. This applies to each initial supporter, including those who switch in Phase 2.

## Tiebreakers

- Contenders receive the same Prompt with no Persona. Allow 30 seconds to submit or revise. If nobody submits, give the same contenders a fresh Prompt. If exactly one submits, that player wins. Otherwise eliminate contenders who missed the deadline.
- Reveal submitted answers together as soon as the answer window closes and start the 30-second ballot. Show anonymous answer options in the same shuffled order on every device.
- Only players who aren't answering the current Prompt can vote or initiate and participate in duplicate review. An eliminated contender can vote on the next Prompt.
- Each vote counts one point for this ballot. A missed ballot is an abstention. If one contender receives the most votes, they win. If multiple contenders tie for first, only those contenders advance to a fresh Prompt. After two consecutive completed ballots with zero votes, declare a shared tie among the remaining contenders.
- Use the regular duplicate pause and review rules. If at least two answers remain valid, clear any votes for disqualified answers, notify affected voters, and resume the ballot with at least 10 seconds left. If one remains, that contender wins immediately. If none remain, restart with a fresh Prompt for the contenders whose answers were on that ballot. In those last two cases the paused ballot does not resume.

## Leaving, rejoining, and recovery

- Preserve each seat's score, screen name, and place in the rotation. A returning player reclaims their seat using a browser-held credential. The room code alone does not identify a seat. Leaving frees a player to join or create another room. The roster stays fixed even if connected devices drop below four.
- Ordinary disconnects leave the room clock running. Apply the normal deadlines and defaults. Reconnect into the current permitted view with the latest accepted action.
- Only the host can permanently end the match. Require confirmation for End Game during play. On final standings, End Game closes the match immediately and Leave Game returns a guest home. A host disconnect does not end the match. Close automatically after 10 minutes with every player disconnected.
- Persist a checkpoint before the current turn draws cards. If interrupted before scoring commits, restart the turn with a new draw and fresh timers. A new draw can produce different cards. Preserve earlier scores and discard interrupted actions and uncommitted effects.
- Commit scoring and the next state together in PostgreSQL. After a committed result, restart into the saved next scheduled turn, bonus turn, tiebreaker, or victory, even if the scoring presentation was still visible. Never award points twice. Use the same boundary for tiebreakers. An uncommitted tiebreaker restarts with the same contenders and a fresh Prompt.

## Worked rulings

| Fixture                                                               | Expected result                                                                                                             |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Four-player Troll, everyone challenges                                | Phase 2 skipped. Answering Player +21, challengers zero.                                                                    |
| Four-player Troll, two challenges, one supporter switches             | Answering Player +9, challengers zero.                                                                                      |
| Three submitted challenges, two disqualified                          | Troll still counts three. The Panderer’s challenger-count deduction is 9 points, and each disqualified challenger loses 2 points. The Finsta leaves disqualified challengers at zero.                            |
| Four-player The Provocateur, everyone challenges                      | Answering Player −5, others zero.                                                                                           |
| Four-player Suddenly Libertarian, everyone challenges                 | Skip Phase 2. Answering Player earns 9 points (3 × 3), others zero.                                                     |
| The Ice Breaker starts at 2 points and nobody challenges              | Apply the −3 award. Show a cumulative score of −1 in the standings.                                                         |
| Answering Player submits Paris, then edits to Rome without submitting | Paris reveals as soon as the answer timer reaches zero.                                                                     |
| Answering Player times out with no submission and The Troll           | Zero points and no Persona reveal on any opponent device.                                                                   |
| Duplicate review paused at 6 or 14 seconds                            | Completed reviews restore 10 or 14 seconds respectively. Opening or canceling the selector leaves the voting clock running. |
| Duplicates pass while a challenge holds a vote                        | Vote returns atomically to the original answer and the voter sees it.                                                       |
| Five eligible duplicate voters, two yes and three no                  | Review fails. A separate case verifies missing ballots become yes at the deadline.                                          |
| Four browser sessions inspect live updates and reconnect              | Private Persona and vote allocations appear only in the intended views before scoring.                                      |
| 50-point target, final totals 58, 50, and 49                          | Players at 58 and 50 qualify. Player at 49 does not.                                                                        |
| Round-based final scheduled turn grants chained bonuses               | Play the chain before checking the standings.                                                                               |
| Tiebreaker, duplicate review leaves one or zero answers               | One wins immediately. Zero draws a fresh Prompt.                                                                            |
| Two consecutive completed tiebreaker ballots with no votes            | Remaining contenders share the tie.                                                                                         |
| Restart before versus after score commit                              | Replay before commit. Preserve scores exactly once and resume the saved next state after commit.                            |

## Open design decisions

- Settle whether submitting a flag automatically records the flagger’s yes ballot.
- Confirm whether any Persona besides The Troll, The Provocateur, Suddenly Libertarian, and Ken M. overrides zero-support scoring.
- Confirm room join details and host permissions beyond starting and ending the match, including whether a host can transfer control.
- Confirm tiebreaker ballot revision behavior and the presentation timing after a tiebreaker result.

## Appendix — Prompt deck

292 prompts in source order. “Worst habit” appears once. The IDs were assigned for this edition and can stay with their prompts through reordering and wording edits.

| ID         | Prompt                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------- |
| prompt-001 | What’s the best vacation destination?                                                           |
| prompt-002 | What’s the best on-screen performance?                                                          |
| prompt-003 | What’s the best cuisine?                                                                        |
| prompt-004 | What’s the best multiplayer video game?                                                         |
| prompt-005 | What’s the best one hit wonder?                                                                 |
| prompt-006 | What’s the best time to go to bed?                                                              |
| prompt-007 | What’s the best time to wake up?                                                                |
| prompt-008 | What’s the best soda flavor?                                                                    |
| prompt-009 | What’s the best breakfast dish?                                                                 |
| prompt-010 | What’s the best condiment?                                                                      |
| prompt-011 | What’s the best city?                                                                           |
| prompt-012 | What’s the best genre of music?                                                                 |
| prompt-013 | What’s the best spoken accent?                                                                  |
| prompt-014 | What’s the best way to start the day?                                                           |
| prompt-015 | What’s the best extreme sport?                                                                  |
| prompt-016 | What’s the best song in a foreign language?                                                     |
| prompt-017 | What’s the best flavor of cake?                                                                 |
| prompt-018 | What’s the best seafood dish?                                                                   |
| prompt-019 | What’s the best hiding place?                                                                   |
| prompt-020 | What’s the best way to relate to older generations?                                             |
| prompt-021 | What’s the best way to sign off a professional email?                                           |
| prompt-022 | What’s the best way to spend $25?                                                               |
| prompt-023 | Who’s the best celebrity on socials?                                                            |
| prompt-024 | What’s the best cold dish?                                                                      |
| prompt-025 | What’s the best hot beverage?                                                                   |
| prompt-026 | What’s the best cliche tattoo?                                                                  |
| prompt-027 | What’s the best method of execution?                                                            |
| prompt-028 | Who’s the best animated movie villain?                                                          |
| prompt-029 | Who’s the best basketball player?                                                               |
| prompt-030 | What’s the best film franchise?                                                                 |
| prompt-031 | What’s the best amendment to the US constitution?                                               |
| prompt-032 | What’s the best ninja weapon?                                                                   |
| prompt-033 | What’s the best theme park?                                                                     |
| prompt-034 | What’s the best non-dairy milk?                                                                 |
| prompt-035 | What’s the best movie with a one-word title?                                                    |
| prompt-036 | What’s the best source of protein?                                                              |
| prompt-037 | What’s the best video game console?                                                             |
| prompt-038 | What’s the best tech company?                                                                   |
| prompt-039 | What’s the best allergy?                                                                        |
| prompt-040 | What’s the best species of pet?                                                                 |
| prompt-041 | What’s the best fashion accessory?                                                              |
| prompt-042 | What’s the best way to make someone anxious?                                                    |
| prompt-043 | What’s the best thing to do on a sick day?                                                      |
| prompt-044 | What’s the best cozy meal?                                                                      |
| prompt-045 | What’s the best species of dinosaur?                                                            |
| prompt-046 | What’s the best food that vegans, vegetarians, and omnivores can share?                         |
| prompt-047 | What’s the best nursery rhyme?                                                                  |
| prompt-048 | What’s the best fairy tale?                                                                     |
| prompt-049 | Which plant smells the best?                                                                    |
| prompt-050 | What’s the best country to visit?                                                               |
| prompt-051 | What’s the best sitcom?                                                                         |
| prompt-052 | What’s the best seasonal treat?                                                                 |
| prompt-053 | What’s the best movie soundtrack?                                                               |
| prompt-054 | What’s the best word?                                                                           |
| prompt-055 | What’s the best instance of nepotism?                                                           |
| prompt-056 | Who’s the best actor to portray James Bond?                                                     |
| prompt-057 | Who’s the best American?                                                                        |
| prompt-058 | What’s the best stereotype?                                                                     |
| prompt-059 | Who’s the best Disney princess?                                                                 |
| prompt-060 | What’s the best day of the year?                                                                |
| prompt-061 | Who’s the best Andrew?                                                                          |
| prompt-062 | Who’s the best Jennifer?                                                                        |
| prompt-063 | What’s the best weather?                                                                        |
| prompt-064 | What’s the best adult animated series?                                                          |
| prompt-065 | What’s the best comic strip?                                                                    |
| prompt-066 | What’s the best card game that uses a standard deck?                                            |
| prompt-067 | Who’s the best mononymous performer?                                                            |
| prompt-068 | What’s the best pseudonym?                                                                      |
| prompt-069 | What’s the best compliment to a stranger?                                                       |
| prompt-070 | What’s the best celebration for accomplishing a menial task?                                    |
| prompt-071 | What’s the best punishment for forgetting a significant other’s birthday?                       |
| prompt-072 | What’s the best instrumental piece of music?                                                    |
| prompt-073 | What’s the best medicine?                                                                       |
| prompt-074 | What’s the best fictional weapon?                                                               |
| prompt-075 | What’s the best superpower?                                                                     |
| prompt-076 | What’s the best conspiracy theory?                                                              |
| prompt-077 | What’s the best fictional family?                                                               |
| prompt-078 | Who’s the best talking animal?                                                                  |
| prompt-079 | What’s the best thing to say after someone sneezes and farts at the same time?                  |
| prompt-080 | What’s the best example of a fundamental?                                                       |
| prompt-081 | What’s the best pasta shape?                                                                    |
| prompt-082 | What’s the best Christmas song?                                                                 |
| prompt-083 | What’s the best album for a laser show?                                                         |
| prompt-084 | What’s the best fictional city?                                                                 |
| prompt-085 | What’s the best video game adaptation?                                                          |
| prompt-086 | What’s the best month?                                                                          |
| prompt-087 | What’s the best reason for calling in sick?                                                     |
| prompt-088 | What’s the best cryptid?                                                                        |
| prompt-089 | What’s the best vegetable?                                                                      |
| prompt-090 | What’s the best hiding place for a diary?                                                       |
| prompt-091 | What’s the best way to appear scary?                                                            |
| prompt-092 | What’s the best stage of grief?                                                                 |
| prompt-093 | What’s the best logo?                                                                           |
| prompt-094 | What’s the best movie monster?                                                                  |
| prompt-095 | What’s the best children’s TV show?                                                             |
| prompt-096 | What’s the best name to shout angrily?                                                          |
| prompt-097 | What’s the best song by a bad band/artist?                                                      |
| prompt-098 | What’s the best unresolved mystery?                                                             |
| prompt-099 | What’s the best song to accompany night driving?                                                |
| prompt-100 | What’s the best practical joke?                                                                 |
| prompt-101 | What’s the best old-timey malady?                                                               |
| prompt-102 | What’s the worst soft drink flavor?                                                             |
| prompt-103 | Who’s the worst character on Friends?                                                           |
| prompt-104 | What’s the worst song everyone knows?                                                           |
| prompt-105 | What’s the worst movie franchise?                                                               |
| prompt-106 | What’s the worst car manufacturer?                                                              |
| prompt-107 | What’s the worst spice/seasoning?                                                               |
| prompt-108 | Who’s the worst famous singer?                                                                  |
| prompt-109 | What’s the worst band with an umlaut in its name?                                               |
| prompt-110 | What’s the worst city to visit in the summer?                                                   |
| prompt-111 | What’s the worst way to spend $25?                                                              |
| prompt-112 | What’s the worst subscription service?                                                          |
| prompt-113 | What’s the worst streaming platform?                                                            |
| prompt-114 | What’s the worst part of raising an infant?                                                     |
| prompt-115 | What’s the worst music genre?                                                                   |
| prompt-116 | What’s the worst school subject?                                                                |
| prompt-117 | What’s the worst on-screen death?                                                               |
| prompt-118 | What’s the worst thing that makes you happy?                                                    |
| prompt-119 | What’s the worst relationship advice?                                                           |
| prompt-120 | What’s the worst fate worse than death?                                                         |
| prompt-121 | What’s the worst time to turn on the big game?                                                  |
| prompt-122 | What’s the worst spoken accent?                                                                 |
| prompt-123 | What’s the worst kind of vacation?                                                              |
| prompt-124 | What’s the worst euphemism?                                                                     |
| prompt-125 | What’s the worst sound?                                                                         |
| prompt-126 | What’s the worst TV show?                                                                       |
| prompt-127 | What’s the worst fast food restaurant?                                                          |
| prompt-128 | What’s the worst hand gesture?                                                                  |
| prompt-129 | What’s the worst hot beverage?                                                                  |
| prompt-130 | What’s the worst grocery store chain?                                                           |
| prompt-131 | What’s the worst airport?                                                                       |
| prompt-132 | Who’s the worst William?                                                                        |
| prompt-133 | Who’s the worst Elizabeth?                                                                      |
| prompt-134 | What’s the worst conventional weapon?                                                           |
| prompt-135 | What’s the worst dessert?                                                                       |
| prompt-136 | What’s the worst excuse?                                                                        |
| prompt-137 | What’s the worst condiment?                                                                     |
| prompt-138 | What’s the worst fandom/fanbase?                                                                |
| prompt-139 | What’s the worst exercise?                                                                      |
| prompt-140 | Who’s the worst established role model?                                                         |
| prompt-141 | What’s the worst sport?                                                                         |
| prompt-142 | What’s the worst ice cream flavor?                                                              |
| prompt-143 | What’s the worst hobby?                                                                         |
| prompt-144 | What’s the worst habit?                                                                         |
| prompt-145 | What’s the worst US city?                                                                       |
| prompt-146 | What’s the worst performance?                                                                   |
| prompt-147 | What’s the worst book of the Bible?                                                             |
| prompt-148 | What’s the worst movie in the James Bond franchise?                                             |
| prompt-149 | What’s the worst Tom Clancy adaptation?                                                         |
| prompt-150 | What’s the worst fictional universe?                                                            |
| prompt-151 | Who’s the worst superhero?                                                                      |
| prompt-152 | Who’s the worst Canadian?                                                                       |
| prompt-153 | What’s the worst stereotype?                                                                    |
| prompt-154 | Who’s the worst Disney princess?                                                                |
| prompt-155 | What’s the worst salad dressing?                                                                |
| prompt-156 | What’s the worst Starbucks menu item?                                                           |
| prompt-157 | What’s the worst day of the year?                                                               |
| prompt-158 | What’s the worst day of the week?                                                               |
| prompt-159 | What’s the worst Christmas movie?                                                               |
| prompt-160 | What’s the worst tourist destination?                                                           |
| prompt-161 | What’s the worst animal?                                                                        |
| prompt-162 | What’s the worst song by a good band/artist?                                                    |
| prompt-163 | What’s the worst Christmas song?                                                                |
| prompt-164 | What’s the worst viral trend?                                                                   |
| prompt-165 | What’s the worst smell?                                                                         |
| prompt-166 | What’s the worst planet?                                                                        |
| prompt-167 | What’s the worst mascot?                                                                        |
| prompt-168 | What’s the worst team name?                                                                     |
| prompt-169 | What’s the worst color?                                                                         |
| prompt-170 | What’s the worst fish?                                                                          |
| prompt-171 | What’s the worst utensil?                                                                       |
| prompt-172 | What’s the worst book?                                                                          |
| prompt-173 | What’s the worst piece of furniture?                                                            |
| prompt-174 | What’s the worst Olympic event?                                                                 |
| prompt-175 | What’s the least interesting job?                                                               |
| prompt-176 | What’s the best way to relax after work?                                                        |
| prompt-177 | What’s the rudest way to respond to a compliment?                                               |
| prompt-178 | What’s the oldest trick in the book?                                                            |
| prompt-179 | What’s the best crime to be convicted of?                                                       |
| prompt-180 | Who’s the nicest person playing this game?                                                      |
| prompt-181 | What’s the least motivating thing a teacher could say?                                          |
| prompt-182 | What’s the solution to our problem?                                                             |
| prompt-183 | Who probably has the worst penmanship here?                                                     |
| prompt-184 | What’s the worst book people claim to enjoy?                                                    |
| prompt-185 | Who’s the funniest person?                                                                      |
| prompt-186 | What’s the tackiest trend of the last 10 years?                                                 |
| prompt-187 | What’s the best way to get over a crush?                                                        |
| prompt-188 | What’s the worst thing you could do legally?                                                    |
| prompt-189 | Who’s the worst Greek philosopher?                                                              |
| prompt-190 | What’s the worst chore?                                                                         |
| prompt-191 | Which celebrity would be the most fun to hang out with?                                         |
| prompt-192 | Who is clearly ripping off someone else?                                                        |
| prompt-193 | If someone asks “Where were you?”, what’s the most suspicious response?                         |
| prompt-194 | What’s the most overrated book?                                                                 |
| prompt-195 | What’s the worst location for a first date?                                                     |
| prompt-196 | What’s the best thing to say when someone knocks on the bathroom door?                          |
| prompt-197 | What’s the best birthday?                                                                       |
| prompt-198 | What’s the lamest milestone to celebrate?                                                       |
| prompt-199 | Who’s the classiest person ever?                                                                |
| prompt-200 | What’s the most famous animal?                                                                  |
| prompt-201 | What has the worst name?                                                                        |
| prompt-202 | What tradition needs to die?                                                                    |
| prompt-203 | What needs to come back?                                                                        |
| prompt-204 | What restaurant has the best burger?                                                            |
| prompt-205 | What’s the clearest sign someone is insecure?                                                   |
| prompt-206 | What’s the worst uniform?                                                                       |
| prompt-207 | What’s the best uniform?                                                                        |
| prompt-208 | Who’s the best rock star?                                                                       |
| prompt-209 | Who’s the best soul singer?                                                                     |
| prompt-210 | What’s the most irritating song?                                                                |
| prompt-211 | What does everyone need to calm down about?                                                     |
| prompt-212 | What’s the cure for the male loneliness epidemic?                                               |
| prompt-213 | What makes you instantly lose respect for someone?                                              |
| prompt-214 | What should be punishable by law?                                                               |
| prompt-215 | What’s the worst way to try to look cool?                                                       |
| prompt-216 | What do you have to learn the hard way?                                                         |
| prompt-217 | Who’s the worst person you think still has a point?                                             |
| prompt-218 | Who are you convinced is a monster even though you have no proof?                               |
| prompt-219 | What’s the worst musical?                                                                       |
| prompt-220 | What’s the best musical?                                                                        |
| prompt-221 | What should people just keep to themselves?                                                     |
| prompt-222 | What’s the best thing to yell before you jump off something really high up?                     |
| prompt-223 | What skill do you find unimpressive?                                                            |
| prompt-224 | What line do people need to stop quoting?                                                       |
| prompt-225 | Which living person most deserves a statue?                                                     |
| prompt-226 | What’s the best As Seen On TV product?                                                          |
| prompt-227 | What’s the worst candy?                                                                         |
| prompt-228 | What’s the socially acceptable maximum amount of a party sub you can eat at a social gathering? |
| prompt-229 | How many eggs is too many for one meal?                                                         |
| prompt-230 | What’s the best cereal?                                                                         |
| prompt-231 | What’s the worst Pokémon?                                                                       |
| prompt-232 | Who’s the best stand-up comedian?                                                               |
| prompt-233 | What’s a job that’s harder than most people think?                                              |
| prompt-234 | What injury has the best name?                                                                  |
| prompt-235 | What has the wrong name?                                                                        |
| prompt-236 | What word needs to have its own spelling corrected?                                             |
| prompt-237 | What is something everyone 13 and over needs to know how to do?                                 |
| prompt-238 | What’s something you know but you can’t prove?                                                  |
| prompt-239 | What’s a conspiracy theory dumber than Flat Earth?                                              |
| prompt-240 | What should the Man in the Moon’s legal name be?                                                |
| prompt-241 | What is an item that belongs in a fridge but not in a mini-fridge?                              |
| prompt-242 | Which billionaire’s bunker will be found first?                                                 |
| prompt-243 | Which US president should take Benjamin Franklin’s place on the $100 bill?                      |
| prompt-244 | Which actor hasn’t played the Joker but would do a good job?                                    |
| prompt-245 | Who just isn’t funny?                                                                           |
| prompt-246 | What’s the smallest animal that would win a fight to the death against the strongest person in the room? |
| prompt-247 | How old is too old to call your parents mommy and daddy?                                        |
| prompt-248 | What is something all men need to know how to do?                                               |
| prompt-249 | What is something all women need to know how to do?                                             |
| prompt-250 | What rule shouldn’t exist?                                                                      |
| prompt-251 | What would Jesus have to say about AI girlfriends?                                              |
| prompt-252 | What’s the worst thing a therapist has said to you?                                             |
| prompt-253 | What’s the most overrated food?                                                                 |
| prompt-254 | What is always funny?                                                                           |
| prompt-255 | What is Rob Schneider’s least irritating role?                                                  |
| prompt-256 | What is the lamest mythical creature?                                                           |
| prompt-257 | What’s the worst constellation?                                                                 |
| prompt-258 | What is basically just poison?                                                                  |
| prompt-259 | What taste is most worth acquiring?                                                             |
| prompt-260 | Who’s just faking it?                                                                           |
| prompt-261 | What’s the lamest thing you would spend $1000 on if you had it to spare?                        |
| prompt-262 | What do you complain about that makes you look pathetic?                                        |
| prompt-263 | What interest of yours are you certain no one here wants to talk about?                         |
| prompt-264 | What is the smuttiest thing you have read?                                                      |
| prompt-265 | What badly needs an age limit?                                                                  |
| prompt-266 | What’s the best movie that is also really boring?                                               |
| prompt-267 | What is the definitive ‘Dad movie’?                                                             |
| prompt-268 | What tattoo should be retired?                                                                  |
| prompt-269 | What’s the first song that should be inducted into the Wedding Reception Hall of Fame?          |
| prompt-270 | What tradition should be more widely celebrated?                                                |
| prompt-271 | What has no reason to be so hard to clean?                                                      |
| prompt-272 | What is the best Disneyland attraction?                                                         |
| prompt-273 | Which live-action adaptation of an animated Disney film is the best?                            |
| prompt-274 | How many times is too many to see a given movie in the theatre?                                 |
| prompt-275 | Which holiday needs more songs?                                                                 |
| prompt-276 | What is the quintessential road trip food?                                                      |
| prompt-277 | What job actually doesn’t sound so bad?                                                         |
| prompt-278 | What baseball player has the best name?                                                         |
| prompt-279 | What’s the most fake-sounding sports position?                                                  |
| prompt-280 | What isn’t the name of a car model but should be?                                               |
| prompt-281 | What is the most obvious choice?                                                                |
| prompt-282 | What just sounds made up?                                                                       |
| prompt-283 | What’s the best word for farting that you just made up?                                         |
| prompt-284 | What needs to be socially acceptable?                                                           |
| prompt-285 | Who’s the smoothest operator?                                                                   |
| prompt-286 | We have snake eyes. What should rolling two 3s be called?                                       |
| prompt-287 | What is the worst hairstyle?                                                                    |
| prompt-288 | How many 2-ply toilet paper squares is too many to use at once?                                 |
| prompt-289 | What is your most mediocre accomplishment?                                                      |
| prompt-290 | What’s the most irrational fear you’ll admit to having?                                         |
| prompt-291 | What should we be allowed to shame people for?                                                  |
| prompt-292 | What US state has the worst name?                                                               |
