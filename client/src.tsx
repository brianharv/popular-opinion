import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams
} from 'react-router';
import type {
  Action,
  Credential,
  RoomView,
  ServerMessage
} from '../shared/protocol';
import './style.css';

const seatKey = (code: string) => `public-opinion:${code}`;

function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'create' | 'join'>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get('code') ?? '')
      .trim()
      .toUpperCase();
    setError('');
    setBusy(true);
    try {
      if (mode === 'join' && localStorage.getItem(seatKey(code))) {
        navigate(`/room/${code}`);
        return;
      }
      const res = await fetch(
        mode === 'join'
          ? `/api/rooms/${encodeURIComponent(code)}/join`
          : '/api/rooms',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.get('name') })
        }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      const credential: Credential = body;
      localStorage.setItem(seatKey(credential.code), credential.token);
      navigate(`/room/${credential.code}`);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Unable to connect.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className='hero'>
        <span className='tag'>A party game for 4–12 players</span>
        <h1>
          Public
          <br />
          Opinion<span>.</span>
        </h1>
        <p>Give your best answer. See who agrees.</p>
      </section>
      <section className='card'>
        <div className='actions'>
          <button
            aria-pressed={mode === 'create'}
            onClick={() => {
              setMode('create');
              setError('');
            }}
          >
            Create Game
          </button>
          <button
            className='outline'
            aria-pressed={mode === 'join'}
            onClick={() => {
              setMode('join');
              setError('');
            }}
          >
            Join Game
          </button>
          <Link to='/how-to-play'>How to Play</Link>
        </div>
        {mode && (
          <form key={mode} onSubmit={submit}>
            {mode === 'join' && (
              <label>
                Room code
                <input
                  name='code'
                  required
                  maxLength={8}
                  autoCapitalize='characters'
                />
              </label>
            )}
            <label>
              Screen name
              <input
                name='name'
                required
                maxLength={24}
                autoComplete='nickname'
              />
            </label>
            <button disabled={busy}>
              {mode === 'create' ? 'Create room' : 'Join room'}
            </button>
          </form>
        )}
        {error && <p role='alert'>{error}</p>}
      </section>
    </>
  );
}

function HowToPlay() {
  return (
    <section className='card'>
      <h1>How to Play</h1>
      <ul>
        <li>Gather 4–12 players and share your room code.</li>
        <li>
          Each turn, one player tries to score as many points as possible by
          answering a <strong>prompt</strong> using their secret{' '}
          <strong>modifier</strong>.
        </li>
        <li>
          Everyone else chooses to <strong>support</strong> the answer or{' '}
          <strong>challenge</strong> with an answer of their own.
        </li>
        <li>
          <strong>Supporters</strong> can keep their vote on the original answer
          or move it to a challenger.
        </li>
        <li>
          When time expires, everyone sees the votes, modifier, and points.
        </li>
      </ul>
      <h2>Keep in mind</h2>
      <ul>
        <li>
          Each <strong>modifier</strong> affects the scoring of each turn
          differently. Sometimes you're rewarded for getting most Supporters,
          other times you're rewarded for being divisive.
        </li>
        <li>
          <strong>Challengers</strong> gain 2 points for each supporting vote
          they steal and gain 2x points if they end the round with the most
          votes.
        </li>
        <li>
          If the initial answer gets <strong>no supporters</strong>, the round
          ends and no one scores any points.
        </li>
      </ul>
      <h3 className='horizontal-center'>
        Whatever the modifier for that turn says goes. The modifier can change
        any rule.
      </h3>
      <Link to='/'>Back to home</Link>
    </section>
  );
}

function Room() {
  const { code = '' } = useParams();
  const [view, setView] = useState<RoomView>();
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const offset = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem(seatKey(code));
    if (!token) {
      setError('Join this room from the home page first.');
      return;
    }
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    function connect() {
      const ws = new WebSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
      );
      socket.current = ws;
      ws.onopen = () => ws.send(JSON.stringify({ code, token }));
      ws.onmessage = (event) => {
        if (stopped) return;
        const message = JSON.parse(event.data) as ServerMessage;
        if ('view' in message) {
          offset.current = message.view.serverTime - Date.now();
          setView(message.view);
          setOnline(true);
          setError('');
        } else setError(message.error);
      };
      ws.onclose = (event) => {
        if (stopped) return;
        setOnline(false);
        if (event.code === 1008) localStorage.removeItem(seatKey(code));
        else retry = setTimeout(connect, 700);
      };
    }
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket.current?.close();
    };
  }, [code]);

  function send(action: Action) {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify(action));
  }

  return (
    <>
      <header className='top'>
        <Link to='/'>Public Opinion</Link>
        <span>
          Room code <strong>{code}</strong>
        </span>
      </header>
      {error && (
        <p role='alert' className='card'>
          {error}
        </p>
      )}
      {!online && !error && <p role='status'>Connecting to room…</p>}
      {view && (
        <Turn
          key={view.phase}
          view={view}
          send={send}
          online={online}
          offset={offset.current}
        />
      )}
    </>
  );
}

function Timer({ deadline, offset }: { deadline: number; offset: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className='timer' aria-label='Seconds remaining'>
      {Math.max(0, Math.ceil((deadline - now - offset) / 1000))}s
    </span>
  );
}

function Turn({
  view,
  send,
  online,
  offset
}: {
  view: RoomView;
  send: (action: Action) => void;
  online: boolean;
  offset: number;
}) {
  const { players, phase, you, result } = view;
  const [draft, setDraft] = useState(
    view.accepted && 'text' in view.accepted ? view.accepted.text : ''
  );
  const [choice, setChoice] = useState(
    view.accepted?.type === 'challenge' ? 'challenge' : 'support'
  );
  const [banner, setBanner] = useState(
    () => (view.bannerUntil ?? 0) > Date.now() + offset
  );
  useEffect(() => {
    if (view.bannerUntil === undefined) return;
    const timer = setTimeout(
      () => setBanner(false),
      Math.max(0, view.bannerUntil - Date.now() - offset)
    );
    return () => clearTimeout(timer);
  }, [view.bannerUntil, offset]);
  const answering = view.answeringId === you;
  const name = (id: string) => players.find((player) => player.id === id)?.name;
  const row = (id: string) => (
    <>
      {name(id)} {id === you && <span className='you'>You</span>}
    </>
  );

  if (phase === 'lobby')
    return (
      <section className='card'>
        <h1>Waiting room</h1>
        <p>Share the room code. You need at least four players.</p>
        <ul className='rows'>
          {players.map((player) => (
            <li key={player.id}>{row(player.id)}</li>
          ))}
        </ul>
        {view.hostId === you && (
          <button
            disabled={!online || players.length < 4}
            onClick={() => send({ type: 'start', phase })}
          >
            Start turn
          </button>
        )}
      </section>
    );

  if (result)
    return (
      <section className='card'>
        <div className='phase'>
          <h1>
            {phase === 'complete'
              ? 'Final standings'
              : result.missed
                ? 'No answer submitted'
                : 'Scoring'}
          </h1>
          {view.deadline && <Timer deadline={view.deadline} offset={offset} />}
        </div>
        {phase === 'complete' && result.missed && <p>No answer submitted.</p>}
        {result.modifier && (
          <aside>
            <strong>{result.modifier.name}</strong>
            <p>{result.modifier.rule}</p>
          </aside>
        )}
        <h2>Standings</h2>
        <ul className='rows'>
          {[...players]
            .sort((a, b) => result.awards[b.id] - result.awards[a.id])
            .map((player) => (
              <li
                key={player.id}
                className={player.id === you ? 'your-row' : undefined}
              >
                <span>{row(player.id)}</span>
                <strong>{result.awards[player.id]} pts</strong>
              </li>
            ))}
        </ul>
        {result.entries.length > 0 && (
          <>
            <h2>Final votes</h2>
            <ul className='rows'>
              {result.entries.map((entry) => {
                const voters = Object.entries(result.votes)
                  .filter(([, id]) => id === entry.id)
                  .map(([voter]) => name(voter));
                return (
                  <li key={entry.id}>
                    <span>
                      <strong>{entry.text}</strong>
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
          </>
        )}
        {phase === 'complete' && <Link to='/'>Back to home</Link>}
      </section>
    );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === 'answering') send({ type: 'answer', phase, text: draft });
    if (phase === 'response')
      send(
        choice === 'challenge'
          ? { type: 'challenge', phase, text: draft }
          : { type: 'support', phase }
      );
  }

  return (
    <section className='card'>
      <div className='phase'>
        <span className='tag'>
          {phase === 'buffer'
            ? 'Get ready'
            : phase === 'response'
              ? 'Support or challenge'
              : phase === 'voting'
                ? 'Final vote'
                : answering
                  ? 'Your turn'
                  : `${name(view.answeringId!)}’s turn`}
        </span>
        {view.deadline && <Timer deadline={view.deadline} offset={offset} />}
      </div>
      <h1>{banner ? `${name(view.answeringId!)}’s turn` : view.prompt}</h1>
      {view.modifier && (
        <aside>
          <small>Private Modifier</small>
          <strong>{view.modifier.name}</strong>
          <p>{view.modifier.rule}</p>
        </aside>
      )}
      {phase === 'answering' && !answering && (
        <p>Waiting for {name(view.answeringId!)} to answer.</p>
      )}
      {phase === 'buffer' && (
        <p>The original answer will appear when the countdown ends.</p>
      )}
      {phase === 'response' && <blockquote>{view.entries[0]?.text}</blockquote>}
      {((phase === 'answering' && answering) ||
        (phase === 'response' && !answering)) && (
        <form onSubmit={submit}>
          {phase === 'response' && (
            <fieldset>
              <legend>Your response</legend>
              <label>
                <input
                  type='radio'
                  checked={choice === 'support'}
                  onChange={() => setChoice('support')}
                />{' '}
                Support
              </label>
              <label>
                <input
                  type='radio'
                  checked={choice === 'challenge'}
                  onChange={() => setChoice('challenge')}
                />{' '}
                Challenge
              </label>
            </fieldset>
          )}
          {(phase === 'answering' || choice === 'challenge') && (
            <label>
              {phase === 'answering' ? 'Your answer' : 'Challenge answer'}
              <textarea
                required
                maxLength={160}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
          )}
          <button disabled={!online}>
            {phase === 'answering' ? 'Submit answer' : 'Submit response'}
          </button>
          {view.accepted && (
            <p role='status'>
              Last accepted:{' '}
              {view.accepted.type === 'support'
                ? 'Support'
                : 'text' in view.accepted
                  ? view.accepted.text
                  : ''}
            </p>
          )}
        </form>
      )}
      {phase === 'voting' && (
        <>
          <p>
            {view.vote
              ? 'Keep your vote or move it to another answer.'
              : 'Supporters are casting their final votes.'}
          </p>
          <ul className='rows'>
            {view.entries.map((entry) => (
              <li key={entry.id}>
                <span>
                  <strong>{entry.text}</strong>
                  <small>
                    {entry.authorId === view.answeringId
                      ? 'Original answer'
                      : name(entry.authorId)}
                  </small>
                </span>
                {view.vote && (
                  <button
                    className='outline'
                    disabled={!online || view.vote === entry.id}
                    aria-label={`Vote for ${entry.text}`}
                    onClick={() =>
                      send({ type: 'vote', phase, answerId: entry.id })
                    }
                  >
                    {view.vote === entry.id ? 'Your vote' : 'Vote'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <main>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/how-to-play' element={<HowToPlay />} />
          <Route path='/room/:code' element={<Room />} />
          <Route path='*' element={<Link to='/'>Back to home</Link>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
