import React, { useState, useEffect, useCallback } from 'react';
import FileExplorer from './components/FileExplorer';
import MainMenu from './components/MainMenu';
import AccountsPanel from './components/AccountsPanel';
import SettingsPanel from './components/SettingsPanel';
import AppearancePanel from './components/AppearancePanel';
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
  const [pinnedPaths, setPinnedPaths] = useState(new Set());
  const [cacheSize, setCacheSize] = useState(5368709120); // 5 GB
  const [explorerRefreshSeconds, setExplorerRefreshSeconds] = useState(30);

  const { isSyncing, notifications, dismissNotification, getSyncInfo } = useSyncEvents();

  useEffect(() => {
    // Monitor system accent color live
    let monitor;
    if (window.require) {
      const { execSync, spawn } = window.require('child_process');
      const colorMap = {
        blue: '#78aeed', teal: '#4a9a8e', green: '#8cb854', yellow: '#d4a54a',
        orange: '#e5843a', red: '#e55c5c', pink: '#d56199', purple: '#9141ac',
        slate: '#6f8396', bark: '#b27b4f', sage: '#6f8372', lavender: '#9141ac',
        magenta: '#d56199',
      };

      const fetchAccent = () => {
        try {
          let accent = execSync('gsettings get org.gnome.desktop.interface accent-color 2>/dev/null').toString().trim().replace(/'/g, '');
          if (accent && colorMap[accent]) {
            document.documentElement.style.setProperty('--gnome-accent', colorMap[accent]);
            return;
          }
        } catch(e) {}
        
        try {
          let theme = execSync('gsettings get org.gnome.desktop.interface gtk-theme 2>/dev/null').toString().trim().replace(/'/g, '');
          if (theme) {
            const match = theme.match(/[Yy]aru-(\w+)/);
            if (match && match[1]) {
              const colorName = match[1].replace(/-?dark$/, '').replace(/-?light$/, '');
              if (colorName && colorMap[colorName]) {
                document.documentElement.style.setProperty('--gnome-accent', colorMap[colorName]);
              }
            }
          }
        } catch(e) {}
      };

      fetchAccent(); // Initial fetch
      
      try {
        monitor = spawn('gsettings', ['monitor', 'org.gnome.desktop.interface']);
        let timeoutId;
        monitor.stdout.on('data', () => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fetchAccent(), 300);
        });
      } catch (e) {
        console.error('Failed to start gnome interface monitor', e);
      }
    }
    return () => {
      if (monitor) monitor.kill();
    };
  }, []);

  const getCronByFrequency = (freq) => {
    switch (freq) {
      case '30s': return '*/30 * * * * *';
      case '1m': return '0 * * * * *';
      case '5m': return '0 */5 * * * *';
      case '30m': return '0 */30 * * * *';
      case '1d': return '0 0 2 * * *';
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

  const fetchPinned = () => {
    if (!selectedAccountId) return;
    fetch(`${API_BASE}/api/pinned?accountId=${selectedAccountId}`)
      .then(res => res.json())
      .then(data => setPinnedPaths(new Set(data)))
      .catch(err => console.error(err));
  };

  const handlePinToggle = (filePath, shouldPin) => {
    if (!selectedAccountId) return;
    const method = shouldPin ? 'POST' : 'DELETE';
    fetch(`${API_BASE}/api/pinned`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: selectedAccountId, path: filePath })
    })
      .then(res => { if (!res.ok) throw new Error('Failed'); })
      .then(() => {
        setPinnedPaths(prev => {
          const next = new Set(prev);
          if (shouldPin) next.add(filePath); else next.delete(filePath);
          return next;
        });
      })
      .catch(err => console.error(err));
  };

  const refreshFiles = useCallback((retryCount = 0, silent = false) => {
    if (!selectedAccountId) return;
    if (!silent) setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/files/${selectedAccountId}?path=${encodeURIComponent(currentPath)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const newPinned = new Set(pinnedPaths);
        const filesWithRules = data.map(file => {
          const fullPath = currentPath === '/' ? `/${file.name}` : `${currentPath}${file.name}`;
          const rule = rules.find(r => r.pathPattern === fullPath);
          
          if (file.pinned) newPinned.add(file.path || fullPath);
          
          return { ...file, syncRule: rule ? rule.policy : 'MANUAL', fullPath: file.path || fullPath };
        });
        
        if (newPinned.size !== pinnedPaths.size) {
          setPinnedPaths(newPinned);
        }
        
        setFiles(filesWithRules);
        if (!silent) setLoading(false);
      })
      .catch(err => {
        if (retryCount < 3 && (err.name === 'TypeError' || err.message.includes('fetch'))) {
          setTimeout(() => refreshFiles(retryCount + 1, silent), 2000);
        } else {
          setError(err.message);
          if (!silent) setLoading(false);
        }
      });
  }, [selectedAccountId, currentPath, pinnedPaths, rules]);

  useEffect(() => {
    // Fetch global settings
    fetch(`${API_BASE}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.syncFrequency) setSyncFrequency(data.syncFrequency);
        if (data.cacheSizeBytes) setCacheSize(data.cacheSizeBytes);
        if (data.explorerRefreshSeconds) setExplorerRefreshSeconds(data.explorerRefreshSeconds);
      })
      .catch(err => console.error('Failed to fetch settings:', err));

    fetchRules();
    fetchPinned();
  }, [selectedAccountId]);

  const handleFrequencyChange = (newFreq) => {
    setSyncFrequency(newFreq);
    fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncFrequency: newFreq })
    }).catch(err => console.error('Failed to save settings:', err));
  };

  const handleCacheSizeChange = (newLimit) => {
    setCacheSize(newLimit);
    fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cacheSizeBytes: newLimit })
    }).catch(err => console.error('Failed to save settings:', err));
  };

  const handleExplorerRefreshChange = (newSeconds) => {
    setExplorerRefreshSeconds(newSeconds);
    fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ explorerRefreshSeconds: newSeconds })
    }).catch(err => console.error('Failed to save settings:', err));
  };

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  useEffect(() => {
    if (activeTab !== 'sync-rules' || !selectedAccountId) return;
    const interval = setInterval(() => refreshFiles(0, true), explorerRefreshSeconds * 1000);
    return () => clearInterval(interval);
  }, [activeTab, selectedAccountId, explorerRefreshSeconds, refreshFiles]);

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
            onFrequencyChange={handleFrequencyChange}
            currentCacheSize={cacheSize}
            onCacheSizeChange={handleCacheSizeChange}
            currentExplorerRefreshSeconds={explorerRefreshSeconds}
            onExplorerRefreshChange={handleExplorerRefreshChange}
          />
        )}
        {activeTab === 'appearance' && <AppearancePanel />}

        {activeTab === 'sync-rules' && (
          <div className="accPanel_container">
            <h1 className="accPanel_title">Правила синхронизации</h1>
            <div className="settings_hint_box">
              <p className="settings_hint_text">
                <strong>Всегда</strong> - немедленная загрузка при следующих событиях: изменение файла в облаке,
                локального файла, правил синхронизации
              </p>
              <p className="settings_hint_text">
                <strong>По расписанию</strong> - загружать файл по установленному времени
              </p>
              <p className="settings_hint_text">
                <strong>Никогда</strong> - только по явному запросу пользователя
              </p>
            </div>
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
                pinnedPaths={pinnedPaths}
                onPinToggle={handlePinToggle}
              />
            )}
          </div>
        )}

        {activeTab !== 'accounts' && activeTab !== 'sync-rules' && activeTab !== 'settings' && activeTab !== 'appearance' && (
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
