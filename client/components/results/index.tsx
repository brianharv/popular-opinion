import type { Result, RoomView } from '../../../shared/protocol';
import { PersonaCard } from '../persona-card';
import { Standings } from '../standings';
import { WinnerAnnouncement } from '../winner-announcement';
import './style.css';

export function Results({ view, result, progress, online, offset, endGame, leaveGame }: {
  view: RoomView;
  result: Result;
  progress?: string;
  online: boolean;
  offset: number;
  endGame?: () => void;
  leaveGame: () => void;
}) {
  const { match, phase, players, you } = view;
  const name = (id: string) => players.find((player) => player.id === id)?.name;
  const outcome = match?.outcome;
  const contenders = outcome?.playerIds.map(name).join(', ');
  const winner =
    outcome?.type === 'winner' ? name(outcome.playerIds[0]) : undefined;
  const finish =
    outcome?.type === 'shared-tie'
      ? `Shared tie among ${contenders}.`
      : outcome?.type === 'tiebreaker'
        ? `Tiebreaker required for ${contenders}. Tiebreaker play is unavailable in this build.`
        : undefined;

  const scores = match?.scores ?? result.awards;
  const isFinal = phase === 'complete';
  return (
    <section className='card results-transition'>
      <h1
        className={
          isFinal || (phase === 'scoring' && result.missed)
            ? 'horizontal-center'
            : undefined
        }
      >
        {isFinal
          ? 'Final standings'
          : result.missed
            ? 'No answer submitted...'
            : 'Results'}
      </h1>
      {!isFinal && view.deadline === undefined && progress && (
        <p className='tag'>{progress}</p>
      )}
      {phase === 'complete' && finish && <p role='status'>{finish}</p>}
      {phase === 'complete' && winner && <WinnerAnnouncement name={winner} />}
      {phase === 'complete' && result.missed && (
        <p className='horizontal-center'>No answer submitted.</p>
      )}
      {!isFinal && result.persona && <PersonaCard persona={result.persona} />}
      {phase === 'scoring' && result.bonusTurn && !outcome && (
        <p className='bonus-turn-card' role='status'>
          {name(view.answeringId!)} will take another turn.
        </p>
      )}
      {!isFinal && <h2>Standings</h2>}
      <Standings
        players={players}
        you={you}
        scores={scores}
        awards={result.awards}
        scoringStartedAt={
          phase === 'scoring' &&
          view.deadline !== undefined &&
          view.phaseDuration !== undefined
            ? view.deadline - view.phaseDuration
            : undefined
        }
        offset={offset}
        scoringDuration={view.phaseDuration}
      />
      {phase === 'complete' && (
        <div className='horizontal-center'>
          <button
            type='button'
            disabled={Boolean(endGame) && !online}
            onClick={endGame ?? leaveGame}
          >
            {endGame ? 'End Game' : 'Leave Game'}
          </button>
        </div>
      )}
    </section>
  );
}

