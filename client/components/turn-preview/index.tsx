import type { RoomView } from '../../../shared/protocol';
import { PersonaCard } from '../persona-card';
import { quote } from '../../quote';
import './style.css';

export function TurnPreview({ view }: { view: RoomView }) {
  const { phase, you, players } = view;
  const name = (id: string) => players.find((player) => player.id === id)?.name;
  if (view.previewWait) {
    return (
      <div className='round-preview'>
        <section className='card turn-transition horizontal-center'>
          <h1>{name(view.answeringId!)}’s turn.</h1>
          <p>Please wait while they review their persona.</p>
        </section>
      </div>
    );
  }

  return (
    <div className='round-preview'>
      <section className='card turn-transition'>
        {phase === 'turn-intro' ? (
          <h1>It’s your turn, {name(you)}</h1>
        ) : phase === 'persona-preview' && view.persona ? (
          <PersonaCard persona={view.persona} />
        ) : (
          <h1 className='gameplay-prompt horizontal-center'>
            {quote(view.prompt)}
          </h1>
        )}
      </section>
    </div>
  );
}
