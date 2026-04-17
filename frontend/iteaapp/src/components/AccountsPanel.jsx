import React from 'react';

/* ---- SVG-иконки для провайдеров ---- */

const YandexIcon1 = () => (
  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e4322b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>Я</span>
  </div>
);

const NextCloudIcon1 = () => (
  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#0e7490', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      <circle cx="7" cy="10" r="5" stroke="#fff" strokeWidth="2" fill="none" />
      <circle cx="14" cy="10" r="5" stroke="#fff" strokeWidth="2" fill="none" />
      <circle cx="21" cy="10" r="5" stroke="#fff" strokeWidth="2" fill="none" />
    </svg>
  </div>
);

/* Card-level icons */
const YandexDiskCardIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
);

const NextCloudCardIcon = () => (
  <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
    <circle cx="7" cy="8" r="5" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <circle cx="14" cy="8" r="5" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <circle cx="21" cy="8" r="5" stroke="currentColor" strokeWidth="1.8" fill="none" />
  </svg>
);

/* ---- Data ---- */
const connectedAccounts = [
  {
    id: 'yandex-disk',
    name: 'Яндекс.Диск',
    usedSpace: '1.2 TB',
    totalSpace: '2.0 TB',
    usedPercent: 60,
    path: '/Documents_and_Code/pepeVatafa',
    status: 'Online',
    statusOk: true,
    icon: <YandexDiskCardIcon />,
  },
  {
    id: 'nextcloud',
    name: 'NextCloud',
    usedSpace: '3.4 GB',
    totalSpace: '10 GB',
    usedPercent: 34,
    path: '/shneiiiineFAA',
    status: 'Online',
    statusOk: true,
    icon: <NextCloudCardIcon />,
  },
];

const availableProviders = [
  { id: 'yandex1', name: 'Яндекс.Диск', icon: <YandexIcon1 /> },
  { id: 'nextcloud1', name: 'NextCloud', icon: <NextCloudIcon1 /> },
];

function AccountsPanel() {
  return (
    <div className="accPanel_container">
      {/* Header */}
      <h1 className="accPanel_title">Управление Облачными Аккаунтами</h1>

      {/* Connected Accounts */}
      <div className="accPanel_cardsRow">
        {connectedAccounts.map((acc) => (
          <div className="accPanel_card" key={acc.id}>
            {/* Card header */}
            <div className="accPanel_cardHeader">
              <span className="accPanel_cardIcon">{acc.icon}</span>
              <span className="accPanel_cardName">{acc.name}</span>
              <button className="accPanel_cardMenu">⋮</button>
            </div>

            {/* Storage info */}
            <div className="accPanel_storageInfo">
              <span className="accPanel_storageText">
                {acc.usedSpace} / {acc.totalSpace}
              </span>
              <div className="accPanel_progressBar">
                <div
                  className={
                    'accPanel_progressFill' +
                    (acc.usedPercent > 50 ? ' accPanel_progressFill--warn' : '')
                  }
                  style={{ width: `${acc.usedPercent}%` }}
                />
              </div>
            </div>

            {/* Path */}
            <div className="accPanel_detail">
              <span className="accPanel_detailLabel">Путь:</span>{' '}
              <span className="accPanel_detailValue">{acc.path}</span>
            </div>

            {/* Status */}
            <div className="accPanel_detail">
              <span className="accPanel_detailLabel">Статус:</span>{' '}
              <span
                className={
                  'accPanel_detailValue ' +
                  (acc.statusOk ? 'accPanel_statusOk' : 'accPanel_statusErr')
                }
              >
                {acc.status}
              </span>
            </div>

            {/* Actions */}
            <div className="accPanel_cardActions">
              {/* <button className="accPanel_actionBtn">Открыть</button>
              <button className="accPanel_actionBtn">Синхронизировать</button>
              <button className="accPanel_actionBtn">Настройки</button> */}
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
