import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import type { Credential } from '../../../shared/protocol';
import { readSeatToken, seatKey } from '../../seat-storage';
import './style.css';

export function Home() {
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
        message:
          failure instanceof Error ? failure.message : 'Unable to connect.'
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
                    onChange={() => {
                      if (error?.field === 'name') setError(undefined);
                    }}
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
                  aria-describedby={
                    error?.field === 'name' ? joinErrorId : undefined
                  }
                  onChange={() => {
                    if (error?.field === 'name') setError(undefined);
                  }}
                />
              </label>
              {error?.field === 'name' && (
                <small id={joinErrorId} role='alert'>
                  {error.message}
                </small>
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
              src={new URL('../../assets/win95-joystick.png', import.meta.url).href}
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
              src={new URL('../../assets/win95-network.png', import.meta.url).href}
              alt=''
            />
            <span className='action-label'>Join Game</span>
          </button>
          <Link className='home-action' to='/how-to-play'>
            <img
              className='action-icon'
              src={new URL('../../assets/win95-helpbook.png', import.meta.url).href}
              alt=''
            />
            <span className='action-label'>How to Play</span>
          </Link>
        </div>
      </section>
    </>
  );
}
