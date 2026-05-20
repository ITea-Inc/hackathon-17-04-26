import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import FileItem from './FileItem';
import FilePreviewPanel from './FilePreviewPanel';

const SkeletonRow = () => (
  <div className="skeleton_row">
    <div className="skeleton_cell" style={{ flex: 3 }}>
      <div className="skeleton_icon" />
      <div className="skeleton_text" style={{ width: `${50 + Math.random() * 40}%` }} />
    </div>
    <div className="skeleton_cell" style={{ flex: 1 }}>
      <div className="skeleton_text" style={{ width: '60%' }} />
    </div>
    <div className="skeleton_cell" style={{ flex: 1.5 }}>
      <div className="skeleton_text" style={{ width: '75%' }} />
    </div>
    <div className="skeleton_cell" style={{ flex: 1 }}>
      <div className="skeleton_text skeleton_pill" />
    </div>
  </div>
);

const ContextMenu = ({ x, y, items, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="ctx_menu" style={{ top: y, left: x }}>
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="ctx_separator" />
        ) : (
          <button
            key={i}
            className={`ctx_item${item.danger ? ' ctx_item--danger' : ''}`}
            onClick={() => { item.action(); onClose(); }}
            disabled={item.disabled}
          >
            {item.icon && <span className="ctx_itemIcon">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        )
      )}
    </div>
  );
};

const FileExplorer = ({ items, onSyncChange, onFolderClick, accountId, onRefresh, getSyncInfo, pinnedPaths, onPinToggle, loading, searchRef, focusedIndex = -1 }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedFile, setSelectedFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const internalSearchRef = useRef(null);
  const nameCollator = useMemo(() => new Intl.Collator(undefined, { sensitivity: 'base' }), []);

  // Expose search input ref for keyboard shortcuts
  const actualSearchRef = searchRef || internalSearchRef;

  const handleSortClick = (field) => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setSortDirection('asc');
  };

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? items.filter(item => (item.name || '').toLowerCase().includes(query))
      : items;

    const sorted = [...filtered].sort((a, b) => {
      if (a.directory !== b.directory) return a.directory ? -1 : 1;
      let result = 0;
      if (sortBy === 'name') {
        result = nameCollator.compare(a.name || '', b.name || '');
      } else if (sortBy === 'size') {
        result = (a.size || 0) - (b.size || 0);
      } else if (sortBy === 'date') {
        const aDate = a.lastModified ? Date.parse(a.lastModified) : 0;
        const bDate = b.lastModified ? Date.parse(b.lastModified) : 0;
        result = aDate - bDate;
      }
      return sortDirection === 'asc' ? result : -result;
    });
    return sorted;
  }, [items, searchQuery, sortBy, sortDirection, nameCollator]);

  const sortIndicator = (field) => {
    if (sortBy !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();

    const menuItems = [
      {
        label: 'Свойства',
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
        action: () => setSelectedFile(prev => prev?.fullPath === file.fullPath ? null : file),
      },
      {
        label: isPinnedFile(file) 
          ? (file.directory ? 'Открепить папку' : 'Открепить') 
          : (file.directory ? 'Закрепить папку (всё содержимое)' : 'Закрепить офлайн'),
        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinnedFile(file) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>,
        action: () => {
          if (onPinToggle && file.fullPath) {
            onPinToggle(file.fullPath, !isPinnedFile(file));
          }
        },
      },
    ];
    setContextMenu({ x: e.clientX, y: e.clientY, items: menuItems });
  };

  const isPinnedFile = (file) => pinnedPaths ? pinnedPaths.has(file.fullPath) : false;

  return (
    <div className="explorer-container" style={{ display: 'flex', gap: 0 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="explorer-toolbar">
          <input
            ref={actualSearchRef}
            className="explorer-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск в текущей папке..."
          />
        </div>
        <div className="explorer-header">
          <button type="button" className="header-sort-btn" onClick={() => handleSortClick('name')}>
            Имя <span className="header-sort-indicator">{sortIndicator('name')}</span>
          </button>
          <button type="button" className="header-sort-btn" onClick={() => handleSortClick('size')}>
            Размер <span className="header-sort-indicator">{sortIndicator('size')}</span>
          </button>
          <button type="button" className="header-sort-btn" onClick={() => handleSortClick('date')}>
            Изменён <span className="header-sort-indicator">{sortIndicator('date')}</span>
          </button>
          <div className="header-sync" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Синхр.
            {onRefresh && (
              <button className="refresh_btn" onClick={onRefresh} title="Обновить (Ctrl+R)">
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
          {loading ? (
            <>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </>
          ) : visibleItems.length === 0 ? (
            <div style={{ padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: 13 }}>
              {!accountId ? 'Подключите аккаунт в разделе «Аккаунты»' : items.length === 0 ? 'Папка пуста' : 'Ничего не найдено'}
            </div>
          ) : (
            visibleItems.map((item, idx) => (
              <FileItem
                key={item.fullPath}
                {...item}
                onSyncChange={onSyncChange}
                onFolderClick={onFolderClick}
                syncInfo={getSyncInfo ? getSyncInfo(accountId, item.fullPath) : null}
                isPinned={pinnedPaths ? pinnedPaths.has(item.fullPath) : false}
                onPinToggle={onPinToggle}
                isSelected={selectedFile?.fullPath === item.fullPath}
                isFocused={idx === focusedIndex}
                onContextMenu={handleContextMenu}
              />
            ))
          )}
        </div>
      </div>

      {selectedFile && (
        <FilePreviewPanel
          file={selectedFile}
          accountId={accountId}
          onClose={() => setSelectedFile(null)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default FileExplorer;
