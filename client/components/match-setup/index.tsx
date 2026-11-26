import { useId, useState, type FormEvent } from 'react';
import { pointOptions, roundOptions } from '../../../shared/match-options';
import type { MatchFormat } from '../../../shared/protocol';
import './style.css';

export function MatchSetup({
  startHint,
  start
}: {
  startHint: string;
  start: (format: MatchFormat) => void;
}) {
  const hintId = useId();
  const [format, setFormat] = useState<MatchFormat>({
    type: 'rounds',
    rounds: 5
  });
  return (
    <form
      className='match-setup'
      onSubmit={(event) => {
        event.preventDefault();
        if (!startHint) start(format);
      }}
    >
      <label>
        Game type
        <select
          value={format.type}
          onChange={(event) =>
            setFormat(
              event.target.value === 'rounds'
                ? { type: 'rounds', rounds: 5 }
                : { type: 'points', target: 50 }
            )
          }
        >
          <option value='rounds'>Rounds</option>
          <option value='points'>Point total</option>
        </select>
      </label>
      {format.type === 'rounds' ? (
        <label>
          Rounds per player
          <select
            value={format.rounds}
            onChange={(event) => {
              const rounds = roundOptions.find(
                (option) => String(option) === event.target.value
              );
              if (rounds) setFormat({ type: 'rounds', rounds });
            }}
          >
            {roundOptions.map((rounds) => (
              <option key={rounds}>{rounds}</option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Point target
          <select
            value={format.target}
            onChange={(event) => {
              const target = pointOptions.find(
                (option) => String(option) === event.target.value
              );
              if (target) setFormat({ type: 'points', target });
            }}
          >
            {pointOptions.map((points) => (
              <option key={points}>{points}</option>
            ))}
          </select>
        </label>
      )}
      <button
        className='start-game'
        disabled={Boolean(startHint)}
        aria-describedby={startHint ? hintId : undefined}
      >
        Start game
      </button>
      <small id={hintId} className='start-hint' role='status'>
        {startHint}
      </small>
    </form>
  );
}
