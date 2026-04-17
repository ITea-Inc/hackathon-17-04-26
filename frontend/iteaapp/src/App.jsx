import React, { useState, useEffect } from 'react';
import FileExplorer from './components/FileExplorer';
import MainMenu from './components/MainMenu';
import AccountsPanel from './components/AccountsPanel';
import SettingsPanel from './components/SettingsPanel';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');

  // Mock fetching data from backend
  useEffect(() => {
    console.log(`[API MOCK] Запрос файлов: GET /api/v1/files?path=${encodeURIComponent(currentPath)}`);
    /* 
    fetch(`http://localhost:8080/api/v1/files?path=${encodeURIComponent(currentPath)}`)
      .then(res => res.json())
      .then(data => setFiles(data));
    */

    // Сгенерируем фейковые данные в зависимости от пути для наглядности
    if (currentPath === '/') {
      setFiles([
        { name: 'Documents', type: 'folder', size: '', modified: '2024-03-15', syncRule: 'always' },
        { name: 'Pictures', type: 'folder', size: '', modified: '2024-03-10', syncRule: 'never' },
        { name: 'Project_Alpha.pdf', type: 'pdf', size: '2.4 MB', modified: '2024-03-16', syncRule: 'timing' },
      ]);
    } else {
      // Имитируем содержимое папки
      setFiles([
        { name: 'subfolder_1', type: 'folder', size: '', modified: '2024-03-17', syncRule: 'always' },
        { name: 'test_file.txt', type: 'txt', size: '15 B', modified: '2024-03-18', syncRule: 'timing' },
      ]);
    }
  }, [currentPath]);

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
        {activeTab === 'accounts' && <AccountsPanel />}
        {activeTab === 'settings' && (
          <SettingsPanel 
            currentFrequency={syncFrequency} 
            onFrequencyChange={handleFrequencyChange} 
          />
        )}
        
        {activeTab === 'sync-rules' && (
          <div className="app-main">
            <div className="app-header">
              {currentPath !== '/' && (
                <button 
                  onClick={navigateUp}
                  style={{ 
                    position: 'absolute', 
                    left: '2rem', 
                    top: '3rem', 
                    padding: '0.4rem 1rem', 
                    background: '#333', 
                    color: '#fff', 
                    border: '1px solid #444', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                >
                  ← Назад
                </button>
              )}
              <h1 className="app-title">Правила синхронизации</h1>
              <p className="app-subtitle">Пусть: {currentPath}</p>
            </div>
            <FileExplorer items={files} onSyncChange={handleSyncChange} onFolderClick={handleFolderClick} />
          </div>
        )}

        {/* Заглушки для остальных вкладок */}
        {activeTab !== 'accounts' && activeTab !== 'sync-rules' && (
          <div style={{ padding: '2rem', color: '#666' }}>
            <h2>{activeTab.replace('-', ' ').toUpperCase()}</h2>
            <p>Этот раздел находится в разработке...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;