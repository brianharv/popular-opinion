import type { Action, RoomView } from '../../../shared/protocol';
import type { CSSProperties } from 'react';
import { maximumPlayers, minimumPlayers } from '../../../shared/match-options';
import { MatchSetup } from '../match-setup';
import './style.css';

export function Lobby({ view, online, send }: {
  view: RoomView;
  online: boolean;
  send: (action: Action) => boolean;
}) {
  const { players, you } = view;
  const playersNeeded = Math.max(0, minimumPlayers - players.length);
  const startHint = !online
    ? 'Reconnect to the room to start the game.'
    : playersNeeded > 0
      ? 'The game can start once enough players have joined.'
      : view.allSeatsConnected === false
        ? 'Waiting for all players to connect before starting.'
        : '';
  return (
    <section className='card waiting-room'>
      <h1>Lobby</h1>
      <p className='players-needed' role='status'>
        Players needed: <strong>{playersNeeded}</strong>
      </p>
      <ul
        className='rows lobby-roster'
        aria-label='Players'
        style={{ '--roster-size': maximumPlayers } as CSSProperties}
      >
        {players.map((player) => (
          <li key={player.id}>
            <span className='lobby-player-name' title={player.name}>
              {player.name}
            </span>
            {player.id === you && <YouIcon />}
          </li>
        ))}
      </ul>
      {view.hostId === you ? (
        <MatchSetup
          startHint={startHint}
          start={(format) => send({ type: 'start', phase: 'lobby', format })}
        />
      ) : (
        <p className='start-hint' role='status'>
          {playersNeeded > 0
            ? 'Waiting for players to join.'
            : 'Waiting for Host to start the game.'}
        </p>
      )}
    </section>
  );
}

function YouIcon() {
  return (
    <img
      className='you-icon'
      src={new URL('../../assets/win98-person.png', import.meta.url).href}
      alt='You'
    />
  );
}
