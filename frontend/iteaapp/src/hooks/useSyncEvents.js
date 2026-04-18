import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function useSyncEvents() {
  const [syncingPaths, setSyncingPaths] = useState(new Map());
  const [notifications, setNotifications] = useState([]);
  const notifIdRef = useRef(0);
  const handlerRef = useRef(null);

  const addNotification = (type, event) => {
    const id = ++notifIdRef.current;
    setNotifications(prev => [...prev.slice(-3), { id, type, event }]);
  };

  // Updated every render so the STOMP callback always sees fresh state setters
  handlerRef.current = (event) => {
    const key = `${event.accountId}:${event.path}`;

    if (event.type === 'sync_progress') {
      setSyncingPaths(prev => {
        const next = new Map(prev);
        next.set(key, { percent: event.data?.percent ?? 0 });
        return next;
      });
    } else if (event.type === 'sync_done') {
      setSyncingPaths(prev => {
        const next = new Map(prev);
        for (const k of next.keys()) {
          if (k.startsWith(`${event.accountId}:`)) next.delete(k);
        }
        return next;
      });
      addNotification('done', event);
    } else if (event.type === 'sync_error') {
      setSyncingPaths(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      addNotification('error', event);
    } else if (event.type === 'file_synced') {
      setSyncingPaths(prev => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
    }
  };

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/sync', (message) => {
          try {
            handlerRef.current(JSON.parse(message.body));
          } catch (e) {
            console.error('Failed to parse sync event', e);
          }
        });
      },
    });
    client.activate();
    return () => client.deactivate();
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const getSyncInfo = useCallback((accountId, path) => {
    return syncingPaths.get(`${accountId}:${path}`) ?? null;
  }, [syncingPaths]);

  return {
    isSyncing: syncingPaths.size > 0,
    notifications,
    dismissNotification,
    getSyncInfo,
  };
}
