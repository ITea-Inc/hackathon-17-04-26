import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8080';

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const YandexIcon1 = () => (
  <div style={{ width: 48, height: 48, borderRadius: 12 }}>
    <img width="48" height="48" src="/images/YandexDisk.png" alt="Yandex" />
  </div>
);
const NextCloudIcon1 = () => (
  <div style={{ width: 48, height: 48, borderRadius: 12 }}>
    <img width="48" height="48" src="/images/cloud.png" alt="NextCloud" />
  </div>
);
const YandexDiskCardIcon = () => <img width="22" height="22" src="/images/YandexDisk.png" alt="Yandex" />;
const NextCloudCardIcon = () => <img width="22" height="22" src="/images/cloud.png" alt="NextCloud" />;

const providerIcon = (provider) =>
  provider === 'yandex' ? <YandexDiskCardIcon /> : <NextCloudCardIcon />;

const availableProviders = [
  { id: 'yandex', name: 'Яндекс.Диск', icon: <YandexIcon1 /> },
  { id: 'nextcloud', name: 'NextCloud', icon: <NextCloudIcon1 /> },
];

function AccountsPanel({ onAccountSelect }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // null | 'yandex' | 'nextcloud'
  const [connectingProvider, setConnectingProvider] = useState(null);
  // Яндекс: 'open_browser' → 'enter_code'
  const [yandexStep, setYandexStep] = useState('open_browser');
  const [yandexAuthUrl, setYandexAuthUrl] = useState('');
  const [codeInput, setCodeInput] = useState('');

  // NextCloud
  const [ncServerUrl, setNcServerUrl] = useState('');
  const [ncUsername, setNcUsername] = useState('');
  const [ncPassword, setNcPassword] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);

  const selectAccount = (id) => {
    setSelectedId(id);
    if (onAccountSelect) onAccountSelect(id);
  };

  // selectId — если передан, выбираем именно его (после добавления нового аккаунта).
  // Иначе выбираем первый только если ничего не выбрано.
  const fetchAccounts = (selectId = null, retryCount = 0) => {
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
        if (data.length === 0) return;
        if (selectId && data.find(a => a.id === selectId)) {
          selectAccount(selectId);
        } else if (!selectedId) {
          selectAccount(data[0].id);
        }
      })
      .catch(err => {
        const isNetwork = err.name === 'TypeError' || err.message.includes('fetch') || err.message.includes('NetworkError');
        if (isNetwork) {
          setTimeout(() => fetchAccounts(selectId, retryCount + 1), 2000);
        } else {
          setError(err.message);
          setLoading(false);
        }
      });
  };

  useEffect(() => { fetchAccounts(null); }, []);

  const closeModal = () => {
    setConnectingProvider(null);
    setYandexStep('open_browser');
    setYandexAuthUrl('');
    setCodeInput('');
    setNcServerUrl('');
    setNcUsername('');
    setNcPassword('');
    setConnectError(null);
    setConnecting(false);
  };

  const handleRemove = (id) => {
    const wasSelected = id === selectedId;
    fetch(`${API_BASE}/api/accounts/${id}`, { method: 'DELETE' })
      .then(() => {
        if (wasSelected) setSelectedId(null);
        fetchAccounts(null);
      })
      .catch(err => console.error('[API] Ошибка удаления:', err));
  };

  // Шаг 1: получаем URL и открываем браузер
  const handleOpenYandex = () => {
    setConnecting(true);
    setConnectError(null);
    fetch(`${API_BASE}/api/auth/yandex/authorize`)
      .then(res => res.json())
      .then(data => {
        setYandexAuthUrl(data.url);
        window.open(data.url, '_blank');
        setYandexStep('enter_code');
        setConnecting(false);
      })
      .catch(err => {
        setConnectError(err.message);
        setConnecting(false);
      });
  };

  // Шаг 2: отправляем код на бэкенд
  const handleYandexExchange = () => {
    if (!codeInput.trim()) return;
    setConnecting(true);
    setConnectError(null);
    fetch(`${API_BASE}/api/auth/yandex/exchange?code=${encodeURIComponent(codeInput.trim())}`, {
      method: 'POST',
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        closeModal();
        fetchAccounts(data.id);
      })
      .catch(err => {
        setConnectError(err.message);
        setConnecting(false);
      });
  };

  // NextCloud через логин/пароль
  const handleNextCloudConnect = () => {
    if (!ncServerUrl.trim() || !ncUsername.trim() || !ncPassword.trim()) return;
    setConnecting(true);
    setConnectError(null);
    fetch(`${API_BASE}/api/accounts/nextcloud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverUrl: ncServerUrl.trim(),
        username: ncUsername.trim(),
        password: ncPassword.trim(),
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
        return res.json();
      })
      .then(data => {
        closeModal();
        fetchAccounts(data.id);
      })
      .catch(err => {
        setConnectError(err.message);
        setConnecting(false);
      });
  };

  return (
    <div className="accPanel_container">
      <h1 className="accPanel_title">Управление Облачными Аккаунтами</h1>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', marginBottom: 20 }}>
          <div className="spinner" />
          <span>Загрузка...</span>
        </div>
      )}
      {error && (
        <div style={{ color: '#b48e8e', background: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          ⚠️ Ошибка связи с бэкендом: {error}
        </div>
      )}
      {!loading && accounts.length === 0 && !error && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Нет подключённых аккаунтов.</p>
      )}

      <div className="accPanel_cardsRow">
        {accounts.map((acc) => (
          <div
            className={`accPanel_card${acc.id === selectedId ? ' accPanel_card--active' : ''}`}
            key={acc.id}
            onClick={() => selectAccount(acc.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="accPanel_cardHeader">
              <span className="accPanel_cardIcon">{providerIcon(acc.provider)}</span>
              <span className="accPanel_cardName">{acc.username}</span>
              <button
                className="accPanel_cardMenu"
                onClick={(e) => { e.stopPropagation(); handleRemove(acc.id); }}
                title="Удалить"
              >✕</button>
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

      {/* ── Modal ── */}
      {connectingProvider && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: 32, width: 440,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <h2 style={{ margin: 0, color: '#e2d9f3', fontSize: 18 }}>
              Подключить {connectingProvider === 'yandex' ? 'Яндекс.Диск' : 'NextCloud'}
            </h2>

            {/* ── Яндекс шаг 1 ── */}
            {connectingProvider === 'yandex' && yandexStep === 'open_browser' && (
              <>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                  Нажмите кнопку — откроется страница авторизации Яндекса в браузере.
                  После входа Яндекс покажет вам код — скопируйте его и вернитесь сюда.
                </p>
                <button
                  onClick={handleOpenYandex}
                  disabled={connecting}
                  style={{
                    padding: '11px 18px', background: '#fc3f1d', border: 'none',
                    borderRadius: 8, color: '#fff', cursor: 'pointer',
                    fontWeight: 600, fontSize: 14, opacity: connecting ? 0.6 : 1,
                  }}
                >
                  {connecting ? 'Загрузка...' : 'Открыть страницу Яндекса'}
                </button>
              </>
            )}

            {/* ── Яндекс шаг 2 ── */}
            {connectingProvider === 'yandex' && yandexStep === 'enter_code' && (
              <>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
                  Яндекс показал код на странице авторизации. Скопируйте его и вставьте ниже:
                </p>
                <input
                  placeholder="Код с сайта Яндекса"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleYandexExchange()}
                  autoFocus
                  style={inputStyle}
                />
                <button
                  onClick={() => window.open(yandexAuthUrl, '_blank')}
                  style={{
                    padding: '6px 14px', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                    color: '#aaa', cursor: 'pointer', fontSize: 12, alignSelf: 'flex-start',
                  }}
                >
                  Открыть страницу снова
                </button>
              </>
            )}

            {/* ── NextCloud ── */}
            {connectingProvider === 'nextcloud' && (
              <>
                <input
                  placeholder="URL сервера (https://cloud.example.com)"
                  value={ncServerUrl}
                  onChange={e => setNcServerUrl(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Имя пользователя"
                  value={ncUsername}
                  onChange={e => setNcUsername(e.target.value)}
                  style={inputStyle}
                />
                <input
                  placeholder="Пароль"
                  type="password"
                  value={ncPassword}
                  onChange={e => setNcPassword(e.target.value)}
                  style={inputStyle}
                />
              </>
            )}

            {connectError && (
              <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>⚠️ {connectError}</p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '8px 18px', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                  color: '#aaa', cursor: 'pointer',
                }}
              >
                Отмена
              </button>

              {connectingProvider === 'yandex' && yandexStep === 'enter_code' && (
                <button
                  onClick={handleYandexExchange}
                  disabled={connecting || !codeInput.trim()}
                  style={{
                    padding: '8px 18px', background: '#fc3f1d', border: 'none',
                    borderRadius: 8, color: '#fff', cursor: 'pointer',
                    opacity: (connecting || !codeInput.trim()) ? 0.5 : 1,
                  }}
                >
                  {connecting ? 'Подключение...' : 'Подключить'}
                </button>
              )}

              {connectingProvider === 'nextcloud' && (
                <button
                  onClick={handleNextCloudConnect}
                  disabled={connecting || !ncServerUrl.trim() || !ncUsername.trim() || !ncPassword.trim()}
                  style={{
                    padding: '8px 18px', background: '#6d28d9', border: 'none',
                    borderRadius: 8, color: '#fff', cursor: 'pointer',
                    opacity: (connecting || !ncServerUrl.trim() || !ncUsername.trim() || !ncPassword.trim()) ? 0.5 : 1,
                  }}
                >
                  {connecting ? 'Подключение...' : 'Подключить'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountsPanel;
