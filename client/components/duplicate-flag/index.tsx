import { useId, useRef, useState } from 'react';
import type { Action, RoomView } from '../../../shared/protocol';
import { quote } from '../../quote';
import './style.css';

export function DuplicateFlag({
  entries,
  online,
  send
}: {
  entries: RoomView['entries'];
  online: boolean;
  send: (action: Action) => boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const canSubmit =
    selected.length >= 2 &&
    entries.some((entry) => selected.includes(entry.id) && !entry.disqualified);
  return (
    <>
      <button
        type='button'
        className='outline report-duplicates'
        disabled={!online}
        onClick={() => dialog.current?.showModal()}
      >
        Report Duplicates
      </button>
      <dialog
        ref={dialog}
        onClose={() => setSelected([])}
        aria-labelledby={titleId}
        className='card room-menu'
      >
        <h2 id={titleId}>Flag duplicate answers</h2>
        <p>
          Select at least two challenge answers, including one still in play.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (
              online &&
              canSubmit &&
              send({
                type: 'flag-duplicates',
                phase: 'voting',
                answerIds: selected
              })
            ) {
              dialog.current?.close();
            }
          }}
        >
          {entries.map((entry) => (
            <label key={entry.id} className='duplicate-choice'>
              <input
                type='checkbox'
                checked={selected.includes(entry.id)}
                onChange={(event) => {
                  setSelected(
                    event.currentTarget.checked
                      ? [...selected, entry.id]
                      : selected.filter((id) => id !== entry.id)
                  );
                }}
              />
              <span>
                {quote(entry.text)}
                {entry.disqualified && (
                  <small className='duplicate-label'> Duplicate</small>
                )}
              </span>
            </label>
          ))}
          <button disabled={!online || !canSubmit}>Submit flag</button>
          <button
            type='button'
            className='outline'
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
        </form>
      </dialog>
    </>
  );
}
