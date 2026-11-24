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
- A turn can award points to the Answering Player and to challengers. A missed answering turn still consumes its scheduled turn.

## Card draws

- Draw one random Persona independently each regular or bonus turn. Draws are with replacement, so the same Persona can appear on consecutive turns. Tiebreakers use no Persona.
- Regular turns, bonus turns, and tiebreakers share one Prompt deck per match. Start with the full deck in shuffled order and draw without replacement. When a draw is needed and the deck is empty, restore every Prompt, shuffle the full deck, and continue the same match.
- Persist the remaining Prompt order and consume each draw even if the interrupted turn never commits its score. A replay after a server restart draws from the remaining deck, reshuffling if it is empty.

## Anatomy of a turn

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

## Scoring

Use **support votes** for initial Phase 1 support, including defaults, **retained votes** for votes on the original answer at the end of Phase 2, and **votes for a challenger** for final votes on that challenger's answer. Count valid Phase 1 challenges even if an answer is subsequently disqualified, unless the Persona explicitly says otherwise.

Default challenger award is 2 points per final vote, doubled for every eligible challenger tied for the most votes among challengers. Disqualified challengers get zero under default scoring. Persona text takes precedence over the default rules where it explicitly addresses them. A missed original answer always gives everyone zero. Cumulative scores can go below zero. Apply deductions in full and show negative totals in the standings.

**Zero support.** The Troll, The Provocateur, Suddenly Libertarian, and Ken M. have confirmed scoring overrides when everyone challenges. Phase 2 is still skipped. A turn with no submitted original answer follows the separate “No answer submitted” outcome.

## Persona catalog

### Painfully Earnest

_Who's a good boy?_

2 per support vote plus 1 per retained vote. Double the subtotal if nobody challenged.

### The Panderer

_Shut up and play the hits to the cheap seats._

3 per support vote plus 1 per retained vote, minus 3 per challenger, plus 10 if nobody challenged.

### The Ice Breaker

_“Let’s give them something to talk about.”_

Lose 3 if nobody challenged. Otherwise triple the sum of retained votes and the greatest vote count received by any single challenger.

### The Troll

_“If you don’t have anything nice to say, say it on the internet.”_

2 per challenger, plus 5 if zero retained votes, minus 5 if nobody challenged. Triple the subtotal if all opponents challenged. This applies when Phase 2 is skipped. Challengers score zero.

### The Provocateur

_You never met a pot that didn’t need stirring._

2 per challenger plus 2 per retained vote. Triple if at least one opponent challenged and no challenger receives a vote. If zero support votes and every opponent challenged, replace the award with −5.

### The Bipartisan

_To each their own (even though you're wrong)._

Your goal is to retain at least one vote while ending the round with the same vote tally as another challenger. Do this and score 10 points this round. Challengers do not score this round.

### Yojimbo

_“It would seem we have reached an impasse.”_

Score 5 points per eligible challenger whose positive final vote tally ties another challenger’s. Challengers score zero.

### Sir John Falstaff

_In vino veritas._

1 per challenger plus 2 per retained vote. Add 5 if the Answering Player leads or ties for the lead in final votes.

### Suddenly Libertarian

_Oh, right, sorry – you liked Ron Paul in ’08._

Take whichever is higher: your retained votes or the number of challengers. Triple that number, then subtract 5 points (because shame on you). This still applies if everyone challenges.

### The Finsta

_The recommended method for arguing with strangers on the social media platform you just bought._

3 per retained vote. Deduct 3 from each challenger's default award, including disqualified challengers. Add 5 if the Answering Player has the most round points outright after those deductions and before the bonus.

### The Double Down

_Prediction markets say this is a key indicator of a forthcoming “break from socials.”_

Score 2 points per support vote plus 2 points per retained vote. If you score the highest this round, take a bonus turn. Otherwise your score this turn is zero.

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

When everyone challenges, skip Phase 2 and give everyone zero points. The Answering Player still earns the bonus turn.

### Ken M.

_you'd be suprised at how many people dont know anything about knowledge and yet we should forgive them for they know not what they not know._

Score 2 points for each challenger. Instead of scoring, each challenger loses 2 points. Take another turn.

If everyone challenges, go straight to the scoring view, apply the same awards, and grant the bonus turn.

## Tiebreakers

- Contenders receive the same Prompt with no Persona. Allow 30 seconds to submit or revise. If nobody submits, give the same contenders a fresh Prompt. If exactly one submits, that player wins. Otherwise eliminate contenders who missed the deadline.
- Reveal submitted answers together as soon as the answer window closes and start the 30-second ballot. Show anonymous answer options in the same shuffled order on every device.
- Only players who aren't answering the current Prompt can vote or initiate and participate in duplicate review. An eliminated contender can vote on the next Prompt.
- Each vote counts one point for this ballot. A missed ballot is an abstention. If one contender receives the most votes, they win. If multiple contenders tie for first, only those contenders advance to a fresh Prompt. After two consecutive completed ballots with zero votes, declare a shared tie among the remaining contenders.
- Use the regular duplicate pause and review rules. If at least two answers remain valid, clear any votes for disqualified answers, notify affected voters, and resume the ballot with at least 10 seconds left. If one remains, that contender wins immediately. If none remain, restart with a fresh Prompt for the contenders whose answers were on that ballot. In those last two cases the paused ballot does not resume.

## Leaving, rejoining, and recovery

- Preserve each seat's score, screen name, and place in the rotation. A returning player reclaims their seat using a browser-held credential. The room code alone does not identify a seat. Leaving frees a player to join or create another room. The roster stays fixed even if connected devices drop below four.
- Ordinary disconnects leave the room clock running. Apply the normal deadlines and defaults. Reconnect into the current permitted view with the latest accepted action.
- Only the host can permanently End Match, and only after explicit confirmation. A host disconnect does not end the match. Close automatically after 10 minutes with every player disconnected.
- Persist a checkpoint before the current turn draws cards. If interrupted before scoring commits, restart the turn with a new draw and fresh timers. A new draw can produce different cards. Preserve earlier scores and discard interrupted actions and uncommitted effects.
- Commit scoring and the next state together in PostgreSQL. After a committed result, restart into the saved next scheduled turn, bonus turn, tiebreaker, or victory, even if the scoring presentation was still visible. Never award points twice. Use the same boundary for tiebreakers. An uncommitted tiebreaker restarts with the same contenders and a fresh Prompt.

## Worked rulings

| Fixture                                                               | Expected result                                                                                                             |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Four-player Troll, everyone challenges                                | Phase 2 skipped. Answering Player +33, challengers zero.                                                                    |
| Four-player Troll, two challenges, one supporter switches             | Answering Player +9, challengers zero.                                                                                      |
| Three submitted challenges, two disqualified                          | Troll still counts three. The Panderer penalty is −9. The Finsta deducts 3 from each challenger.                                    |
| Four-player The Provocateur, everyone challenges                          | Answering Player −5, others zero.                                                                                           |
| Four-player Suddenly Libertarian, everyone challenges                 | Skip Phase 2. Answering Player earns 4 points (3 × 3 − 5), others zero.                                                     |
| The Ice Breaker starts at 2 points and nobody challenges                  | Apply the −3 award. Show a cumulative score of −1 in the standings.                                                         |
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

## Open design decisions

- Settle whether submitting a flag automatically records the flagger’s yes ballot.
- Confirm whether any Persona besides The Troll, The Provocateur, Suddenly Libertarian, and Ken M. overrides zero-support scoring.
- Confirm room join details and host permissions beyond starting and ending the match, including whether a host can transfer control.
- Confirm tiebreaker ballot revision behavior and the presentation timing after a tiebreaker result.

## Appendix — Prompt deck

174 prompts in source order. “Worst habit” appears once. The IDs were assigned for this edition and can stay with their prompts through reordering and wording edits.

| ID         | Prompt                                                             |
| ---------- | ------------------------------------------------------------------ |
| prompt-001 | Best vacation destination                                          |
| prompt-002 | Best on-screen performance                                         |
| prompt-003 | Best cuisine                                                       |
| prompt-004 | Best multiplayer video game                                        |
| prompt-005 | Best one hit wonder                                                |
| prompt-006 | Best time to go to bed                                             |
| prompt-007 | Best time to wake up                                               |
| prompt-008 | Best soda flavor                                                   |
| prompt-009 | Best breakfast dish                                                |
| prompt-010 | Best condiment                                                     |
| prompt-011 | Best city                                                          |
| prompt-012 | Best genre of music                                                |
| prompt-013 | Best spoken accent                                                 |
| prompt-014 | Best way to start the day                                          |
| prompt-015 | Best extreme sport                                                 |
| prompt-016 | Best song in a foreign language                                    |
| prompt-017 | Best flavor of cake                                                |
| prompt-018 | Best seafood dish                                                  |
| prompt-019 | Best hiding place                                                  |
| prompt-020 | Best way to relate with older generations                          |
| prompt-021 | Best way to sign off a professional email                          |
| prompt-022 | Best way to spend $25                                              |
| prompt-023 | Best celebrity on socials                                          |
| prompt-024 | Best cold dish                                                     |
| prompt-025 | Best hot beverage                                                  |
| prompt-026 | Best cliche tattoo                                                 |
| prompt-027 | Best method of execution                                           |
| prompt-028 | Best animated movie villain                                        |
| prompt-029 | Best basketball player                                             |
| prompt-030 | Best film franchise                                                |
| prompt-031 | Best amendment to the US constitution                              |
| prompt-032 | Best ninja weapon                                                  |
| prompt-033 | Best theme park                                                    |
| prompt-034 | Best non-dairy milk                                                |
| prompt-035 | Best one-word title movie                                          |
| prompt-036 | Best source of protein                                             |
| prompt-037 | Best video game console                                            |
| prompt-038 | Best tech company                                                  |
| prompt-039 | Best allergy                                                       |
| prompt-040 | Best species of pet                                                |
| prompt-041 | Best fashion accessory                                             |
| prompt-042 | Best way to make someone anxious                                   |
| prompt-043 | Best thing to do on a sick day                                     |
| prompt-044 | Best cozy meal                                                     |
| prompt-045 | Best species of dinosaur                                           |
| prompt-046 | Best food that vegans, vegetarians, omnivores, etc. can share      |
| prompt-047 | Best nursery rhyme                                                 |
| prompt-048 | Best fairy tale                                                    |
| prompt-049 | Best-smelling plant                                                |
| prompt-050 | Best country to visit                                              |
| prompt-051 | Best sitcom                                                        |
| prompt-052 | Best seasonal treat                                                |
| prompt-053 | Best movie soundtrack                                              |
| prompt-054 | Best word                                                          |
| prompt-055 | Best instance of nepotism                                          |
| prompt-056 | Best actor to portray James Bond                                   |
| prompt-057 | Best American                                                      |
| prompt-058 | Best stereotype                                                    |
| prompt-059 | Best Disney princess                                               |
| prompt-060 | Best day of the year                                               |
| prompt-061 | Best Andrew                                                        |
| prompt-062 | Best Jennifer                                                      |
| prompt-063 | Best weather                                                       |
| prompt-064 | Best adult animated series                                         |
| prompt-065 | Best comic strip                                                   |
| prompt-066 | Best card game that uses a standard deck                           |
| prompt-067 | Best mononymous performer                                          |
| prompt-068 | Best pseudonym                                                     |
| prompt-069 | Best compliment to a stranger                                      |
| prompt-070 | Best celebration for accomplishing a menial task                   |
| prompt-071 | Best punishment for forgetting a significant other’s birthday      |
| prompt-072 | Best instrumental piece of music                                   |
| prompt-073 | Best medicine                                                      |
| prompt-074 | Best fictional weapon                                              |
| prompt-075 | Best superpower                                                    |
| prompt-076 | Best conspiracy theory                                             |
| prompt-077 | Best fictional family                                              |
| prompt-078 | Best talking animal                                                |
| prompt-079 | Best thing to say after someone sneezes and farts at the same time |
| prompt-080 | Best example of a fundamental                                      |
| prompt-081 | Best pasta shape                                                   |
| prompt-082 | Best Christmas song                                                |
| prompt-083 | Best album for a laser show                                        |
| prompt-084 | Best fictional city                                                |
| prompt-085 | Best video game adaptation                                         |
| prompt-086 | Best month                                                         |
| prompt-087 | Best reason for calling in sick                                    |
| prompt-088 | Best cryptid                                                       |
| prompt-089 | Best vegetable                                                     |
| prompt-090 | Best hiding place for a diary                                      |
| prompt-091 | Best way to appear scary                                           |
| prompt-092 | Best stage of grief                                                |
| prompt-093 | Best logo                                                          |
| prompt-094 | Best movie monster                                                 |
| prompt-095 | Best children’s TV show                                            |
| prompt-096 | Best name to shout angrily                                         |
| prompt-097 | Best song by a bad band/artist                                     |
| prompt-098 | Best unresolved mystery                                            |
| prompt-099 | Best song to accompany night driving                               |
| prompt-100 | Best practical joke                                                |
| prompt-101 | Best old-timey malady                                              |
| prompt-102 | Worst soft drink flavor                                            |
| prompt-103 | Worst character on Friends                                         |
| prompt-104 | Worst song everyone knows                                          |
| prompt-105 | Worst movie franchise                                              |
| prompt-106 | Worst car manufacturer                                             |
| prompt-107 | Worst spice/seasoning                                              |
| prompt-108 | Worst famous singer                                                |
| prompt-109 | Worst band with an umlaut in its name                              |
| prompt-110 | Worst city to visit in the summer                                  |
| prompt-111 | Worst way to spend $25                                             |
| prompt-112 | Worst subscription service                                         |
| prompt-113 | Worst streaming platform                                           |
| prompt-114 | Worst part of raising an infant                                    |
| prompt-115 | Worst music genre                                                  |
| prompt-116 | Worst school subject                                               |
| prompt-117 | Worst on-screen death                                              |
| prompt-118 | Worst thing that makes you happy                                   |
| prompt-119 | Worst relationship advice                                          |
| prompt-120 | Worst fate worse than death                                        |
| prompt-121 | Worst time to turn on the big game                                 |
| prompt-122 | Worst spoken accent                                                |
| prompt-123 | Worst kind of vacation                                             |
| prompt-124 | Worst euphemism                                                    |
| prompt-125 | Worst sound                                                        |
| prompt-126 | Worst TV show                                                      |
| prompt-127 | Worst fast food restaurant                                         |
| prompt-128 | Worst hand gesture                                                 |
| prompt-129 | Worst hot beverage                                                 |
| prompt-130 | Worst grocery store chain                                          |
| prompt-131 | Worst airport                                                      |
| prompt-132 | Worst William                                                      |
| prompt-133 | Worst Elizabeth                                                    |
| prompt-134 | Worst conventional weapon                                          |
| prompt-135 | Worst dessert                                                      |
| prompt-136 | Worst excuse                                                       |
| prompt-137 | Worst condiment                                                    |
| prompt-138 | Worst fandom/fanbase                                               |
| prompt-139 | Worst exercise                                                     |
| prompt-140 | Worst established role model                                       |
| prompt-141 | Worst sport                                                        |
| prompt-142 | Worst ice cream flavor                                             |
| prompt-143 | Worst hobby                                                        |
| prompt-144 | Worst habit                                                        |
| prompt-145 | Worst US city                                                      |
| prompt-146 | Worst performance                                                  |
| prompt-147 | Worst book of the Bible                                            |
| prompt-148 | Worst movie in the James Bond franchise                            |
| prompt-149 | Worst Tom Clancy adaptation                                        |
| prompt-150 | Worst fictional universe                                           |
| prompt-151 | Worst superhero                                                    |
| prompt-152 | Worst Canadian                                                     |
| prompt-153 | Worst stereotype                                                   |
| prompt-154 | Worst Disney princess                                              |
| prompt-155 | Worst salad dressing                                               |
| prompt-156 | Worst Starbucks menu item                                          |
| prompt-157 | Worst day of the year                                              |
| prompt-158 | Worst day of the week                                              |
| prompt-159 | Worst Christmas movie                                              |
| prompt-160 | Worst tourist destination                                          |
| prompt-161 | Worst animal                                                       |
| prompt-162 | Worst song by a good band/artist                                   |
| prompt-163 | Worst Christmas song                                               |
| prompt-164 | Worst viral trend                                                  |
| prompt-165 | Worst smell                                                        |
| prompt-166 | Worst planet                                                       |
| prompt-167 | Worst mascot                                                       |
| prompt-168 | Worst team name                                                    |
| prompt-169 | Worst color                                                        |
| prompt-170 | Worst fish                                                         |
| prompt-171 | Worst utensil                                                      |
| prompt-172 | Worst book                                                         |
| prompt-173 | Worst piece of furniture                                           |
| prompt-174 | Worst Olympic event                                                |
