/**
 * EchoContext.jsx
 * Real-time WebSocket context using Laravel Echo + Reverb.
 * Provides the Echo instance to the entire app and handles
 * automatic connection/disconnection based on auth state.
 */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

// Make Pusher globally available (required by Laravel Echo)
window.Pusher = Pusher;

const EchoContext = createContext(null);

export const EchoProvider = ({ children }) => {
  const { user } = useAuth();
  const echoRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      // Disconnect when user logs out
      if (echoRef.current) {
        echoRef.current.disconnect();
        echoRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Create Echo instance connected to Laravel Reverb
    const echo = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY ?? 'trouvemoi-key-2025',
      wsHost: import.meta.env.VITE_REVERB_HOST ?? 'localhost',
      wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
      wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });

    echoRef.current = echo;

    // Subscribe to private user channel
    echo
      .private(`user.${user.id}`)
      .listen('.new-match', (data) => {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-sm w-full bg-slate-900 border border-amber-500/30 shadow-lg rounded-2xl pointer-events-auto flex gap-3 p-4`}
            >
              <div className="text-2xl">🎯</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">Nouveau match !</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Score de correspondance : <span className="text-amber-400 font-bold">{data.score}%</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {data.item_lost?.title} ↔ {data.item_found?.title}
                </p>
              </div>
            </div>
          ),
          { duration: 6000 }
        );
      })
      .listen('.match-accepted', () => {
        toast.success('💬 Match accepté ! Le chat est maintenant disponible.', { duration: 5000 });
      });

    setIsConnected(true);

    return () => {
      echo.leave(`user.${user.id}`);
      echo.disconnect();
      echoRef.current = null;
      setIsConnected(false);
    };
  }, [user]);

  return (
    <EchoContext.Provider value={{ echo: echoRef.current, isConnected }}>
      {children}
    </EchoContext.Provider>
  );
};

export const useEcho = () => useContext(EchoContext);
