import React from 'react';
import FileItem from './FileItem';

const FileExplorer = ({ items, onSyncChange, onFolderClick, accountId, onRefresh, getSyncInfo, pinnedPaths, onPinToggle }) => {
  return (
    <div className="explorer-container">
      <div className="explorer-header">
        <div className="header-name">Имя</div>
        <div className="header-size">Размер</div>
        <div className="header-modified">Изменён</div>
        <div className="header-sync" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Синхр.
          {onRefresh && (
            <button className="refresh_btn" onClick={onRefresh} title="Обновить">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="explorer-list">
        {items.length === 0 && (
          <div style={{ padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: 13 }}>
            {accountId ? 'Папка пуста' : 'Подключите аккаунт в разделе «Аккаунты»'}
          </div>
        )}
        {items.map((item, index) => (
          <FileItem
            key={index}
            {...item}
            onSyncChange={onSyncChange}
            onFolderClick={onFolderClick}
            syncInfo={getSyncInfo ? getSyncInfo(accountId, item.fullPath) : null}
            isPinned={pinnedPaths ? pinnedPaths.has(item.fullPath) : false}
            onPinToggle={onPinToggle}
          />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
