import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent
} from 'react';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
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
  Persona,
  RoomView,
  ServerMessage
} from '../shared/protocol';
import { personaSubtitles } from './persona-subtitles';
import { WaitingHints } from './waiting-hints';
import './style.css';

const seatKey = (code: string) => `popular-opinion:${code}`;
const quote = (text?: string) => (text === undefined ? undefined : `“${text}”`);

function readSeatToken(code: string) {
  const key = seatKey(code);
  const legacyKey = `public-opinion:${code}`;
  const token = localStorage.getItem(key) ?? localStorage.getItem(legacyKey);
  if (token && localStorage.getItem(legacyKey)) {
    localStorage.setItem(key, token);
    localStorage.removeItem(legacyKey);
  }
  return token;
}

function Home() {
  const navigate = useNavigate();
  const { state, key } = useLocation();
  const [dismissedToast, setDismissedToast] = useState<string>();
  const showGameEndedToast =
    state?.gameEnded === true && dismissedToast !== key;
  const [mode, setMode] = useState<'create' | 'join'>();
  const [error, setError] = useState<{ message: string; field?: 'name' }>();
  const joinErrorId = useId();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!showGameEndedToast) return;
    const timeout = setTimeout(() => setDismissedToast(key), 3000);
    return () => clearTimeout(timeout);
  }, [key, showGameEndedToast]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const code = String(data.get('code') ?? '')
      .trim()
      .toUpperCase();
    setError(undefined);
    setBusy(true);
    try {
      if (mode === 'join' && readSeatToken(code)) {
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
      if (!res.ok && body.field === 'name') {
        setError({ message: body.error, field: 'name' });
        form.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
        return;
      }
      if (!res.ok) throw new Error(body.error);
      const credential: Credential = body;
      localStorage.setItem(seatKey(credential.code), credential.token);
      navigate(`/room/${credential.code}`);
    } catch (failure) {
      setError({
        message: failure instanceof Error ? failure.message : 'Unable to connect.'
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {showGameEndedToast && (
        <p className='home-toast' role='status'>
          The game was ended by the host.
        </p>
      )}
      <section className='hero'>
        <span className='tag'>A party game for 4–12 players</span>
        <h1>
          Popular Opinion<span>.</span>
        </h1>
        <p className='hero-tagline'>
          Share your{' '}
          <span className='tagline-correction' aria-hidden='true'>
            honest<span className='tagline-ink'>best</span>
          </span>
          <span className='tagline-reading'>best</span> answer. See who agrees.
        </p>
      </section>
      <section>
        <div className='home-form-slot'>
          {mode && (
            <form className='card home-setup-form' key={mode} onSubmit={submit}>
              {mode === 'join' && (
                <label>
                  Room code
                  <input
                    name='code'
                    autoFocus
                    required
                    maxLength={8}
                    autoCapitalize='characters'
                    onChange={() => { if (error?.field === 'name') setError(undefined); }}
                  />
                </label>
              )}
              <label>
                Screen name
                <input
                  name='name'
                  autoFocus={mode === 'create'}
                  required
                  maxLength={24}
                  autoComplete='nickname'
                  aria-invalid={error?.field === 'name' || undefined}
                  aria-describedby={error?.field === 'name' ? joinErrorId : undefined}
                  onChange={() => { if (error?.field === 'name') setError(undefined); }}
                />
              </label>
              {error?.field === 'name' && (
                <small id={joinErrorId} role='alert'>{error.message}</small>
              )}
              <button disabled={busy}>
                {mode === 'create' ? 'Create room' : 'Join room'}
              </button>
            </form>
          )}
          {error && !error.field && (
            <p className='card' role='alert'>
              {error.message}
            </p>
          )}
        </div>
        <div className='home-actions'>
          <button
            className='home-action'
            aria-pressed={mode === 'create'}
            onClick={() => {
              setMode((current) =>
                current === 'create' ? undefined : 'create'
              );
              setError(undefined);
            }}
          >
            <img
              className='action-icon'
              src={new URL('./assets/win95-joystick.png', import.meta.url).href}
              alt=''
            />
            <span className='action-label'>Create Game</span>
          </button>
          <button
            className='home-action'
            aria-pressed={mode === 'join'}
            onClick={() => {
              setMode((current) => (current === 'join' ? undefined : 'join'));
              setError(undefined);
            }}
          >
            <img
              className='action-icon'
              src={new URL('./assets/win95-network.png', import.meta.url).href}
              alt=''
            />
            <span className='action-label'>Join Game</span>
          </button>
          <Link className='home-action' to='/how-to-play'>
            <img
              className='action-icon'
              src={new URL('./assets/win95-helpbook.png', import.meta.url).href}
              alt=''
            />
            <span className='action-label'>How to Play</span>
          </Link>
        </div>
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
          If the initial answer gets <strong>no supporters</strong>, the round
          ends and no one scores any points.
        </li>
      </ul>
      <hr className='horizontal-center narrow-line'></hr>
      <h3 className='horizontal-center heavier-text'>
        But remember, the persona can change any rule. What it says goes, so pay
        attention.
      </h3>
      <Link to='/'>Back to home</Link>
    </section>
  );
}

function RoomCode({
  code,
  showShareHint = false
}: {
  code: string;
  showShareHint?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
    'idle'
  );

  async function copy(button: HTMLButtonElement) {
    setCopyStatus('idle');
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('copied');
      return;
    } catch {
      // Try the selection-based copy on insecure origins or when clipboard access is denied.
    }

    if (!button.isConnected) return;
    const field = document.createElement('textarea');
    field.value = code;
    field.readOnly = true;
    field.className = 'clipboard-fallback';
    (button.closest('dialog') ?? document.body).append(field);
    try {
      field.focus({ preventScroll: true });
      field.select();
      field.setSelectionRange(0, code.length);
      setCopyStatus(document.execCommand('copy') ? 'copied' : 'failed');
    } catch {
      setCopyStatus('failed');
    } finally {
      field.remove();
      button.focus({ preventScroll: true });
    }
  }

  return (
    <div className='room-code' data-copy-status={copyStatus}>
      <span>
        <span className='room-code-label'>Room code:</span>{' '}
        <strong>{code}</strong>
      </span>
      <button
        type='button'
        className='outline copy-code'
        aria-label='Copy room code'
        onClick={(event) => void copy(event.currentTarget)}
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
      {showShareHint && (
        <small className='room-share-hint'>
          Share the room code to add more players.
        </small>
      )}
      <small role='status'>
        {copyStatus === 'copied' && 'Room code copied.'}
        {copyStatus === 'failed' &&
          'Could not copy. Select the room code to copy it manually.'}
      </small>
    </div>
  );
}

function RoomMenu({
  code,
  error,
  endGame,
  leaveGame,
  online
}: {
  code: string;
  error: string;
  endGame?: () => void;
  leaveGame: () => void;
  online: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogId = useId();

  return (
    <>
      <button
        type='button'
        className='room-menu-toggle'
        aria-label='Open room menu'
        aria-haspopup='dialog'
        aria-controls={dialogId}
        onClick={() => dialog.current?.showModal()}
      >
        <img
          src={new URL('./assets/win95-settings.png', import.meta.url).href}
          width='24'
          height='24'
          alt=''
        />
      </button>
      <dialog
        ref={dialog}
        id={dialogId}
        aria-label='Room menu'
        className='card room-menu room-menu-with-close'
      >
        <RoomCode code={code} />
        {error && <p role='alert'>{error}</p>}
        <form method='dialog' className='room-menu-actions'>
          {endGame ? (
            <button type='button' disabled={!online} onClick={endGame}>
              End Game
            </button>
          ) : (
            <button type='button' onClick={leaveGame}>
              Leave Game
            </button>
          )}
          <button className='room-menu-close' aria-label='Close' autoFocus>
            <img
              src={new URL('./assets/win95-x.svg', import.meta.url).href}
              alt=''
            />
          </button>
        </form>
      </dialog>
    </>
  );
}

function WinnerAnnouncement({ name }: { name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const modal = dialog.current!;
    let dismiss: ReturnType<typeof setTimeout> | undefined;
    const show = setTimeout(() => {
      modal.showModal();
      dismiss = setTimeout(() => modal.close(), 3000);
    }, 3000);
    return () => {
      clearTimeout(show);
      clearTimeout(dismiss);
      modal.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className='card room-menu winner-announcement'
      aria-labelledby={titleId}
    >
      <h1 id={titleId}>{name} wins!</h1>
    </dialog>
  );
}

function ConnectingToRoom() {
  const dialog = useRef<HTMLDialogElement>(null);
  const statusId = useId();

  useEffect(() => {
    const modal = dialog.current!;
    modal.showModal();
    return () => modal.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className='card room-loading'
      aria-labelledby={statusId}
      onCancel={(event) => event.preventDefault()}
    >
      <span className='room-loading-squares' aria-hidden='true'>
        <span />
        <span />
        <span />
        <span />
      </span>
      <p id={statusId} role='status'>
        Connecting to room…
      </p>
      <Link to='/'>Back to home</Link>
    </dialog>
  );
}

function Room() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<RoomView>();
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const offset = useRef(0);
  const endGameDialog = useRef<HTMLDialogElement>(null);
  const endGameTitle = useId();

  useEffect(() => {
    const token = readSeatToken(code);
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
        } else if ('ended' in message) {
          stopped = true;
          localStorage.removeItem(seatKey(code));
          navigate('/', { replace: true, state: { gameEnded: true } });
        } else setError(message.error);
      };
      ws.onclose = (event) => {
        if (stopped) return;
        setOnline(false);
        if (event.code === 1008) {
          localStorage.removeItem(seatKey(code));
          setError((current) => current || 'Your seat could not be restored.');
        } else {
          setError('');
          retry = setTimeout(connect, 700);
        }
      };
    }
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      socket.current?.close();
    };
  }, [code, navigate]);

  function send(action: Action) {
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(
      JSON.stringify(
        action.type === 'start' ? action : { ...action, turnId: view?.turnId }
      )
    );
    return true;
  }

  function requestEndGame() {
    endGameDialog.current?.showModal();
  }

  function endGame() {
    if (socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({ type: 'end-game', confirmed: true })
      );
      endGameDialog.current?.close();
    }
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
              offset={offset.current}
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
          offset={offset.current}
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

function HeaderTimer({
  screenKey,
  transition,
  timer,
  online,
  offset
}: {
  screenKey: string;
  transition: 'turn' | 'results' | 'duplicate';
  timer?: { deadline: number; duration?: number };
  online: boolean;
  offset: number;
}) {
  const deadline = timer?.deadline;
  const duration = timer?.duration;
  const [current, setCurrent] = useState({ screenKey, deadline, duration });
  const [previous, setPrevious] = useState<typeof current>();
  if (current.screenKey !== screenKey) {
    setPrevious(current.deadline === undefined ? undefined : current);
    setCurrent({ screenKey, deadline, duration });
  } else if (current.deadline !== deadline || current.duration !== duration) {
    setCurrent({ screenKey, deadline, duration });
  }

  return (
    <div className='header-timer' data-transition={transition}>
      {previous?.deadline !== undefined && (
        <Timer
          key={`${previous.screenKey}:${previous.deadline}:${online}`}
          deadline={previous.deadline}
          duration={previous.duration}
          offset={offset}
          leaving
        />
      )}
      {deadline !== undefined && (
        <Timer
          key={`${screenKey}:${deadline}:${online}`}
          deadline={deadline}
          duration={duration}
          offset={offset}
          enteringAfterFade={previous !== undefined}
        />
      )}
    </div>
  );
}

function Timer({
  deadline,
  duration,
  offset,
  leaving = false,
  enteringAfterFade = false
}: {
  deadline: number;
  duration?: number;
  offset: number;
  leaving?: boolean;
  enteringAfterFade?: boolean;
}) {
  if (!duration) return null;
  const seconds = duration / 1000;
  const remaining = Math.min(
    seconds,
    Math.max(0, (deadline - Date.now() - offset) / 1000)
  );
  return (
    <div
      className={leaving ? 'leaving-timer' : 'timer'}
      data-after-fade={enteringAfterFade || undefined}
      aria-hidden={leaving || undefined}
    >
      <CountdownCircleTimer
        isPlaying={remaining > 0}
        duration={seconds}
        initialRemainingTime={remaining}
        size={24}
        strokeWidth={5}
        strokeLinecap='butt'
        colors={remaining > 0 ? '#ffffff' : '#211c1b'}
        trailColor='#211c1b'
      >
        {({ remainingTime }) => (
          <span
            role='timer'
            aria-label={`${remaining > 0 ? remainingTime : 0} seconds remaining`}
          />
        )}
      </CountdownCircleTimer>
    </div>
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

function PersonaCard({ persona }: { persona: Persona }) {
  const subtitle = personaSubtitles.get(persona.name);
  return (
    <aside className='persona-card'>
      <strong className='persona-title'>{persona.name}</strong>
      {subtitle && <p className='persona-subtitle'>{subtitle}</p>}
      <hr className='horizontal-center narrow-line' />
      <p className='persona-rule'>{persona.rule}</p>
    </aside>
  );
}

const scoringLeadIn = 3300;
const scoreTransferDuration = 520;
const scoreTransferPause = 300;

function YouIcon() {
  return (
    <img
      className='you-icon'
      src={new URL('./assets/win98-person.png', import.meta.url).href}
      alt='You'
    />
  );
}

function Standings({
  players,
  you,
  scores,
  awards,
  scoringStartedAt,
  scoringDuration,
  offset
}: {
  players: RoomView['players'];
  you: string;
  scores: Record<string, number>;
  awards: Record<string, number>;
  scoringStartedAt?: number;
  scoringDuration?: number;
  offset: number;
}) {
  const [now, setNow] = useState(Date.now);
  let nextStart = scoringLeadIn;
  const rows = [...players]
    .sort((a, b) => scores[b.id] - scores[a.id])
    .map((player) => {
      const award = awards[player.id];
      const startsAt = nextStart;
      nextStart +=
        (award === 0 ? 0 : scoreTransferDuration) + scoreTransferPause;
      return { player, award, startsAt };
    });
  const animationDuration = Math.max(0, nextStart - scoreTransferPause - scoringLeadIn);
  const availableTime = Math.max(0, (scoringDuration ?? Infinity) - scoringLeadIn - 500);
  const transferTime = Math.min(animationDuration, availableTime);
  const sequenceDuration = scoringLeadIn + transferTime;

  useEffect(() => {
    if (scoringStartedAt === undefined) return;
    const endsAt = scoringStartedAt + sequenceDuration - offset;
    setNow(Date.now());
    if (Date.now() >= endsAt) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [scoringStartedAt, offset, sequenceDuration]);

  const displayElapsed =
    scoringStartedAt === undefined
      ? sequenceDuration
      : now + offset - scoringStartedAt;
  const elapsed = displayElapsed < scoringLeadIn
    ? displayElapsed
    : displayElapsed >= sequenceDuration
      ? scoringLeadIn + animationDuration
      : scoringLeadIn + (displayElapsed - scoringLeadIn) * (animationDuration / transferTime);

  return (
    <ul className='rows standings'>
      {rows.map(({ player, award, startsAt }) => {
        const progress = Math.max(
          0,
          Math.min(1, (elapsed - startsAt) / scoreTransferDuration)
        );
        const transferred =
          Math.sign(award) * Math.floor(Math.abs(award) * progress);
        const remaining = award - transferred;
        const showChange = award === 0 ? elapsed < startsAt : remaining !== 0;
        return (
          <li
            key={player.id}
            className={player.id === you ? 'your-row' : undefined}
          >
            <span>{player.name}</span>
            <span className='score'>
              {showChange && (
                <span
                  className='score-change'
                  data-direction={Math.sign(remaining)}
                >
                  {remaining >= 0 ? '+' : ''}
                  {remaining}
                </span>
              )}
              <strong>{scores[player.id] - remaining} pts</strong>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DuplicateFlag({
  entries,
  online,
  send
}: {
  entries: RoomView['entries'];
  online: boolean;
  send: (action: Action) => boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const canSubmit =
    selected.length >= 2 &&
    entries.some((entry) => selected.includes(entry.id) && !entry.disqualified);
  return (
    <>
      <button
        type='button'
        className='outline report-duplicates'
        disabled={!online}
        onClick={() => dialog.current?.showModal()}
      >
        Report Duplicates
      </button>
      <dialog
        ref={dialog}
        onClose={() => setSelected([])}
        aria-labelledby={titleId}
        className='card room-menu'
      >
        <h2 id={titleId}>Flag duplicate answers</h2>
        <p>
          Select at least two challenge answers, including one still in play.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (
              online &&
              canSubmit &&
              send({
                type: 'flag-duplicates',
                phase: 'voting',
                answerIds: selected
              })
            ) {
              dialog.current?.close();
            }
          }}
        >
          {entries.map((entry) => (
            <label key={entry.id} className='duplicate-choice'>
              <input
                type='checkbox'
                checked={selected.includes(entry.id)}
                onChange={(event) => {
                  setSelected(
                    event.currentTarget.checked
                      ? [...selected, entry.id]
                      : selected.filter((id) => id !== entry.id)
                  );
                }}
              />
              <span>
                {quote(entry.text)}
                {entry.disqualified && (
                  <small className='duplicate-label'> Duplicate</small>
                )}
              </span>
            </label>
          ))}
          <button disabled={!online || !canSubmit}>Submit flag</button>
          <button
            type='button'
            className='outline'
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
        </form>
      </dialog>
    </>
  );
}

function Turn({
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
  const { players, phase, you, result, match, accepted } = view;
  const [draft, setDraft] = useState('');
  const [choice, setChoice] = useState(
    accepted?.type === 'challenge' ? 'challenge' : 'support'
  );
  const [editingFrom, setEditingFrom] = useState<string>();
  const acceptedText = accepted && 'text' in accepted ? accepted.text : '';
  const submissionKey = JSON.stringify(accepted);
  const showSubmission = editingFrom !== submissionKey ? accepted : undefined;
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
  const outcome = match?.outcome;
  const contenders = outcome?.playerIds.map(name).join(', ');
  const winner = outcome?.type === 'winner' ? name(outcome.playerIds[0]) : undefined;
  const finish =
    outcome?.type === 'shared-tie'
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
            start={(format) => send({ type: 'start', phase, format })}
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

  if (view.previewWait) {
    return (
      <div className='round-preview'>
        <section className='card turn-transition horizontal-center'>
          <h1>{name(view.answeringId!)}’s turn.</h1>
          <p>Please wait while they review the prompt and persona.</p>
        </section>
      </div>
    );
  }

  if (
    phase === 'turn-intro' ||
    phase === 'persona-preview' ||
    phase === 'prompt-preview' ||
    (phase === 'answering' && !answering)
  ) {
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

  if (view.duplicateReview) {
    const { eligible, ballot, outcome } = view.duplicateReview;
    return (
      <section className='card duplicate-transition'>
        {progress && <p className='tag'>{progress}</p>}
        <h1>
          {outcome
            ? 'Duplicate review result'
            : 'Are these answers duplicates?'}
        </h1>
        {outcome ? (
          <p role='status'>
            {outcome.passed
              ? 'Answers deemed duplicates.'
              : 'Answers were not deemed duplicates.'}{' '}
            {outcome.yes} yes · {outcome.no} no.
          </p>
        ) : eligible ? (
          <div className='duplicate-vote-actions'>
            <button
              type='button'
              className='outline'
              aria-pressed={ballot === true}
              disabled={!online}
              onClick={() =>
                send({
                  type: 'vote-duplicates',
                  phase: 'duplicate-review',
                  yes: true
                })
              }
            >
              Yes
            </button>
            <button
              type='button'
              className='outline'
              aria-pressed={ballot === false}
              disabled={!online}
              onClick={() =>
                send({
                  type: 'vote-duplicates',
                  phase: 'duplicate-review',
                  yes: false
                })
              }
            >
              No
            </button>
          </div>
        ) : (
          <p>You’re spectating because one of your answers was flagged.</p>
        )}
        <ul className='rows vote-rows'>
          {view.entries.map((entry) => (
            <li key={entry.id}>
              <span>
                <strong>{quote(entry.text)}</strong>
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (phase === 'final-votes' && result) {
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

  if (result) {
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
        {phase === 'complete' && winner && (
          <WinnerAnnouncement name={winner} />
        )}
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online || (phase !== 'answering' && phase !== 'response')) return;
    const text = draft.trim();
    const submission: Action =
      phase === 'answering'
        ? { type: 'answer', phase, text }
        : choice === 'support'
          ? { type: 'support', phase }
          : { type: 'challenge', phase, text };
    const submittedText = 'text' in submission ? submission.text : '';
    if ('text' in submission && !submittedText) return;
    if (accepted?.type === submission.type && acceptedText === submittedText) {
      setEditingFrom(undefined);
      return;
    }
    send(submission);
  }

  return (
    <section
      className={phase === 'answering' ? 'card turn-transition' : 'card'}
    >
      <div className='phase'>
        {progress && <span className='tag'>{progress}</span>}
        <span className='tag phase-label'>
          {phase === 'response'
            ? 'Support or challenge'
            : phase === 'voting'
              ? 'Final vote'
              : 'Your turn'}
        </span>
      </div>
      <h1 className='gameplay-prompt horizontal-center'>
        {quote(view.prompt)}
      </h1>
      {view.persona && <PersonaCard persona={view.persona} />}
      {phase === 'response' && (
        <blockquote className='horizontal-center'>
          {quote(view.entries[0]?.text)}
        </blockquote>
      )}
      {showSubmission && (
        <div className='horizontal-center'>
          <div role='status'>
            {showSubmission.type === 'support' ? (
              <h2 className='submitted-support'>You Support this answer.</h2>
            ) : (
              <h2
                className={
                  showSubmission.type === 'challenge'
                    ? 'submitted-challenge'
                    : 'submitted-answer'
                }
              >
                {showSubmission.type === 'challenge' && 'Your Challenge: '}
                {quote(acceptedText)}
              </h2>
            )}
          </div>
          <button
            type='button'
            className='change-response'
            onClick={() => {
              if (
                showSubmission.type === 'support' ||
                showSubmission.type === 'challenge'
              ) {
                setChoice(showSubmission.type);
              }
              setDraft(acceptedText);
              setEditingFrom(submissionKey);
            }}
          >
            Change your mind?
          </button>
        </div>
      )}
      {!showSubmission &&
        ((phase === 'answering' && answering) ||
          (phase === 'response' && !answering)) && (
          <form onSubmit={submit}>
            {phase === 'response' && (
              <fieldset
                className='response-choices'
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
                <label className='support-choice'>
                  <input
                    type='radio'
                    name='response'
                    checked={choice === 'support'}
                    onChange={() => setChoice('support')}
                  />{' '}
                  Support
                </label>
                <label className='challenge-choice'>
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
          </form>
        )}
      {phase === 'voting' && (
        <>
          <p>
            {view.vote
              ? 'Keep your vote or move it to another answer.'
              : 'Supporters are casting their final votes.'}
          </p>
          {view.voteReturned && (
            <p role='status'>
              Your vote returned to the original answer. You can move it again.
            </p>
          )}
          <ul className='rows vote-rows'>
            {view.entries.map((entry, index) => (
              <li
                key={entry.id}
                className={
                  entry.disqualified ? 'disqualified-answer' : undefined
                }
              >
                <span>
                  <strong>{quote(entry.text)}</strong>
                  {index === 0 && (
                    <small className='original-answer-label'>
                      {' '}
                      Original answer
                    </small>
                  )}
                  {entry.disqualified && (
                    <small className='duplicate-label'> Duplicate</small>
                  )}
                </span>
                {view.vote && !entry.disqualified && (
                  <button
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
          {view.canFlagDuplicates && (
            <DuplicateFlag
              entries={view.entries.slice(1)}
              online={online}
              send={send}
            />
          )}
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
