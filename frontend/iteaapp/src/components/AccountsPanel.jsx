import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8080';

const inputStyle = {
  background: 'var(--hover-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  padding: '10px 14px',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const YandexIcon1 = () => (
  <div style={{ width: 48, height: 48, borderRadius: 12 }}>
    <img width="48" height="48" src="images/YandexDisk.png" alt="Yandex" />
  </div>
);

const YandexDiskCardIcon = () => <img width="22" height="22" src="images/YandexDisk.png" alt="Yandex" />;

const providerIcon = (provider) =>
  provider === 'yandex' ? <YandexDiskCardIcon /> : null;

const availableProviders = [
  { id: 'yandex', name: 'Яндекс.Диск', icon: <YandexIcon1 /> }
];

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';

  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

const getYandexQuota = (account) => {
  const totalSpace = Number(account.totalSpace);
  const usedSpace = Number(account.usedSpace);

  if (!Number.isFinite(totalSpace) || !Number.isFinite(usedSpace) || totalSpace <= 0 || usedSpace < 0) {
    return null;
  }

  const usedPercent = Math.min((usedSpace / totalSpace) * 100, 100);

  return { totalSpace, usedSpace, usedPercent };
};

function AccountsPanel({ onAccountSelect }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [connectingProvider, setConnectingProvider] = useState(null);
  const [yandexStep, setYandexStep] = useState('open_browser');
  const [yandexAuthUrl, setYandexAuthUrl] = useState('');
  const [codeInput, setCodeInput] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);

  const selectAccount = (id) => {
    setSelectedId(id);
    localStorage.setItem('selectedAccountId', id);
    if (onAccountSelect) onAccountSelect(id);
  };

  // Выбирает новый аккаунт по ID или восстанавливает последний выбранный из localStorage.
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
          const savedId = localStorage.getItem('selectedAccountId');
          const savedAccount = data.find(a => String(a.id) === String(savedId));
          if (savedAccount) {
            selectAccount(savedAccount.id);
          } else {
            selectAccount(data[0].id);
          }
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
    setConnectError(null);
    setConnecting(false);
  };

  const handleRemove = (id) => {
    const wasSelected = id === selectedId;
    fetch(`${API_BASE}/api/accounts/${id}`, { method: 'DELETE' })
      .then(() => {
        if (wasSelected) {
          setSelectedId(null);
          localStorage.removeItem('selectedAccountId');
        }
        fetchAccounts(null);
      })
      .catch(err => console.error('[API] Ошибка удаления:', err));
  };

  // Инициализация OAuth-авторизации Яндекс.Диска
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

  // Обмен кода авторизации OAuth на токен
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

            {acc.provider === 'yandex' && (() => {
              const quota = getYandexQuota(acc);
              if (!quota) return null;

              const isHighUsage = quota.usedPercent > 90;
              return (
                <div className="accPanel_storageInfo">
                  <span className={`accPanel_storageText${isHighUsage ? ' accPanel_storageText--warn' : ''}`}>
                    Яндекс.Диск: занято {formatBytes(quota.usedSpace)} из {formatBytes(quota.totalSpace)}
                  </span>
                  <div className="accPanel_progressBar">
                    <div
                      className={`accPanel_progressFill${isHighUsage ? ' accPanel_progressFill--warn' : ''}`}
                      style={{ width: `${quota.usedPercent}%` }}
                    />
                  </div>
                </div>
              );
            })()}
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

      {/* Modal */}
      {connectingProvider && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 12, padding: 24, width: 440,
            display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18, fontWeight: 600 }}>
              Подключить Яндекс.Диск
            </h2>

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
                    padding: '11px 18px', background: 'var(--accent-color)', border: 'none',
                    borderRadius: 8, color: '#fff', cursor: 'pointer',
                    fontWeight: 600, fontSize: 14, opacity: connecting ? 0.6 : 1,
                    transition: 'filter 0.2s, opacity 0.2s',
                  }}
                  onMouseEnter={(e) => { (!connecting) && (e.target.style.filter = 'brightness(1.1)'); }}
                  onMouseLeave={(e) => { e.target.style.filter = 'none'; }}
                >
                  {connecting ? 'Загрузка...' : 'Открыть страницу Яндекса'}
                </button>
              </>
            )}

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
                  className="accPanel_actionBtn"
                  style={{ alignSelf: 'flex-start', fontSize: 13, padding: '7px 14px' }}
                >
                  Открыть страницу снова
                </button>
              </>
            )}



            {connectError && (
              <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>⚠️ {connectError}</p>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={closeModal}
                className="accPanel_actionBtn"
                style={{ padding: '9px 18px', fontSize: 13 }}
              >
                Отмена
              </button>

              {connectingProvider === 'yandex' && yandexStep === 'enter_code' && (
                <button
                  onClick={handleYandexExchange}
                  disabled={connecting || !codeInput.trim()}
                  style={{
                    padding: '9px 18px', background: 'var(--accent-color)', border: 'none',
                    borderRadius: 8, color: '#fff', cursor: 'pointer',
                    opacity: (connecting || !codeInput.trim()) ? 0.5 : 1,
                    fontWeight: 500, fontSize: 13,
                    transition: 'filter 0.2s, opacity 0.2s',
                  }}
                  onMouseEnter={(e) => { (!(connecting || !codeInput.trim())) && (e.target.style.filter = 'brightness(1.1)'); }}
                  onMouseLeave={(e) => { e.target.style.filter = 'none'; }}
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
