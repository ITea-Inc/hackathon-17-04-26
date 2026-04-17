import React from 'react';
import FileItem from './FileItem';

const FileExplorer = ({ items, onSyncChange, onFolderClick, accountId }) => {
  return (
    <div className="explorer-container">
      <div className="explorer-header">
        <div className="header-name">Name</div>
        <div className="header-type">Type</div>
        <div className="header-size">Size</div>
        <div className="header-modified">Modified</div>
        <div className="header-sync">Sync</div>
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
