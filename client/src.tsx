import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent
} from 'react';
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useParams
} from 'react-router';
import {
  maximumPlayers,
  minimumPlayers,
  pointOptions,
  roundOptions
} from '../shared/match-options';
import type {
  Action,
  Credential,
  MatchFormat,
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
          Public Opinion<span>.</span>
        </h1>
        <p>Give your best answer. See who agrees.</p>
      </section>
      <section>
        <div className='home-actions'>
          <button
            className='home-action'
            aria-pressed={mode === 'create'}
            onClick={() => {
              setMode('create');
              setError('');
            }}
          >
            <span className='action-icon action-create' aria-hidden='true'>
              <span className='action-plus'>+</span>
            </span>
            <span className='action-label'>Create Game</span>
          </button>
          <button
            className='home-action'
            aria-pressed={mode === 'join'}
            onClick={() => {
              setMode('join');
              setError('');
            }}
          >
            <span className='action-icon action-join' aria-hidden='true'>
              →
            </span>
            <span className='action-label'>Join Game</span>
          </button>
          <Link className='home-action' to='/how-to-play'>
            <span className='action-icon action-help' aria-hidden='true'>
              ?
            </span>
            <span className='action-label'>How to Play</span>
          </Link>
        </div>
        {mode && (
          <form className='card' key={mode} onSubmit={submit}>
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
        {error && (
          <p className='card' role='alert'>
            {error}
          </p>
        )}
      </section>
    </>
  );
}

function HowToPlay() {
  return (
    <section className='card'>
      <h1>How to Play</h1>
      <ul>
        <li>
          Gather 4–12 players, choose "Create Game", and share your room code
          with your friends.
        </li>
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
          differently. Sometimes you're rewarded for getting the most
          supporters, other times you're rewarded for being divisive.
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
      <h3 className='horizontal-center heavier-text'>
        The modifier can change any rule for the current turn. What it says
        goes, so pay attention.
      </h3>
      <Link to='/'>Back to home</Link>
    </section>
  );
}

function RoomCode({ code }: { code: string }) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
    'idle'
  );

  async function copy() {
    setCopyStatus('idle');
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <div className='room-code' data-copy-status={copyStatus}>
      <span>
        Room code <strong>{code}</strong>
      </span>
      <button
        type='button'
        className='outline copy-code'
        aria-label='Copy room code'
        onClick={copy}
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
      <small role='status'>
        {copyStatus === 'copied' && 'Room code copied.'}
        {copyStatus === 'failed' &&
          'Could not copy. Select the room code to copy it manually.'}
      </small>
    </div>
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
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(
      JSON.stringify(
        action.type === 'start' ? action : { ...action, turnId: view?.turnId }
      )
    );
    return true;
  }

  return (
    <>
      <header className='top'>
        <Link to='/'>Public Opinion</Link>
        <RoomCode key={code} code={code} />
      </header>
      {error && (
        <p role='alert' className='card'>
          {error}
        </p>
      )}
      {!online && !error && <p role='status'>Connecting to room…</p>}
      {view && (
        <Turn
          key={`${view.turnId ?? 'room'}:${view.phase}`}
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

function MatchSetup({
  startHint,
  start
}: {
  startHint: string;
  start: (format: MatchFormat) => void;
}) {
  const hintId = useId();
  const [format, setFormat] = useState<MatchFormat>({
    type: 'rounds',
    rounds: 5
  });
  return (
    <form
      className='match-setup'
      onSubmit={(event) => {
        event.preventDefault();
        if (!startHint) start(format);
      }}
    >
      <label>
        Game type
        <select
          value={format.type}
          onChange={(event) =>
            setFormat(
              event.target.value === 'rounds'
                ? { type: 'rounds', rounds: 5 }
                : { type: 'points', target: 50 }
            )
          }
        >
          <option value='rounds'>Rounds</option>
          <option value='points'>Point total</option>
        </select>
      </label>
      {format.type === 'rounds' ? (
        <label>
          Rounds per player
          <select
            value={format.rounds}
            onChange={(event) => {
              const rounds = roundOptions.find(
                (option) => String(option) === event.target.value
              );
              if (rounds) setFormat({ type: 'rounds', rounds });
            }}
          >
            {roundOptions.map((rounds) => (
              <option key={rounds}>{rounds}</option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Point target
          <select
            value={format.target}
            onChange={(event) => {
              const target = pointOptions.find(
                (option) => String(option) === event.target.value
              );
              if (target) setFormat({ type: 'points', target });
            }}
          >
            {pointOptions.map((points) => (
              <option key={points}>{points}</option>
            ))}
          </select>
        </label>
      )}
      <button
        className='start-game'
        disabled={Boolean(startHint)}
        aria-describedby={startHint ? hintId : undefined}
      >
        Start game
      </button>
      <small id={hintId} className='start-hint' role='status'>
        {startHint}
      </small>
    </form>
  );
}

function Turn({
  view,
  send,
  online,
  offset
}: {
  view: RoomView;
  send: (action: Action) => boolean;
  online: boolean;
  offset: number;
}) {
  const { players, phase, you, result, match } = view;
  const [draft, setDraft] = useState('');
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

  const format = match?.format;
  const progress =
    match &&
    format &&
    (format.type === 'rounds'
      ? `Round ${Math.ceil(match.turnNumber / players.length)} of ${format.rounds} · Turn ${match.turnNumber}`
      : `First to ${format.target} points · Turn ${match.turnNumber}`);
  const outcome = match?.outcome;
  const contenders = outcome?.playerIds.map(name).join(', ');
  const finish =
    outcome?.type === 'winner'
      ? `${contenders} wins!`
      : outcome?.type === 'shared-tie'
        ? `Shared tie among ${contenders}.`
        : outcome?.type === 'tiebreaker'
          ? `Tiebreaker required for ${contenders}. Tiebreaker play is unavailable in this build.`
          : undefined;

  if (phase === 'lobby') {
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
        <h1>Waiting room</h1>
        <div className='waiting-room-details'>
          <p>Copy and share the room code to add more players.</p>
          <p role='status'>
            Players needed: <strong>{playersNeeded}</strong>
          </p>
        </div>
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
              {player.id === you && <span className='you'>You</span>}
            </li>
          ))}
        </ul>
        {view.hostId === you && (
          <MatchSetup
            startHint={startHint}
            start={(format) => send({ type: 'start', phase, format })}
          />
        )}
      </section>
    );
  }

  if (result) {
    const scores = match?.scores ?? result.awards;
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
        {progress && <p className='tag'>{progress}</p>}
        {phase === 'complete' && finish && <p role='status'>{finish}</p>}
        {phase === 'complete' && result.missed && <p>No answer submitted.</p>}
        {result.modifier && (
          <aside>
            <p className='horizontal-center'>
              <strong>{result.modifier.name}</strong>
            </p>
            <p>{result.modifier.rule}</p>
          </aside>
        )}
        <h2>Standings</h2>
        <ul className='rows'>
          {[...players]
            .sort((a, b) => scores[b.id] - scores[a.id])
            .map((player) => (
              <li
                key={player.id}
                className={player.id === you ? 'your-row' : undefined}
              >
                <span>{row(player.id)}</span>
                <span className='score'>
                  <strong>{scores[player.id]} pts</strong>
                  {match && (
                    <small>
                      {result.awards[player.id] > 0 ? '+' : ''}
                      {result.awards[player.id]} this turn
                    </small>
                  )}
                </span>
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
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online) return;
    const text = draft.trim();
    if (phase === 'answering' && text) {
      if (send({ type: 'answer', phase, text })) setDraft('');
    } else if (phase === 'response') {
      if (choice === 'support') {
        if (send({ type: 'support', phase })) setDraft('');
      } else if (text && send({ type: 'challenge', phase, text })) {
        setDraft('');
      }
    }
  }

  return (
    <section className='card'>
      {progress && <p className='tag'>{progress}</p>}
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
            <fieldset
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.nativeEvent.isComposing &&
                  event.target instanceof HTMLInputElement
                ) {
                  event.preventDefault();
                  event.target.form?.requestSubmit();
                }
              }}
            >
              <legend>Your response</legend>
              <label>
                <input
                  type='radio'
                  name='response'
                  checked={choice === 'support'}
                  onChange={() => setChoice('support')}
                />{' '}
                Support
              </label>
              <label>
                <input
                  type='radio'
                  name='response'
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
              <input
                type='text'
                enterKeyHint='send'
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
          <ul className='rows vote-rows'>
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
                    aria-pressed={view.vote === entry.id}
                    onClick={() =>
                      send({ type: 'vote', phase, answerId: entry.id })
                    }
                  >
                    {view.vote === entry.id ? (
                      <span aria-hidden='true'>✓</span>
                    ) : (
                      'Vote'
                    )}
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
