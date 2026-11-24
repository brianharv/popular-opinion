# Popular Opinion

This is the working v1 specification for an original, browser-based party game. Implement confirmed rules below. Ask the game designer about open rulings before making them permanent. Keep game-rule changes and their acceptance fixtures together.

## Scope and architecture

- 4–12 players in the same room, each on their own device. Use private rooms. Global and regional matchmaking are out of scope.
- Mobile-first React/TypeScript client. One Node/TypeScript service serves the frontend and WebSockets on the same origin. PostgreSQL stores matches and scoring checkpoints. Start with one server instance.
- The server owns the roster, clock, phase transitions, legal actions, card draws, votes, and scores. Keep game logic testable without sockets or the database. Inject the clock and card draws for deterministic tests.
- Derive each client's permitted view on the server, including reconnect snapshots. Never send an unrevealed Persona to opponents, another player's drafts or private actions, or tiebreaker author identifiers during an anonymous ballot. Use opaque answer IDs for selection.
- Validate actions against the authenticated seat, current turn and phase, and server deadline. Serialize room transitions so a deadline and a last-second action have one authoritative order. Rejected or late actions must not change the room.
- Start with a free Render Web Service and free Render PostgreSQL. Create the hosted database near the first playtest and review upgrading around day 25 after database creation, ahead of its 30-day expiry. Upgrade between matches. See [Render free tier](https://render.com/docs/free) and [WebSockets](https://render.com/docs/websocket).

## Lobby, match formats, and turn order

- Four eligible players are required to start. Cap the match at 12. Randomize the scheduled turn order before the match and reserve those seats for the duration.
- Round-based options are 5, 7, or 10 scheduled turns per player. A bonus turn plays immediately and does not consume a scheduled turn. Bonus turns can chain, including after the last scheduled turn. Check final standings after the chain. Players tied for the highest score enter a tiebreaker.
- Score-based targets are 50, 100, or 200. Apply every player's award together, then check final totals for the turn. One player at or above target wins. If multiple players qualify on the same turn, all qualify for the tiebreaker even if their totals differ. A victory or tiebreaker takes precedence over a bonus turn.
- If the entire roster qualifies for a tiebreaker, end in a shared tie.
- A turn can award points to the Answering Player and to challengers. A missed answering turn still consumes its scheduled turn.

## Regular turn

1. Draw a Prompt and Persona together. Show the Answering Player a personalized turn announcement for 3 seconds. Then show them only the Persona for 10 seconds and then only the Prompt for 5 seconds. During the announcement and both previews, opponents see a single waiting screen with the Answering Player’s name and a countdown. Reveal the Prompt to opponents when the answer timer starts. Keep the Persona private to the Answering Player until scoring.
2. The Answering Player gets 20 seconds to submit and revise. After a submission, show the server-accepted answer and let the player reopen the form to revise it. At zero, lock the last submitted answer. If no answer was submitted, skip directly to a 10-second shared “No answer submitted” scoring view with current standings, zero awards, and no Persona reveal.
3. Reveal the locked answer as soon as the answer timer reaches zero.
4. Run the 30-second Phase 1 response window. Opponents explicitly submit Support or Challenge and can change their submitted choice until the deadline. Show each player their last accepted choice and answer. Draft edits or selecting an option in the form leave the accepted choice intact. An absent response or a challenge without a valid nonblank submission defaults to Support.
5. If support votes total zero, skip Phase 2, reveal the Persona at scoring, and award zero by default. An explicit Persona override can still award points or deduct points here.
6. Otherwise, reveal challenge answers and run Phase 2 for 15 seconds. Only Phase 1 supporters can move their vote, choosing between the original answer and valid challenge answers. A supporter who takes no action retains their initial allocation. Players see their own current action, and final vote allocations and totals become public at scoring.
7. When the Phase 2 timer reaches zero, all votes must point to valid answers before scoring. Resolve the Persona and challenger awards, commit the outcome, then show final votes for 5 seconds followed by the standings for 10 seconds before automatically advancing. Show the same results on every device and highlight the viewer's standings row with a visible “You” label.

Timed phases run to zero even if everyone has submitted. The voting clock keeps running while a player selects duplicates and pauses when the server accepts the flag. A completed review restores the greater of the paused time and 10 seconds when play resumes.

## Duplicate review

- During Phase 2, when at least two challenge answers can be selected, any player except the Answering Player can select two or more for review. Give selection a Cancel action and accept flags until the voting deadline. Canceling preserves the player's opportunity to flag.
- Each player can initiate one submitted review per turn. The same unordered set of answer IDs can be reviewed only once per turn. A new set can include previously reviewed or disqualified entries if it includes at least one answer still in play.
- Everyone sees the flagged answers. Players whose answers are flagged spectate with an explanation. Other players, including the Answering Player, are eligible to vote.
- The review timer runs for 10 seconds. At zero, assign yes to eligible players without a ballot. A strict majority of eligible voters is required. Ties fail.
- If review passes, disable the flagged answers. Atomically return their allocated votes to the original answer, then notify affected voters that they can move their vote again. A failed review leaves existing disqualifications in place. Show the review result briefly before resuming final voting.

## Scoring and Persona rules

Use **support votes** for initial Phase 1 support, including defaults, **retained votes** for votes on the original answer at the end of Phase 2, and **votes for a challenger** for final votes on that challenger's answer. Count valid Phase 1 challenges even if an answer is subsequently disqualified, unless the Persona explicitly says otherwise.

Default challenger award is 2 points per final vote, doubled for every eligible challenger tied for the most votes among challengers. Disqualified challengers get zero under default scoring. Persona text takes precedence over the default rules where it explicitly addresses them. A missed original answer always gives everyone zero.

| Persona             | Scoring rule                                                                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Painfully Earnest      | 2 per support vote plus 1 per retained vote. Double the subtotal if nobody challenged.                                                                                                                                            |
| The Panderer             | 3 per support vote plus 1 per retained vote, minus 3 per challenger, plus 10 if nobody challenged.                                                                                                                                |
| The Ice Breaker          | Lose 3 if nobody challenged. Otherwise triple the sum of retained votes and the greatest vote count received by any single challenger.                                                                                            |
| The Troll            | 2 per challenger, plus 5 if zero retained votes, minus 5 if nobody challenged. Triple the subtotal if all opponents challenged. This applies when Phase 2 is skipped. Challengers score zero.                                     |
| The Provocateur          | 2 per challenger plus 2 per retained vote. Triple if at least one opponent challenged and no challenger receives a vote. If zero support votes and every opponent challenged, replace the award with −5.                          |
| The Bipartisan          | Score 10 if the Answering Player retains at least one vote and ties any challenger’s final vote tally. Otherwise score zero. Challengers score zero. |
| Yojimbo             | Score 5 per eligible challenger whose positive final vote tally ties another challenger’s. Challengers score zero. |
| Sir John Falstaff       | 1 per challenger plus 2 per retained vote. Add 5 if the Answering Player leads or ties for the lead in final votes.                                                                                                            |
| Suddenly Libertarian | Triple the greater of the retained vote count and the challenger count, then subtract 5. Applies even if everyone challenges.                                                                                                                                           |
| The Finsta               | 3 per retained vote. Deduct 3 from each challenger's default award, including disqualified challengers. Add 5 if the Answering Player has the most round points outright after those deductions and before the bonus. |
| The Double Down          | Tentative award of 2 per support vote plus 2 per retained vote. If the Answering Player has a clear lead in points for the turn, keep that award and grant a bonus turn. Otherwise their award is zero.                           |
| The Ambien Defense   | 2 per support vote plus 1 per retained vote. Keep the award and grant a bonus turn if the Answering Player does not have a clear lead in points for the turn.                                                                     |
| The Daydreamer | Match the highest challenger award, or start at zero if nobody challenged, then add 3. Apply the standard zero-support rule. |
| The Karma Farmer | Score 1 per support vote and 1 per retained vote. Grant a bonus turn even when everyone challenges and all awards are zero. |
| Ken M. | Score 2 per challenger. Each challenger loses 2 instead of receiving their default award. Grant a bonus turn. If everyone challenges, apply these awards and go straight to the scoring view. |

## Tiebreaker

- Contenders receive the same Prompt with no Persona. Allow 30 seconds to submit or revise. If nobody submits, give the same contenders a fresh Prompt. If exactly one submits, that player wins. Otherwise eliminate contenders who missed the deadline.
- Reveal submitted answers together as soon as the answer window closes and start the 30-second ballot. Show anonymous answer options in the same shuffled order on every device.
- Only players who aren't answering the current Prompt can vote or initiate and participate in duplicate review. An eliminated contender can vote on the next Prompt.
- Each vote counts one point for this ballot. A missed ballot is an abstention. If one contender receives the most votes, they win. If multiple contenders tie for first, only those contenders advance to a fresh Prompt. After two consecutive completed ballots with zero votes, declare a shared tie among the remaining contenders.
- Use the regular duplicate pause and review rules. If at least two answers remain valid, clear any votes for disqualified answers, notify affected voters, and resume the ballot with at least 10 seconds left. If one remains, that contender wins immediately. If none remain, restart with a fresh Prompt for the contenders whose answers were on that ballot. In those last two cases the paused ballot does not resume.

## Reconnect, abandonment, and restart

- Preserve each seat's score, screen name, and place in the rotation. A returning player reclaims their seat using a browser-held credential. The room code alone does not identify a seat. Leaving frees a player to join or create another room. The roster stays fixed even if connected devices drop below four.
- Ordinary disconnects leave the room clock running. Apply the normal deadlines and defaults. Reconnect into the current permitted view with the latest accepted action.
- Only the host can permanently end the match. Require confirmation for End Game during play. On final standings, End Game closes the match immediately and Leave Game returns a guest home. A host disconnect does not end the match. Close automatically after 10 minutes with every player disconnected.
- Persist a checkpoint before the current turn draws cards. If interrupted before scoring commits, restart the turn with a new draw and fresh timers. A new draw can produce different cards. Preserve earlier scores and discard interrupted actions and uncommitted effects.
- Commit scoring and the next state together in PostgreSQL. After a committed result, restart into the saved next scheduled turn, bonus turn, tiebreaker, or victory, even if the scoring presentation was still visible. Never award points twice. Use the same boundary for tiebreakers. An uncommitted tiebreaker restarts with the same contenders and a fresh Prompt.

## Implementation order and required harnesses

1. Build the pure game engine and scoring fixtures with a fake clock and controlled draws.
2. Add the room server and PostgreSQL checkpointing. Exercise commit and restart against a real test database.
3. Add the mobile browser flows. Use four isolated browser sessions for the core match paths and test the 12-seat boundary.
4. Verify the hosted build and reconnect behavior before the first playtest. Keep secrets out of browser payloads and repository files.

| Fixture                                                               | Expected result                                                                                                             |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Four-player Troll, everyone challenges                                | Phase 2 skipped. Answering Player +33, challengers zero.                                                                    |
| Four-player Troll, two challenges, one supporter switches             | Answering Player +9, challengers zero.                                                                                      |
| Three submitted challenges, two disqualified                          | Troll still counts three. The Panderer penalty is −9. The Finsta deducts 3 from each challenger.                                    |
| Four-player The Provocateur, everyone challenges                          | Answering Player −5, others zero.                                                                                           |
| Answering Player submits Paris, then edits to Rome without submitting | Paris reveals as soon as the answer timer reaches zero.                                                                     |
| Answering Player times out with no submission and The Troll           | Zero points and no Persona reveal on any opponent device.                                                                  |
| Duplicate review paused at 6 or 14 seconds                            | Completed reviews restore 10 or 14 seconds respectively. Opening or canceling the selector leaves the voting clock running. |
| Duplicates pass while a challenge holds a vote                        | Vote returns atomically to the original answer and the voter sees it.                                                       |
| Five eligible duplicate voters, two yes and three no                  | Review fails. A separate case verifies missing ballots become yes at the deadline.                                          |
| Four browser sessions inspect live updates and reconnect              | Private Persona and vote allocations appear only in the intended views before scoring.                                     |
| 50-point target, final totals 58, 50, and 49                          | Players at 58 and 50 qualify. Player at 49 does not.                                                                        |
| Round-based final scheduled turn grants chained bonuses               | Play the chain before checking the standings.                                                                               |
| Tiebreaker, duplicate review leaves one or zero answers               | One wins immediately. Zero draws a fresh Prompt.                                                                            |
| Two consecutive completed tiebreaker ballots with no votes            | Remaining contenders share the tie.                                                                                         |
| Restart before versus after score commit                              | Replay before commit. Preserve scores exactly once and resume the saved next state after commit.                            |

## Open rulings

- Settle whether submitting a flag automatically records the flagger’s yes ballot.
- Decide whether negative cumulative scores are allowed. The card awards include negative values.
- Confirm whether any Persona besides The Troll, The Provocateur, Suddenly Libertarian, and Ken M. overrides the zero-support exit.
- Supply the initial Prompt deck and confirm card repeat and deck exhaustion rules, including tiebreakers, bonus turns, and replay draws.
- Confirm room join details and host permissions beyond starting and ending the match, including whether a host can transfer control.
- Confirm tiebreaker ballot revision behavior and the presentation timing after a tiebreaker result.
