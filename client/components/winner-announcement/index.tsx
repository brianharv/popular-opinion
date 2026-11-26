import { useEffect, useId, useRef } from 'react';
import './style.css';

export function WinnerAnnouncement({ name }: { name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const modal = dialog.current!;
    let dismiss: ReturnType<typeof setTimeout> | undefined;
    const show = setTimeout(() => {
      modal.showModal();
      dismiss = setTimeout(() => modal.close(), 3000);
    }, 3000);
    return () => {
      clearTimeout(show);
      clearTimeout(dismiss);
      modal.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className='card room-menu winner-announcement'
      aria-labelledby={titleId}
    >
      <h1 id={titleId}>{name} wins!</h1>
    </dialog>
  );
}
