import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL
  || (typeof window !== 'undefined' ? `http://${window.location.hostname}:4000` : 'http://localhost:4000');

let socket: Socket | null = null;
let listenersAttached = false;

export const getSocket = (token: string): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token },
    });
  }
  return socket;
};

export const connectSocket = (token: string) => {
  const s = getSocket(token);
  s.auth = { token };

  if (!listenersAttached) {
    listenersAttached = true;
    s.on('connect', () => {
      console.log('🔌 Socket connected:', s.id);
      s.emit('join_chats');
    });
    s.on('connect_error', (err) => {
      console.error('Socket auth error:', err.message);
    });
  }

  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    listenersAttached = false;
  }
};
