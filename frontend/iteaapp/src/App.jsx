import React, { useState, useEffect } from 'react';
import FileExplorer from './components/FileExplorer';
import MainMenu from './components/MainMenu';
import AccountsPanel from './components/AccountsPanel';
import SettingsPanel from './components/SettingsPanel';
import './App.css';

const API_BASE = 'http://localhost:8080';

// Карта: политика бэкенда → syncRule фронта
const POLICY_TO_RULE = {
  ALWAYS: 'always',
  SCHEDULED: 'timing',
  MANUAL: 'never',
  ON_DEMAND: 'on_demand',
};

// Карта: syncRule фронта → политика бэкенда
const RULE_TO_POLICY = {
  always: 'ALWAYS',
  timing: 'SCHEDULED',
  never: 'MANUAL',
  on_demand: 'ON_DEMAND',
};

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function App() {
  const [files, setFiles] = useState([]);
  const [rules, setRules] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // Загружаем аккаунты при старте, выбираем первый
  useEffect(() => {
    fetch(`${API_BASE}/api/accounts`)
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        setAccounts(data);
        if (data.length > 0) setSelectedAccountId(data[0].id);
      })
      .catch(err => console.error('[API] Ошибка загрузки аккаунтов:', err));
  }, []);

  // Загружаем файлы при смене аккаунта или пути
  useEffect(() => {
    if (!selectedAccountId) {
      setFiles([]);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/files/${selectedAccountId}?path=${encodeURIComponent(currentPath)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json();
      })
      .then(data => {
        setFiles(data.map(f => ({
          name: f.name,
          type: f.directory ? 'folder' : (f.mimeType?.split('/')[1] || f.name.split('.').pop() || 'file'),
          size: formatSize(f.size),
          modified: f.lastModified ? f.lastModified.substring(0, 10) : '',
          syncRule: 'on_demand', // будет перезаписано после загрузки правил
        })));
        setLoading(false);
      })
      .catch(err => {
        console.error('[API] Ошибка загрузки файлов:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [selectedAccountId, currentPath]);

  // Загружаем правила при смене аккаунта
  useEffect(() => {
    if (!selectedAccountId) {
      setRules([]);
      return;
    }
    fetch(`${API_BASE}/api/rules?accountId=${selectedAccountId}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setRules(Array.isArray(data) ? data : []))
      .catch(() => setRules([]));
  }, [selectedAccountId]);

  // Накладываем правила на файлы
  const filesWithRules = files.map(f => {
    const fullPath = currentPath === '/' ? '/' + f.name : currentPath.replace(/\/$/, '') + '/' + f.name;
    const rule = rules.find(r => r.pathPattern === fullPath);
    if (!rule) return { ...f, syncRule: 'on_demand' };
    return { ...f, syncRule: POLICY_TO_RULE[rule.policy] || 'on_demand', ruleId: rule.id };
  });

  // Изменение правила синхронизации — реальный API
  const handleSyncChange = (fileName, newRule) => {
    if (!selectedAccountId) return;

    const fullPath = currentPath === '/' ? '/' + fileName : currentPath.replace(/\/$/, '') + '/' + fileName;
    const policy = RULE_TO_POLICY[newRule] || 'ON_DEMAND';

    // Обновляем локальное состояние немедленно для отзывчивости UI
    setFiles(prev => prev.map(f => f.name === fileName ? { ...f, syncRule: newRule } : f));

    // Upsert правила на бэкенде
    fetch(`${API_BASE}/api/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: selectedAccountId,
        pathPattern: fullPath,
        policy,
        priority: 10,
      }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(updated => {
        setRules(prev => {
          const idx = prev.findIndex(r => r.id === updated.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [...prev, updated];
        });
      })
      .catch(err => console.error('[API] Ошибка обновления правила:', err));
  };

  const handleFolderClick = (folderName) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(newPath);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
  };

  const [activeTab, setActiveTab] = useState('accounts');

  return (
    <div className="app_layout">
      <MainMenu activeItem={activeTab} onItemClick={setActiveTab} />
      
      <main className="content-area" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {activeTab === 'accounts' && (
          <AccountsPanel onAccountsChange={(data) => {
            setAccounts(data);
            if (data.length > 0 && !selectedAccountId) setSelectedAccountId(data[0].id);
          }} />
        )}
        {activeTab === 'settings' && <SettingsPanel />}
        
        {activeTab === 'sync-rules' && (
          <div className="accPanel_container">
            <h1 className="accPanel_title">Правила синхронизации</h1>

            {/* Выбор аккаунта если их несколько */}
            {accounts.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <select
                  value={selectedAccountId || ''}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff' }}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.username} ({acc.provider})</option>
                  ))}
                </select>
              </div>
            )}

            {!selectedAccountId && (
              <p style={{ color: 'var(--text-secondary)' }}>
                Подключите аккаунт на вкладке «Аккаунты», чтобы управлять правилами синхронизации.
              </p>
            )}

            {selectedAccountId && (
              <>
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

                {loading && <p style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>}
                {error && (
                  <div style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                    ⚠️ {error}
                  </div>
                )}
                {!loading && !error && (
                  <FileExplorer items={filesWithRules} onSyncChange={handleSyncChange} onFolderClick={handleFolderClick} />
                )}
              </>
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