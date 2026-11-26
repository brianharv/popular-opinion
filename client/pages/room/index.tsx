import { useCallback, useId, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ConnectingToRoom } from '../../components/connecting-to-room';
import { HeaderTimer } from '../../components/header-timer';
import { RoomCode } from '../../components/room-code';
import { RoomMenu } from '../../components/room-menu';
import { Turn } from '../../components/turn';
import { WaitingHints } from '../../components/waiting-hints';
import { useRoomConnection } from '../../hooks/use-room-connection';
import './style.css';

export function Room() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const onEnded = useCallback(() => {
    navigate('/', { replace: true, state: { gameEnded: true } });
  }, [navigate]);
  const { view, error, online, offset, send, endMatch } = useRoomConnection(code, onEnded);
  const endGameDialog = useRef<HTMLDialogElement>(null);
  const endGameTitle = useId();

  function requestEndGame() {
    endGameDialog.current?.showModal();
  }

  function endGame() {
    if (endMatch()) endGameDialog.current?.close();
  }

  function leaveGame() {
    navigate('/');
  }

  const connecting = !online && !error;
  const timer =
    view?.previewWait ??
    (view?.deadline !== undefined &&
    (view.phase === 'answering' ||
      view.phase === 'response' ||
      view.phase === 'voting' ||
      view.phase === 'scoring' ||
      view.duplicateReview)
      ? { deadline: view.deadline, duration: view.phaseDuration }
      : undefined);
  const screen = view?.previewWait ? 'preview-wait' : view?.phase;
  const isWaiting =
    view &&
    (view.previewWait ||
      (view.phase === 'answering' && view.you !== view.answeringId));
  const screenKey = `${view?.turnId ?? 'room'}:${screen}`;
  return (
    <>
      {view?.phase !== 'complete' && (
        <header
          className={
            view && view.phase !== 'lobby' ? 'top top-with-timer' : 'top'
          }
        >
          {(!view || view.phase === 'lobby') && (
            <Link to='/' className='room-back' aria-label='Back to home'>
              <span aria-hidden='true'>←</span>
            </Link>
          )}
          {view?.phase === 'lobby' && (
            <RoomCode key={code} code={code} showShareHint />
          )}
          {view && view.phase !== 'lobby' && (
            <HeaderTimer
              screenKey={screenKey}
              transition={
                view.duplicateReview
                  ? 'duplicate'
                  : view.result
                    ? 'results'
                    : 'turn'
              }
              timer={timer}
              online={online}
              offset={offset}
            />
          )}
          {view && view.phase !== 'lobby' && (
            <RoomMenu
              key={code}
              code={code}
              error={error}
              online={online}
              endGame={view.hostId === view.you ? requestEndGame : undefined}
              leaveGame={leaveGame}
            />
          )}
        </header>
      )}
      {error && (
        <p role='alert' className='card'>
          {error}
        </p>
      )}
      {connecting && !view && (
        <section className='card waiting-room' aria-hidden='true'>
          <h1>Lobby</h1>
        </section>
      )}
      {view && (
        <Turn
          key={screenKey}
          view={view}
          send={send}
          online={online}
          endGame={view.hostId === view.you ? endGame : undefined}
          leaveGame={leaveGame}
          offset={offset}
        />
      )}
      {isWaiting && <WaitingHints key={view.turnId} />}
      {view &&
        view.hostId === view.you &&
        view.phase !== 'lobby' &&
        view.phase !== 'complete' && (
          <dialog
            ref={endGameDialog}
            className='card room-menu'
            aria-labelledby={endGameTitle}
          >
            <h2 id={endGameTitle} className='horizontal-center'>
              End the game for everyone?
            </h2>
            <form method='dialog' className='end-game-actions'>
              <button className='outline' autoFocus>
                Cancel
              </button>
              <button
                type='button'
                className='confirm-end-game'
                disabled={!online}
                onClick={endGame}
              >
                End Game
              </button>
            </form>
          </dialog>
        )}
      {connecting && <ConnectingToRoom />}
    </>
  );
}
