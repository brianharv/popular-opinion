import { useEffect, useRef, useState } from 'react';
import type { Action, RoomView, ServerMessage } from '../../shared/protocol';
import { readSeatToken, seatKey } from '../seat-storage';

export function useRoomConnection(code: string, onEnded: () => void) {
  const [view, setView] = useState<RoomView>();
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const offset = useRef(0);
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
          onEnded();
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
  }, [code, onEnded]);

  function send(action: Action) {
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(
      JSON.stringify(
        action.type === 'start' ? action : { ...action, turnId: view?.turnId }
      )
    );
    return true;
  }

  function endMatch() {
    if (socket.current?.readyState !== WebSocket.OPEN) return false;
    socket.current.send(JSON.stringify({ type: 'end-game', confirmed: true }));
    return true;
  }

  return { view, error, online, offset: offset.current, send, endMatch };
}
