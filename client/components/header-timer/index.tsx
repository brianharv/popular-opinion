import { useState } from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import './style.css';

export function HeaderTimer({
  screenKey,
  transition,
  timer,
  online,
  offset
}: {
  screenKey: string;
  transition: 'turn' | 'results' | 'duplicate';
  timer?: { deadline: number; duration?: number };
  online: boolean;
  offset: number;
}) {
  const deadline = timer?.deadline;
  const duration = timer?.duration;
  const [current, setCurrent] = useState({ screenKey, deadline, duration });
  const [previous, setPrevious] = useState<typeof current>();
  if (current.screenKey !== screenKey) {
    setPrevious(current.deadline === undefined ? undefined : current);
    setCurrent({ screenKey, deadline, duration });
  } else if (current.deadline !== deadline || current.duration !== duration) {
    setCurrent({ screenKey, deadline, duration });
  }

  return (
    <div className='header-timer' data-transition={transition}>
      {previous?.deadline !== undefined && (
        <Timer
          key={`${previous.screenKey}:${previous.deadline}:${online}`}
          deadline={previous.deadline}
          duration={previous.duration}
          offset={offset}
          leaving
        />
      )}
      {deadline !== undefined && (
        <Timer
          key={`${screenKey}:${deadline}:${online}`}
          deadline={deadline}
          duration={duration}
          offset={offset}
          enteringAfterFade={previous !== undefined}
        />
      )}
    </div>
  );
}

function Timer({
  deadline,
  duration,
  offset,
  leaving = false,
  enteringAfterFade = false
}: {
  deadline: number;
  duration?: number;
  offset: number;
  leaving?: boolean;
  enteringAfterFade?: boolean;
}) {
  if (!duration) return null;
  const seconds = duration / 1000;
  const remaining = Math.min(
    seconds,
    Math.max(0, (deadline - Date.now() - offset) / 1000)
  );
  return (
    <div
      className={leaving ? 'leaving-timer' : 'timer'}
      data-after-fade={enteringAfterFade || undefined}
      aria-hidden={leaving || undefined}
    >
      <CountdownCircleTimer
        isPlaying={remaining > 0}
        duration={seconds}
        initialRemainingTime={remaining}
        size={24}
        strokeWidth={5}
        strokeLinecap='butt'
        colors={remaining > 0 ? '#ffffff' : '#211c1b'}
        trailColor='#211c1b'
      >
        {({ remainingTime }) => (
          <span
            role='timer'
            aria-label={`${remaining > 0 ? remainingTime : 0} seconds remaining`}
          />
        )}
      </CountdownCircleTimer>
    </div>
  );
}
