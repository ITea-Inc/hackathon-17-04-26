import React from 'react';

const FileItem = ({ name, directory, size, lastModified, syncRule = 'NONE', onSyncChange, onFolderClick, syncInfo }) => {
  const isFolder = directory === true;
  const formattedDate = lastModified ? lastModified.replace("T", " ").replace("Z", " ") : "";

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    if (!bytes) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleRowDoubleClick = () => {
    if (isFolder && onFolderClick) onFolderClick(name);
  };

  const handleSyncChangeInternal = (e) => {
    e.stopPropagation();
    onSyncChange(name, e.target.value);
  };

  return (
    <div className={`file-item${syncInfo ? ' file-item--syncing' : ''}`} onDoubleClick={handleRowDoubleClick}>
      <div className="file-name-container">
        <div className="file-icon">
          {isFolder ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M10 4H4C2.895 4 2 4.895 2 6V18C2 19.105 2.895 20 4 20H20C21.105 20 22 19.105 22 18V8C22 6.895 21.105 6 20 6H12L10 4Z" fill="#e8a33d" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M13 2H6C4.895 2 4 2.895 4 4V20C4 21.105 4.895 22 6 22H18C19.105 22 20 21.105 20 20V9L13 2Z" fill="#78aeed" />
              <path d="M13 2V9H20" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
            </svg>
          )}
        </div>
        <div className="file-name-wrap">
          <div className="file-name">{name}</div>
          {syncInfo && (
            <div className="file-sync-bar">
              <div className="file-sync-bar__fill" style={{ width: `${syncInfo.percent}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="file-size">{isFolder ? '--' : formatSize(size)}</div>
      <div className="file-modified">{formattedDate}</div>
      <div className="file-sync" onDoubleClick={(e) => e.stopPropagation()}>
        {syncInfo ? (
          <div className="file-sync-badge">
            <span className="file-sync-spinner" />
            <span>{syncInfo.percent}%</span>
          </div>
        ) : (
          <select
            className={`sync-select ${syncRule}`}
            value={syncRule}
            onChange={handleSyncChangeInternal}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="NONE">Не задано</option>
            <option value="ALWAYS">Всегда</option>
            <option value="ON_DEMAND">По запросу</option>
            <option value="MANUAL">Вручную</option>
            <option value="SCHEDULED">По расписанию</option>
          </select>
        )}
      </div>
    </div>
  );
};

export default FileItem;
