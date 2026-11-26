import { useId, useRef } from 'react';
import { RoomCode } from '../room-code';
import './style.css';

export function RoomMenu({
  code,
  error,
  endGame,
  leaveGame,
  online
}: {
  code: string;
  error: string;
  endGame?: () => void;
  leaveGame: () => void;
  online: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogId = useId();

  return (
    <>
      <button
        type='button'
        className='room-menu-toggle'
        aria-label='Open room menu'
        aria-haspopup='dialog'
        aria-controls={dialogId}
        onClick={() => dialog.current?.showModal()}
      >
        <img
          src={new URL('../../assets/win95-settings.png', import.meta.url).href}
          width='24'
          height='24'
          alt=''
        />
      </button>
      <dialog
        ref={dialog}
        id={dialogId}
        aria-label='Room menu'
        className='card room-menu room-menu-with-close'
      >
        <RoomCode code={code} />
        {error && <p role='alert'>{error}</p>}
        <form method='dialog' className='room-menu-actions'>
          {endGame ? (
            <button type='button' disabled={!online} onClick={endGame}>
              End Game
            </button>
          ) : (
            <button type='button' onClick={leaveGame}>
              Leave Game
            </button>
          )}
          <button className='room-menu-close' aria-label='Close' autoFocus>
            <img
              src={new URL('../../assets/win95-x.svg', import.meta.url).href}
              alt=''
            />
          </button>
        </form>
      </dialog>
    </>
  );
}
