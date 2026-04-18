import React, { useMemo, useState } from 'react';
import FileItem from './FileItem';

const FileExplorer = ({ items, onSyncChange, onFolderClick, accountId, onRefresh, getSyncInfo, pinnedPaths, onPinToggle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

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
        result = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
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
  }, [items, searchQuery, sortBy, sortDirection]);

  const sortIndicator = (field) => {
    if (sortBy !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="explorer-container">
      <div className="explorer-toolbar">
        <input
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
        {visibleItems.length === 0 && (
          <div style={{ padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: 13 }}>
            {!accountId ? 'Подключите аккаунт в разделе «Аккаунты»' : items.length === 0 ? 'Папка пуста' : 'Ничего не найдено'}
          </div>
        )}
        {visibleItems.map((item, index) => (
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
