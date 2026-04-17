import React from 'react';
import FileItem from './FileItem';

const FileExplorer = ({ items, onSyncChange, onFolderClick, accountId, onRefresh }) => {
  console.log("items", items);
  return (
    <div className="explorer-container">
      <div className="explorer-header">
        <div className="header-name">Name</div>
        <div className="header-type">Type</div>
        <div className="header-size">Size</div>
        <div className="header-modified">Modified</div>
        <div className="header-sync" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Sync
          {onRefresh && (
            <button
              class="refresh_btn"
              onClick={onRefresh}
              title="Обновить"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'inline-flex',
                padding: 2, borderRadius: 4, transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
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
          <div style={{ padding: '1.5rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {accountId ? 'Нет файлов' : 'Выберите аккаунт в разделе «Аккаунты»'}
          </div>
        )}
        {items.map((item, index) => (
          <FileItem key={index} {...item} onSyncChange={onSyncChange} onFolderClick={onFolderClick} />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
