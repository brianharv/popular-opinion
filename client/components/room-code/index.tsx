import { useState } from 'react';
import './style.css';

export function RoomCode({
  code,
  showShareHint = false
}: {
  code: string;
  showShareHint?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
    'idle'
  );

  async function copy(button: HTMLButtonElement) {
    setCopyStatus('idle');
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('copied');
      return;
    } catch {
      // Try the selection-based copy on insecure origins or when clipboard access is denied.
    }

    if (!button.isConnected) return;
    const field = document.createElement('textarea');
    field.value = code;
    field.readOnly = true;
    field.className = 'clipboard-fallback';
    (button.closest('dialog') ?? document.body).append(field);
    try {
      field.focus({ preventScroll: true });
      field.select();
      field.setSelectionRange(0, code.length);
      setCopyStatus(document.execCommand('copy') ? 'copied' : 'failed');
    } catch {
      setCopyStatus('failed');
    } finally {
      field.remove();
      button.focus({ preventScroll: true });
    }
  }

  return (
    <div className='room-code' data-copy-status={copyStatus}>
      <span>
        <span className='room-code-label'>Room code:</span>{' '}
        <strong>{code}</strong>
      </span>
      <button
        type='button'
        className='outline copy-code'
        aria-label='Copy room code'
        onClick={(event) => void copy(event.currentTarget)}
      >
        <svg
          aria-hidden='true'
          width='22'
          height='22'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.75'
          strokeLinejoin='round'
        >
          {copyStatus === 'copied' ? (
            <path d='m5 12 4 4L19 6' strokeLinecap='round' />
          ) : (
            <>
              <path d='M8 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2' />
              <rect x='8' y='2' width='8' height='5' rx='1' />
            </>
          )}
        </svg>
      </button>
      {showShareHint && (
        <small className='room-share-hint'>
          Share the room code to add more players.
        </small>
      )}
      <small role='status'>
        {copyStatus === 'copied' && 'Room code copied.'}
        {copyStatus === 'failed' &&
          'Could not copy. Select the room code to copy it manually.'}
      </small>
    </div>
  );
}
