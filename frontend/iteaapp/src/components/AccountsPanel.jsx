import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8080';

/* ---- Icons for providers ---- */
const YandexIcon1 = () => (
  <div style={{ width: 48, height: 48, borderRadius: 12 }}>
    <img width="48" height="48" src="/public/images/YandexDisk.png" />
  </div>
);

const NextCloudIcon1 = () => (
  <div style={{ width: 48, height: 48, borderRadius: 12 }}>
    <img width="48" height="48" src="/public/images/cloud.png" />
  </div>
);

const YandexDiskCardIcon = () => (
  <img width="22" height="22" src="public/images/YandexDisk.png" />
);

const NextCloudCardIcon = () => (
  <img width="22" height="22" src="/public/images/cloud.png" />
);

const providerIcon = (provider) => {
  if (provider === 'yandex') return <YandexDiskCardIcon />;
  return <NextCloudCardIcon />;
};

const availableProviders = [
  { id: 'yandex1', name: 'Яндекс.Диск', icon: <YandexIcon1 /> },
  { id: 'nextcloud1', name: 'NextCloud', icon: <NextCloudIcon1 /> },
];

function AccountsPanel() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // GET /api/accounts — загружаем список аккаунтов с бэкенда
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
      })
      .catch(err => {
        console.error('[API] Не удалось получить аккаунты:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // DELETE /api/accounts/{id}
  const handleRemove = (id) => {
    fetch(`${API_BASE}/api/accounts/${id}`, { method: 'DELETE' })
      .then(() => fetchAccounts())
      .catch(err => console.error('[API] Ошибка удаления:', err));
  };

  return (
    <div className="accPanel_container">
      <h1 className="accPanel_title">Управление Облачными Аккаунтами</h1>

      {/* Loading / Error states */}
      {loading && <p style={{ color: 'var(--text-secondary)' }}>Загрузка аккаунтов...</p>}
      {error && (
        <div style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          ⚠️ Не удалось подключиться к бэкенду: {error}
        </div>
      )}

      {/* Connected Accounts */}
      {!loading && accounts.length === 0 && !error && (
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Нет подключённых аккаунтов.</p>
      )}

      <div className="accPanel_cardsRow">
        {accounts.map((acc) => (
          <div className="accPanel_card" key={acc.id}>
            <div className="accPanel_cardHeader">
              <span className="accPanel_cardIcon">{providerIcon(acc.provider)}</span>
              <span className="accPanel_cardName">{acc.username}</span>
              <button
                className="accPanel_cardMenu"
                onClick={() => handleRemove(acc.id)}
                title="Удалить аккаунт"
              >
                ✕
              </button>
            </div>

            {/* Mount Path */}
            <div className="accPanel_detail">
              <span className="accPanel_detailLabel">Путь:</span>{' '}
              <span className="accPanel_detailValue">{acc.mountPath || '—'}</span>
            </div>

            {/* Status */}
            <div className="accPanel_detail">
              <span className="accPanel_detailLabel">Статус:</span>{' '}
              <span className={`accPanel_detailValue ${acc.connected ? 'accPanel_statusOk' : 'accPanel_statusErr'}`}>
                {acc.connected ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="accPanel_detail">
              <span className="accPanel_detailLabel">Провайдер:</span>{' '}
              <span className="accPanel_detailValue">{acc.provider}</span>
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
            <button className="accPanel_providerBtn">Подключить</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AccountsPanel;
