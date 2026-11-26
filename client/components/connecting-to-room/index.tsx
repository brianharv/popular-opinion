import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router';
import './style.css';

export function ConnectingToRoom() {
  const dialog = useRef<HTMLDialogElement>(null);
  const statusId = useId();

  useEffect(() => {
    const modal = dialog.current!;
    modal.showModal();
    return () => modal.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className='card room-loading'
      aria-labelledby={statusId}
      onCancel={(event) => event.preventDefault()}
    >
      <span className='room-loading-squares' aria-hidden='true'>
        <span />
        <span />
        <span />
        <span />
      </span>
      <p id={statusId} role='status'>
        Connecting to room…
      </p>
      <Link to='/'>Back to home</Link>
    </dialog>
  );
}
