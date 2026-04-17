import React from 'react';

const FileItem = ({ name, directory, size, lastModified, syncRule = 'always', onSyncChange, onFolderClick }) => {
  const isFolder = directory === true;
  lastModified = lastModified.replace("T", " ").replace("Z", " ");
  const handleRowDoubleClick = () => {
    if (isFolder && onFolderClick) {
      onFolderClick(name);
    }
  };

  const toggleSync = (e) => {
    e.stopPropagation();
    let newRule = 'always';
    if (syncRule === 'always') newRule = 'timing';
    else if (syncRule === 'timing') newRule = 'never';

    onSyncChange(name, newRule);
  };

  const getSyncTitle = () => {
    if (syncRule === 'always') return 'Всегда';
    if (syncRule === 'timing') return 'Тайминг';
    return 'Никогда';
  };

  return (
    <div className="file-item" onDoubleClick={handleRowDoubleClick}>
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
        <div className="file-name">{name}</div>
      </div>

      <div className="file-size">{isFolder ? '--' : Math.trunc(size / 1024) + 'Kb'}</div>
      < div className="file-modified">{lastModified}</div>
      <div className="file-sync" onDoubleClick={(e) => e.stopPropagation()}>
        <button className={`sync-btn ${syncRule}`} onClick={toggleSync}>
          {getSyncTitle()}
        </button>
      </div>
    </div>
  );
};

export default FileItem;
