import type { Action, RoomView } from '../../../shared/protocol';
import { useState, type FormEvent } from 'react';
import { PersonaCard } from '../persona-card';
import { DuplicateFlag } from '../duplicate-flag';
import { quote } from '../../quote';
import './style.css';

export function PlayTurn({ view, progress, online, send }: {
  view: RoomView;
  progress?: string;
  online: boolean;
  send: (action: Action) => boolean;
}) {
  const { phase, you, accepted, players } = view;
  const answering = view.answeringId === you;
  const name = (id: string) => players.find((player) => player.id === id)?.name;
  const [draft, setDraft] = useState('');
  const [choice, setChoice] = useState(
    accepted?.type === 'challenge' ? 'challenge' : 'support'
  );
  const [editingFrom, setEditingFrom] = useState<string>();
  const acceptedText = accepted && 'text' in accepted ? accepted.text : '';
  const submissionKey = JSON.stringify(accepted);
  const showSubmission = editingFrom !== submissionKey ? accepted : undefined;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online || (phase !== 'answering' && phase !== 'response')) return;
    const text = draft.trim();
    const submission: Action =
      phase === 'answering'
        ? { type: 'answer', phase, text }
        : choice === 'support'
          ? { type: 'support', phase }
          : { type: 'challenge', phase, text };
    const submittedText = 'text' in submission ? submission.text : '';
    if ('text' in submission && !submittedText) return;
    if (accepted?.type === submission.type && acceptedText === submittedText) {
      setEditingFrom(undefined);
      return;
    }
    send(submission);
  }

  return (
    <section
      className={phase === 'answering' ? 'card turn-transition' : 'card'}
    >
      <div className='phase'>
        {progress && <span className='tag'>{progress}</span>}
        <span className='tag phase-label'>
          {phase === 'response'
            ? 'Support or challenge'
            : phase === 'voting'
              ? 'Final vote'
              : 'Your turn'}
        </span>
      </div>
      <h1 className='gameplay-prompt horizontal-center'>
        {quote(view.prompt)}
      </h1>
      {view.persona && <PersonaCard persona={view.persona} />}
      {phase === 'response' && (
        <blockquote className='horizontal-center'>
          {quote(view.entries[0]?.text)}
        </blockquote>
      )}
      {showSubmission && (
        <div className='horizontal-center'>
          <div role='status'>
            {showSubmission.type === 'support' ? (
              <h2 className='submitted-support'>You Support this answer.</h2>
            ) : (
              <h2
                className={
                  showSubmission.type === 'challenge'
                    ? 'submitted-challenge'
                    : 'submitted-answer'
                }
              >
                {showSubmission.type === 'challenge' && 'Your Challenge: '}
                {quote(acceptedText)}
              </h2>
            )}
          </div>
          <button
            type='button'
            className='change-response'
            onClick={() => {
              if (
                showSubmission.type === 'support' ||
                showSubmission.type === 'challenge'
              ) {
                setChoice(showSubmission.type);
              }
              setDraft(acceptedText);
              setEditingFrom(submissionKey);
            }}
          >
            Change your mind?
          </button>
        </div>
      )}
      {!showSubmission &&
        ((phase === 'answering' && answering) ||
          (phase === 'response' && !answering)) && (
          <form onSubmit={submit}>
            {phase === 'response' && (
              <fieldset
                className='response-choices'
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.nativeEvent.isComposing &&
                    event.target instanceof HTMLInputElement
                  ) {
                    event.preventDefault();
                    event.target.form?.requestSubmit();
                  }
                }}
              >
                <legend>Your response</legend>
                <label className='support-choice'>
                  <input
                    type='radio'
                    name='response'
                    checked={choice === 'support'}
                    onChange={() => setChoice('support')}
                  />{' '}
                  Support
                </label>
                <label className='challenge-choice'>
                  <input
                    type='radio'
                    name='response'
                    checked={choice === 'challenge'}
                    onChange={() => setChoice('challenge')}
                  />{' '}
                  Challenge
                </label>
              </fieldset>
            )}
            {(phase === 'answering' || choice === 'challenge') && (
              <label>
                {phase === 'answering' ? 'Your answer' : 'Challenge answer'}
                <input
                  type='text'
                  enterKeyHint='send'
                  required
                  maxLength={160}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </label>
            )}
            <button disabled={!online}>
              {phase === 'answering' ? 'Submit answer' : 'Submit response'}
            </button>
          </form>
        )}
      {phase === 'voting' && (
        <>
          <p>
            {view.vote
              ? 'Keep your vote or move it to another answer.'
              : 'Supporters are casting their final votes.'}
          </p>
          {view.voteReturned && (
            <p role='status'>
              Your vote returned to the original answer. You can move it again.
            </p>
          )}
          <ul className='rows vote-rows'>
            {view.entries.map((entry, index) => (
              <li
                key={entry.id}
                className={
                  entry.disqualified ? 'disqualified-answer' : undefined
                }
              >
                <span>
                  <strong>{quote(entry.text)}</strong>
                  {index === 0 && (
                    <small className='original-answer-label'>
                      {' '}
                      Original answer
                    </small>
                  )}
                  {entry.disqualified && (
                    <small className='duplicate-label'> Duplicate</small>
                  )}
                </span>
                {view.vote && !entry.disqualified && (
                  <button
                    disabled={!online || view.vote === entry.id}
                    aria-label={`Vote for ${entry.text}`}
                    aria-pressed={view.vote === entry.id}
                    onClick={() =>
                      send({ type: 'vote', phase, answerId: entry.id })
                    }
                  >
                    {view.vote === entry.id ? (
                      <span aria-hidden='true'>✓</span>
                    ) : (
                      'Vote'
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {view.canFlagDuplicates && (
            <DuplicateFlag
              entries={view.entries.slice(1)}
              online={online}
              send={send}
            />
          )}
        </>
      )}
    </section>
  );
}
