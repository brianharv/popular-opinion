import { useState } from 'react';
import './style.css';

const hints = [
  'By default, challengers score 2 points per vote. Pay attention, some personas change this.',
  'Provided there is enough time, you can always change your response by clicking “Change your mind?”',
  'Some personas punish challengers.',
  'If a persona does not mention a default rule, that rule is still in effect.',
  'By default, the challenger(s) with the most votes out of all players that round scores double.',
  'Usually, if an answer receives all challenges and no support, the round ends immediately and the answering player loses a point. Some personas change this rule…',
  'If an answer seems intentionally bad, there might be a good reason for that...',
  'A retained vote is a support vote that stays on the original answer through the end of final voting.',
  'If you do not support or challenge an answer before the timer runs out, you will automatically vote “support.”',
  'It is possible to gain and lose points in the same turn',
  'Duplicate or closely related answers should be disqualified. Click “Report Duplicates” to put them to a vote.',
  'Personas are drawn from a shuffled deck. Once the deck runs out, every persona becomes available again.',
  'It’s in the spirit of the game to avoid collusion.',
  'If you lose connection, rejoin with the room code to reclaim your seat.',
  'If you challenge, you cannot vote that round.',
  'Challengers can flag duplicate answers.',
  'Disqualified challengers can still be penalized by the modifier.',
  'Some personas reward supporters more than other players'
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
        <img
          className='hint-icon'
          src={new URL('../../assets/win95-info.png', import.meta.url).href}
          alt=''
        />
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
