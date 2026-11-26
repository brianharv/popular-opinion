import type { Action, RoomView } from '../../../shared/protocol';
import { quote } from '../../quote';
import './style.css';

export function DuplicateReview({ entries, review, progress, online, send }: {
  entries: RoomView['entries'];
  review: NonNullable<RoomView['duplicateReview']>;
  progress?: string;
  online: boolean;
  send: (action: Action) => boolean;
}) {
  const { eligible, ballot, outcome } = review;
  return (
    <section className='card duplicate-transition'>
      {progress && <p className='tag'>{progress}</p>}
      <h1>
        {outcome
          ? 'Duplicate review result'
          : 'Are these answers duplicates?'}
      </h1>
      {outcome ? (
        <p role='status'>
          {outcome.passed
            ? 'Answers deemed duplicates.'
            : 'Answers were not deemed duplicates.'}{' '}
          {outcome.yes} yes · {outcome.no} no.
        </p>
      ) : eligible ? (
        <div className='duplicate-vote-actions'>
          <button
            type='button'
            className='outline'
            aria-pressed={ballot === true}
            disabled={!online}
            onClick={() =>
              send({
                type: 'vote-duplicates',
                phase: 'duplicate-review',
                yes: true
              })
            }
          >
            Yes
          </button>
          <button
            type='button'
            className='outline'
            aria-pressed={ballot === false}
            disabled={!online}
            onClick={() =>
              send({
                type: 'vote-duplicates',
                phase: 'duplicate-review',
                yes: false
              })
            }
          >
            No
          </button>
        </div>
      ) : (
        <p>You’re spectating because one of your answers was flagged.</p>
      )}
      <ul className='rows vote-rows'>
        {entries.map((entry) => (
          <li key={entry.id}>
            <span>
              <strong>{quote(entry.text)}</strong>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

