import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8080';

const frequencyOptions = [
  { id: '1d', label: '1 день', value: 1 },
  { id: '3d', label: '3 дня', value: 3 },
  { id: '1w', label: '1 неделя', value: 7 },
  { id: '2w', label: '2 недели', value: 14 },
];

function SettingsPanel() {
  const [frequency, setFrequency] = useState('1d');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Загружаем настройки при монтировании
  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => {
        if (data.syncFrequency) setFrequency(data.syncFrequency);
      })
      .catch(err => console.error('[API] Ошибка загрузки настроек:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    setSaved(false);
    fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncFrequency: frequency }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      })
      .catch(err => {
        console.error('[API] Ошибка сохранения настроек:', err);
        alert('Ошибка сохранения настроек');
      })
      .finally(() => setSaving(false));
  };

  return (
    <div className="accPanel_container">
      <h1 className="accPanel_title">Настройки</h1>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Загрузка настроек...</p>
      ) : (
        <>
          <div className="settings_group">
            <h2 className="accPanel_sectionTitle">Периодичность синхронизации (Тайминг)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Выберите, как часто будет выполняться синхронизация для файлов с правилом «Тайминг».
            </p>
            
            <div className="settings_options_list">
              {frequencyOptions.map((opt) => (
                <div 
                  key={opt.id} 
                  className={`settings_option_item ${frequency === opt.id ? 'active' : ''}`}
                  onClick={() => setFrequency(opt.id)}
                >
                  <div className="settings_radio">
                    <div className="settings_radio_inner" />
                  </div>
                  <span className="settings_option_label">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="mainMenu_addButton" 
              style={{ width: 'auto', padding: '10px 24px', opacity: saving ? 0.6 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
            {saved && (
              <span style={{ color: '#4ade80', fontSize: 14 }}>✓ Настройки сохранены</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SettingsPanel;
