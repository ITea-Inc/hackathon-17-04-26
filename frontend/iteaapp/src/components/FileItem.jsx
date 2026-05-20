import React, { useRef, useEffect } from 'react';

const PinIcon = ({ pinned }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
);

const FolderPinIcon = ({ pinned }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 4H4C2.895 4 2 4.895 2 6V18C2 19.105 2.895 20 4 20H20C21.105 20 22 19.105 22 18V8C22 6.895 21.105 6 20 6H12L10 4Z" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
    {pinned && (
      <polyline points="9 13 11 15 15 11" stroke="#fff" strokeWidth="2" fill="none" />
    )}
  </svg>
);

const FileItem = ({ name, directory, size, lastModified, syncRule = 'MANUAL', onSyncChange, onFolderClick, syncInfo, isPinned, onPinToggle, fullPath, isSelected, isFocused, onContextMenu }) => {
  const rowRef = useRef(null);
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

  const handleRightClick = (e) => {
    if (onContextMenu) {
      onContextMenu(e, { name, directory, size, lastModified, syncRule, fullPath });
    }
  };

  const handleSyncChangeInternal = (e) => {
    e.stopPropagation();
    onSyncChange(name, e.target.value);
  };

  const handlePinClick = (e) => {
    e.stopPropagation();
    if (onPinToggle && fullPath) onPinToggle(fullPath, !isPinned);
  };

  // Auto-scroll focused item into view
  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isFocused]);

  // Build sync display for folders
  const renderSyncColumn = () => {
    if (syncInfo) {
      if (isFolder) {
        // Folder sync: show "Кэширование папки" with items count
        const cached = syncInfo.cached || 0;
        const total = syncInfo.fileCount || syncInfo.total || 0;
        return (
          <div className="file-sync-badge">
            <span className="file-sync-spinner" />
            <span>{total > 0 ? `${cached}/${total}` : 'Папка...'}</span>
          </div>
        );
      }
      return (
        <div className="file-sync-badge">
          <span className="file-sync-spinner" />
          <span>{syncInfo.percent}%</span>
        </div>
      );
    }
    return (
      <select
        className={`sync-select ${syncRule}`}
        value={syncRule}
        onChange={handleSyncChangeInternal}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="ALWAYS">Всегда</option>
        <option value="SCHEDULED">По расписанию</option>
        <option value="MANUAL">Никогда</option>
      </select>
    );
  };

  return (
    <div
      ref={rowRef}
      className={`file-item${syncInfo ? ' file-item--syncing' : ''}${isSelected ? ' file-item--selected' : ''}${isFocused ? ' file-item--focused' : ''}`}
      onDoubleClick={handleRowDoubleClick}
      onContextMenu={handleRightClick}
    >
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
          {syncInfo && !isFolder && (
            <div className="file-sync-bar">
              <div className="file-sync-bar__fill" style={{ width: `${syncInfo.percent}%` }} />
            </div>
          )}
          {syncInfo && isFolder && (
            <div className="file-sync-bar">
              <div className="file-sync-bar__fill" style={{ 
                width: (syncInfo.fileCount || syncInfo.total) > 0 
                  ? `${Math.round(((syncInfo.cached || 0) / (syncInfo.fileCount || syncInfo.total || 1)) * 100)}%` 
                  : '100%' 
              }} />
            </div>
          )}
        </div>
        <button
          className={`pin-btn${isPinned ? ' pin-btn--active' : ''}`}
          onClick={handlePinClick}
          title={isPinned 
            ? (isFolder ? 'Открепить папку (и всё содержимое)' : 'Открепить') 
            : (isFolder ? 'Закрепить папку (всё содержимое)' : 'Закрепить офлайн')
          }
        >
          {isFolder ? <FolderPinIcon pinned={isPinned} /> : <PinIcon pinned={isPinned} />}
        </button>
      </div>

      <div className="file-size">{isFolder ? '--' : formatSize(size)}</div>
      <div className="file-modified">{formattedDate}</div>
      <div className="file-sync" onDoubleClick={(e) => e.stopPropagation()}>
        {renderSyncColumn()}
      </div>
    </div>
  );
};

export default FileItem;
