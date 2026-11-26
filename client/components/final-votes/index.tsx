import type { Result } from '../../../shared/protocol';
import { quote } from '../../quote';

export function FinalVotes({ result, name }: {
  result: Result;
  name: (id: string) => string | undefined;
}) {
  return (
    <section className='card results-transition'>
      <h1 className='horizontal-center'>Final votes</h1>
      <ul className='rows'>
        {result.entries.map((entry) => {
          const voters = Object.entries(result.votes)
            .filter(([, id]) => id === entry.id)
            .map(([voter]) => name(voter));
          return (
            <li key={entry.id}>
              <span>
                <strong>{quote(entry.text)}</strong>
                {entry.disqualified && (
                  <small className='duplicate-label'> Duplicate</small>
                )}
                <small>
                  {name(entry.authorId)}
                  {voters.length > 0 &&
                    ` · Voted for by ${voters.join(', ')}`}
                </small>
              </span>
              <strong>{result.totals[entry.id]}</strong>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

