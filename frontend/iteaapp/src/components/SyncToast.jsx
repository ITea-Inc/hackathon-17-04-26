import React, { useEffect } from 'react';

const SyncToast = ({ notifications, onDismiss }) => {
  useEffect(() => {
    if (!notifications.length) return;
    const timers = notifications.map(n =>
      setTimeout(() => onDismiss(n.id), n.type === 'error' ? 6000 : 4000)
    );
    return () => timers.forEach(clearTimeout);
  }, [notifications, onDismiss]);

  if (!notifications.length) return null;

  return (
    <div className="sync-toasts">
      {notifications.map(n => (
        <div key={n.id} className={`sync-toast sync-toast--${n.type}`}>
          <div className="sync-toast__icon">
            {n.type === 'done' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
          <div className="sync-toast__content">
            <div className="sync-toast__title">
              {n.type === 'done' ? 'Синхронизация завершена' : 'Ошибка синхронизации'}
            </div>
            <div className="sync-toast__path">{n.event.path}</div>
            {n.type === 'done' && n.event.data && (
              <div className="sync-toast__detail">
                {n.event.data.cached} из {n.event.data.fileCount} файлов закэшировано
              </div>
            )}
            {n.type === 'error' && n.event.data?.message && (
              <div className="sync-toast__detail">{n.event.data.message}</div>
            )}
          </div>
          <button className="sync-toast__close" onClick={() => onDismiss(n.id)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default SyncToast;
