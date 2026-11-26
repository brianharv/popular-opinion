import { Link } from 'react-router';

export function HowToPlay() {
  return (
    <section className='card'>
      <h1>How to Play</h1>
      <ul>
        <li>
          Each turn, one player tries to score as many points as possible by
          answering a <strong>prompt</strong> and using their secret{' '}
          <strong>persona</strong>.
        </li>
        <li>
          Everyone else chooses to <strong>support</strong> the answer or{' '}
          <strong>challenge</strong> with an answer of their own.
        </li>
        <li>
          Next, the <strong>supporters</strong> choose to keep their vote in
          support of the original answer or to move it to a challenger.
        </li>
        <li>
          When time expires, everyone sees the votes, persona, and the points
          are tallied.
        </li>
      </ul>
      <h2>Scoring</h2>
      <ul>
        <li>
          Each <strong>persona</strong> affects the scoring of each turn
          differently. Sometimes you're rewarded for getting the most
          supporters, other times you're rewarded for being divisive.
        </li>
        <li>
          By default, <strong>challengers</strong> gain 2 points for each
          supporting vote they steal and gain 2x points if they end the round
          with the most votes.
        </li>
        <li>
          Challengers with duplicate answers are disqualified and subjected to a{' '}
          <strong>2 point deduction</strong>.
        </li>
        <li>
          If a challenger steals no votes, they suffer a{' '}
          <strong>1 point deduction</strong>.
        </li>
        <li>
          If the initial answer gets no supporters, the round ends and that
          player <strong>loses a point</strong>.
        </li>
      </ul>
      <hr className='horizontal-center narrow-line'></hr>
      <h3 className='horizontal-center heavier-text'>
        Remember, the persona makes the rules different each turn. If an above
        rule hasn't been addressed in the persona, it is still in effect. Pay
        attention.
      </h3>
      <Link to='/'>Back to home</Link>
    </section>
  );
}
