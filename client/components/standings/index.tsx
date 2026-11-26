import { useEffect, useState } from 'react';
import type { RoomView } from '../../../shared/protocol';
import './style.css';

const scoringLeadIn = 3300;
const scoreTransferDuration = 520;
const scoreTransferPause = 300;

export function Standings({
  players,
  you,
  scores,
  awards,
  scoringStartedAt,
  scoringDuration,
  offset
}: {
  players: RoomView['players'];
  you: string;
  scores: Record<string, number>;
  awards: Record<string, number>;
  scoringStartedAt?: number;
  scoringDuration?: number;
  offset: number;
}) {
  const [now, setNow] = useState(Date.now);
  let nextStart = scoringLeadIn;
  const rows = [...players]
    .sort((a, b) => scores[b.id] - scores[a.id])
    .map((player) => {
      const award = awards[player.id];
      const startsAt = nextStart;
      nextStart +=
        (award === 0 ? 0 : scoreTransferDuration) + scoreTransferPause;
      return { player, award, startsAt };
    });
  const animationDuration = Math.max(
    0,
    nextStart - scoreTransferPause - scoringLeadIn
  );
  const availableTime = Math.max(
    0,
    (scoringDuration ?? Infinity) - scoringLeadIn - 500
  );
  const transferTime = Math.min(animationDuration, availableTime);
  const sequenceDuration = scoringLeadIn + transferTime;

  useEffect(() => {
    if (scoringStartedAt === undefined) return;
    const endsAt = scoringStartedAt + sequenceDuration - offset;
    setNow(Date.now());
    if (Date.now() >= endsAt) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [scoringStartedAt, offset, sequenceDuration]);

  const displayElapsed =
    scoringStartedAt === undefined
      ? sequenceDuration
      : now + offset - scoringStartedAt;
  const elapsed =
    displayElapsed < scoringLeadIn
      ? displayElapsed
      : displayElapsed >= sequenceDuration
        ? scoringLeadIn + animationDuration
        : scoringLeadIn +
          (displayElapsed - scoringLeadIn) * (animationDuration / transferTime);

  return (
    <ul className='rows standings'>
      {rows.map(({ player, award, startsAt }) => {
        const progress = Math.max(
          0,
          Math.min(1, (elapsed - startsAt) / scoreTransferDuration)
        );
        const transferred =
          Math.sign(award) * Math.floor(Math.abs(award) * progress);
        const remaining = award - transferred;
        const showChange = award === 0 ? elapsed < startsAt : remaining !== 0;
        return (
          <li
            key={player.id}
            className={player.id === you ? 'your-row' : undefined}
          >
            <span>{player.name}</span>
            <span className='score'>
              {showChange && (
                <span
                  className='score-change'
                  data-direction={Math.sign(remaining)}
                >
                  {remaining >= 0 ? '+' : ''}
                  {remaining}
                </span>
              )}
              <strong>{scores[player.id] - remaining} pts</strong>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
