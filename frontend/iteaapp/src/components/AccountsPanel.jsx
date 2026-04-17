import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8080';

const YandexIcon1 = () => (
  <div style={{ width: 48, height: 48, borderRadius: 12 }}>
    <img width="48" height="48" src="/images/YandexDisk.png" />
  </div>
);

const NextCloudIcon1 = () => (
  <div style={{ width: 48, height: 48, borderRadius: 12 }}>
    <img width="48" height="48" src="/images/cloud.png" />
  </div>
);

const YandexDiskCardIcon = () => (
  <img width="22" height="22" src="/images/YandexDisk.png" />
);

const NextCloudCardIcon = () => (
  <img width="22" height="22" src="/images/cloud.png" />
);

const providerIcon = (provider) => {
  if (provider === 'yandex') return <YandexDiskCardIcon />;
  return <NextCloudCardIcon />;
};

const availableProviders = [
  { id: 'yandex', name: 'Яндекс.Диск', icon: <YandexIcon1 /> },
  { id: 'nextcloud', name: 'NextCloud', icon: <NextCloudIcon1 /> },
];

function AccountsPanel({ onAccountSelect }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Стейт для формы подключения токена
  const [connectingProvider, setConnectingProvider] = useState(null); // 'yandex' | 'nextcloud' | null
  const [tokenInput, setTokenInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);

  const fetchAccounts = () => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/accounts`)
      .then(res => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json();
      })
      .then(data => {
        setAccounts(data);
        setLoading(false);
        // Автовыбор первого аккаунта
        if (data.length > 0 && onAccountSelect) {
          onAccountSelect(data[0].id);
        }
      })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  
  useEffect(() => { fetchAccounts(); }, []);

  const handleRemove = (id) => {
    fetch(`${API_BASE}/api/accounts/${id}`, { method: 'DELETE' })
      .then(() => fetchAccounts())
      .catch(err => console.error('[API] Ошибка удаления:', err));
  };

  // POST /api/accounts/yandex
  const handleConnect = () => {
    if (!tokenInput.trim()) return;
    setConnecting(true);
    setConnectError(null);

    const url = connectingProvider === 'yandex'
      ? `${API_BASE}/api/accounts/yandex`
      : `${API_BASE}/api/accounts/nextcloud`;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: tokenInput.trim(),
        username: usernameInput.trim() || 'User',
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
        return res.json(); // вернёт { id, provider, username, mountPath, connected }
      })
      .then(data => {
        console.log('[API] Аккаунт подключён:', data);
        if (onAccountSelect) onAccountSelect(data.id);
        setConnectingProvider(null);
        setTokenInput('');
        setUsernameInput('');
        setConnecting(false);
        fetchAccounts();
      })
      .catch(err => {
        setConnectError(err.message);
        setConnecting(false);
      });
  };

  return (
    <div className="accPanel_container">
      <h1 className="accPanel_title">Управление Облачными Аккаунтами</h1>

      {/* Loading / Error */}
      {loading && <p style={{ color: 'var(--text-secondary)' }}>Загрузка аккаунтов...</p>}
      {error && (
        <div style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          ⚠️ Нет связи с бэкендом: {error}
        </div>
      )}
      {!loading && accounts.length === 0 && !error && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Нет подключённых аккаунтов.</p>
      )}

      {/* Connected Accounts */}
      <div className="accPanel_cardsRow">
        {accounts.map((acc) => (
          <div className="accPanel_card" key={acc.id}>
            <div className="accPanel_cardHeader">
              <span className="accPanel_cardIcon">{providerIcon(acc.provider)}</span>
              <span className="accPanel_cardName">{acc.username}</span>
              <button className="accPanel_cardMenu" onClick={() => handleRemove(acc.id)} title="Удалить">✕</button>
            </div>
            <div className="accPanel_detail">
              <span className="accPanel_detailLabel">Путь:</span>{' '}
              <span className="accPanel_detailValue">{acc.mountPath || '—'}</span>
            </div>
            <div className="accPanel_detail">
              <span className="accPanel_detailLabel">Статус:</span>{' '}
              <span className={`accPanel_detailValue ${acc.connected ? 'accPanel_statusOk' : 'accPanel_statusErr'}`}>
                {acc.connected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Available Providers */}
      <h2 className="accPanel_sectionTitle">Доступные провайдеры</h2>
      <div className="accPanel_providersRow">
        {availableProviders.map((prov) => (
          <div className="accPanel_providerCard" key={prov.id}>
            <div className="accPanel_providerIcon">{prov.icon}</div>
            <span className="accPanel_providerName">{prov.name}</span>
            <button
              className="accPanel_providerBtn"
              onClick={() => { setConnectingProvider(prov.id); setConnectError(null); }}
            >
              Подключить
            </button>
          </div>
        ))}
      </div>

      {/* ── Connect Modal ── */}
      {connectingProvider && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: 32, width: 420, display: 'flex',
            flexDirection: 'column', gap: 16,
          }}>
            <h2 style={{ margin: 0, color: '#e2d9f3', fontSize: 18 }}>
              Подключить {connectingProvider === 'yandex' ? 'Яндекс.Диск' : 'NextCloud'}
            </h2>
            <input
              placeholder="Имя пользователя"
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
            <input
              placeholder="OAuth токен"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
            {connectError && (
              <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>⚠️ {connectError}</p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setConnectingProvider(null); setTokenInput(''); setUsernameInput(''); }}
                style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#aaa', cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting || !tokenInput.trim()}
                style={{ padding: '8px 18px', background: '#6d28d9', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', opacity: connecting ? 0.6 : 1 }}
              >
                {connecting ? 'Подключение...' : 'Подключить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountsPanel;
