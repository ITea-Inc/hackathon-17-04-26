import React, { useState, useEffect } from 'react';
import FileExplorer from './components/FileExplorer';
import MainMenu from './components/MainMenu';
import AccountsPanel from './components/AccountsPanel';
import SettingsPanel from './components/SettingsPanel';
import SyncToast from './components/SyncToast';
import { useSyncEvents } from './hooks/useSyncEvents';
import './App.css';

const API_BASE = 'http://localhost:8080';

function App() {
  const [files, setFiles] = useState([]);
  const [rules, setRules] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const [syncFrequency, setSyncFrequency] = useState('1d');

  const { isSyncing, notifications, dismissNotification, getSyncInfo } = useSyncEvents();

  const getCronByFrequency = (freq) => {
    switch (freq) {
      case '1h': return '0 0 * * * *';
      case '1d': return '0 0 2 * * *';
      case '3d': return '0 0 2 */3 * *';
      case '1w': return '0 0 2 * * 0';
      case '2w': return '0 0 2 1,15 * *';
      default: return '0 0 2 * * *';
    }
  };

  const fetchRules = () => {
    if (!selectedAccountId) return;
    fetch(`${API_BASE}/api/rules?accountId=${selectedAccountId}`)
      .then(res => res.json())
      .then(data => setRules(data))
      .catch(err => console.error(err));
  };

  const refreshFiles = (retryCount = 0) => {
    if (!selectedAccountId) return;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/files/${selectedAccountId}?path=${encodeURIComponent(currentPath)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const filesWithRules = data.map(file => {
          const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}${file.name}`;
          const rule = rules.find(r => r.pathPattern === fullPath);
          return { ...file, syncRule: rule ? rule.policy : 'MANUAL', fullPath };
        });
        setFiles(filesWithRules);
        setLoading(false);
      })
      .catch(err => {
        if (retryCount < 3 && (err.name === 'TypeError' || err.message.includes('fetch'))) {
          setTimeout(() => refreshFiles(retryCount + 1), 2000);
        } else {
          setError(err.message);
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    fetchRules();
  }, [selectedAccountId]);

  useEffect(() => {
    refreshFiles();
  }, [currentPath, selectedAccountId, rules]);

  const handleSyncChange = (fileName, newPolicy) => {
    if (!selectedAccountId) return;

    const fullPath = currentPath === '/' ? `/${fileName}` : `${currentPath}${fileName}`;
    const cron = newPolicy === 'SCHEDULED' ? getCronByFrequency(syncFrequency) : null;

    fetch(`${API_BASE}/api/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: selectedAccountId,
        pathPattern: fullPath,
        policy: newPolicy,
        priority: 10,
        cronExpression: cron
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to save rule');
        return res.json();
      })
      .then(() => fetchRules())
      .catch(err => alert(err.message));
  };

  const handleFolderClick = (folderName) => {
    const newPath = currentPath === '/' ? `/${folderName}/` : `${currentPath}${folderName}/`;
    setCurrentPath(newPath);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.length === 0 ? '/' : `/${parts.join('/')}/`;
    setCurrentPath(newPath);
  };

  return (
    <div className="app_layout">
      <MainMenu activeItem={activeTab} onItemClick={setActiveTab} isSyncing={isSyncing} />
      <SyncToast notifications={notifications} onDismiss={dismissNotification} />

      <main className="content-area" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {activeTab === 'accounts' && <AccountsPanel onAccountSelect={setSelectedAccountId} />}
        {activeTab === 'settings' && (
          <SettingsPanel
            currentFrequency={syncFrequency}
            onFrequencyChange={setSyncFrequency}
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
            {loading && <div style={{ textAlign: 'center', padding: '1rem' }}><div className="spinner"></div></div>}
            {!loading && (
              <FileExplorer
                items={files}
                onSyncChange={handleSyncChange}
                onFolderClick={handleFolderClick}
                accountId={selectedAccountId}
                onRefresh={refreshFiles}
                getSyncInfo={getSyncInfo}
              />
            )}
          </div>
        )}

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
