import { useState } from 'react';

const hints = [
  'By default, challengers score 2 points per vote. Pay attention, some personas change this.',
  'Provided there is enough time, you can always change your response by clicking “Change your mind?”',
  'Some personas punish challengers.',
  'By default, the challenger(s) most votes out of all players scores double.',
  'Usually, if an answer receives all challenges and no support, the round ends immediately and no one scores. Some personas change this rule…',
  'If an answer seems intentionally bad, there might be a good reason for that...',
  'A retained vote is a support vote that stays on the original answer through the end of final voting.',
  'If you do not support or challenge an answer before the timer runs out, you will automatically vote “support.”',
  'Duplicate or closely related answers should be disqualified. Click “Report Duplicates” to put them to a vote.',
  'Personas are randomly selected each turn. The same persona can appear more than once in a game.',
  'It’s in the spirit of the game to avoid collusion.',
  'If you lose connection, rejoin with the room code to reclaim your seat.',
  'If you challenge, you cannot vote that round.',
  'Challengers can flag duplicate answers.',
  'Disqualified challengers can still be penalized by the modifier.'
];

export function WaitingHints() {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * hints.length)
  );
  const [leaving, setLeaving] = useState(false);

  return (
    <div className='hint-carousel'>
      <button
        type='button'
        className={leaving ? 'waiting-hints hint-leaving' : 'waiting-hints'}
        aria-description='Activate to read the next gameplay hint'
        onClick={() => setLeaving(true)}
        onAnimationEnd={(event) => {
          if (event.animationName !== 'hint-leave') return;
          setIndex((current) => (current + 1) % hints.length);
          setLeaving(false);
        }}
      >
        <span className='hint-copy'>
          {hints.map((hint) => (
            <span key={hint} className='hint-size-sample' aria-hidden='true'>
              {hint}
            </span>
          ))}
          <span aria-live='polite'>{hints[index]}</span>
        </span>
        <span aria-hidden='true'>→</span>
      </button>
    </div>
  );
}
