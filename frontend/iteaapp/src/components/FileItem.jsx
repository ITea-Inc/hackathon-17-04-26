import React from 'react';

const FileItem = ({ name, type, size, modified, syncRule = 'always', onSyncChange, onFolderClick }) => {
  const isFolder = type === 'folder';

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
    // else newRule = 'always';

    onSyncChange(name, newRule);
  };

  const getSyncTitle = () => {
    if (syncRule === 'always') return 'Всегда';
    if (syncRule === 'timing') return 'Тайминг';
    return 'Никогда';
  };

  return (
    <div className="file-item" onDoubleClick={handleRowDoubleClick}>
      <div className="file-name-container" style={{ display: 'flex', alignItems: 'center' }}>
        <div className="file-icon">
          {isFolder ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 4H4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V8C22 6.89543 21.1046 6 20 6H12L10 4Z" fill="#ffca28"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9L13 2Z" fill="#90caf9"/>
              <path d="M13 2V9H20" stroke="rgba(0,0,0,0.1)" strokeWidth="2"/>
            </svg>
          )}
        </div>
        <div className="file-name">{name}</div>
      </div>

      <div className="file-type">{isFolder ? 'Folder' : type.toUpperCase()}</div>
      <div className="file-size">{isFolder ? '--' : size}</div>
      <div className="file-modified">{modified}</div>
      <div className="file-sync" onDoubleClick={(e) => e.stopPropagation()}>
        <button className={`sync-btn ${syncRule}`} onClick={toggleSync}>
          {getSyncTitle()}
        </button>
      </div>
    </div>
  );
};

export default FileItem;
