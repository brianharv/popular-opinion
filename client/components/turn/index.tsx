import type { Action, RoomView } from '../../../shared/protocol';
import { Lobby } from '../lobby';
import { TurnPreview } from '../turn-preview';
import { DuplicateReview } from '../duplicate-review';
import { FinalVotes } from '../final-votes';
import { Results } from '../results';
import { PlayTurn } from '../play-turn';

export function Turn({
  view,
  send,
  online,
  offset,
  endGame,
  leaveGame
}: {
  view: RoomView;
  send: (action: Action) => boolean;
  online: boolean;
  offset: number;
  endGame?: () => void;
  leaveGame: () => void;
}) {
  const { players, phase, you, result, match } = view;
  const answering = view.answeringId === you;
  const name = (id: string) => players.find((player) => player.id === id)?.name;

  const format = match?.format;
  const turnLabel =
    match &&
    `Turn ${match.turnNumber}${match.isBonusTurn ? ' · Bonus turn' : ''}`;
  const progress =
    match &&
    format &&
    (format.type === 'rounds'
      ? `Round ${Math.ceil((match.scheduledTurnNumber ?? match.turnNumber) / players.length)} of ${format.rounds} · ${turnLabel}`
      : `First to ${format.target} points · ${turnLabel}`);
  if (phase === 'lobby') {
    return <Lobby view={view} online={online} send={send} />;
  }

  if (
    view.previewWait ||
    phase === 'turn-intro' ||
    phase === 'persona-preview' ||
    (phase === 'answering' && !answering)
  ) {
    return <TurnPreview view={view} />;
  }

  if (view.duplicateReview) {
    return (
      <DuplicateReview
        entries={view.entries}
        review={view.duplicateReview}
        progress={progress}
        online={online}
        send={send}
      />
    );
  }

  if (phase === 'final-votes' && result) {
    return <FinalVotes result={result} name={name} />;
  }

  if (result) {
    return (
      <Results
        view={view}
        result={result}
        progress={progress}
        online={online}
        offset={offset}
        endGame={endGame}
        leaveGame={leaveGame}
      />
    );
  }

  return <PlayTurn view={view} progress={progress} online={online} send={send} />;
}
