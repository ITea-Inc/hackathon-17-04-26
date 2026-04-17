import React, { useState, useEffect } from 'react';
import FileExplorer from './components/FileExplorer';
import MainMenu from './components/MainMenu';
import AccountsPanel from './components/AccountsPanel';
import SettingsPanel from './components/SettingsPanel';
import './App.css';

const API_BASE = 'http://localhost:8080';

function App() {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);


  const refreshFiles = () => {
    if (!selectedAccountId) return;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/files/${selectedAccountId}?path=${encodeURIComponent(currentPath)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json();
      })
      .then(data => {
        setFiles(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('[API] Ошибка загрузки файлов:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    refreshFiles();
  }, [currentPath, selectedAccountId]);

  const handleSyncChange = (fileName, newRule) => {
    console.log(`[API MOCK] Обновление статуса: PATCH /api/v1/files/sync -> path: ${currentPath}${fileName}, rule: ${newRule}`);
    // Update local state directly for mock
    setFiles(prev => prev.map(f => f.name === fileName ? { ...f, syncRule: newRule } : f));
  };

  const handleFolderClick = (folderName) => {
    const newPath = currentPath === '/' ? `/${folderName}/` : `${currentPath}${folderName}/`;
    setCurrentPath(newPath);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop(); // удаляем последнюю папку
    const newPath = parts.length === 0 ? '/' : `/${parts.join('/')}/`;
    setCurrentPath(newPath);
  };

  const [activeTab, setActiveTab] = useState('accounts');
  const [syncFrequency, setSyncFrequency] = useState('1d');

  const handleFrequencyChange = (newFreq) => {
    setSyncFrequency(newFreq);
  };

  return (
    <div className="app_layout">
      <MainMenu activeItem={activeTab} onItemClick={setActiveTab} />

      <main className="content-area" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {activeTab === 'accounts' && <AccountsPanel onAccountSelect={setSelectedAccountId} />}
        {activeTab === 'settings' && (
          <SettingsPanel
            currentFrequency={syncFrequency}
            onFrequencyChange={handleFrequencyChange}
          />
        )}

        {activeTab === 'sync-rules' && (
          <div className="accPanel_container">
            <h1 className="accPanel_title">Правила синхронизации</h1>
            <div className="accPanel_breadcrumb">
              <button
                className={'accPanel_breadcrumbBack' + (currentPath === '/' ? ' accPanel_breadcrumbBack--disabled' : '')}
                onClick={navigateUp}
                disabled={currentPath === '/'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="accPanel_breadcrumbPath">
                {currentPath === '/' ? '/' : currentPath.split('/').filter(Boolean).map((seg, i, arr) => (
                  <span key={i}>
                    <span className="accPanel_breadcrumbSep">/</span>
                    <span className={i === arr.length - 1 ? 'accPanel_breadcrumbCurrent' : ''}>{seg}</span>
                  </span>
                ))}
              </span>
            </div>
            <FileExplorer items={files} onSyncChange={handleSyncChange} onFolderClick={handleFolderClick} accountId={selectedAccountId} onRefresh={refreshFiles} />
          </div>
        )}

        {/* Заглушки для остальных вкладок */}
        {activeTab !== 'accounts' && activeTab !== 'sync-rules' && activeTab !== 'settings' && (
          <div className="accPanel_container">
            <h1 className="accPanel_title">{activeTab.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</h1>
            <p className="accPanel_subtitle">Этот раздел находится в разработке...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;