import type { Persona } from '../../../shared/protocol';
import './style.css';

export function PersonaCard({ persona }: { persona: Persona }) {
  const { subtitle } = persona;
  return (
    <aside className='persona-card'>
      <strong className='persona-title'>{persona.name}</strong>
      {subtitle && <p className='persona-subtitle'>{subtitle}</p>}
      <hr className='horizontal-center narrow-line' />
      <p className='persona-rule'>{persona.rule}</p>
    </aside>
  );
}
