import React, { useState } from 'react';

const frequencyOptions = [
  { id: '1d', label: '1 день', value: 1 },
  { id: '3d', label: '3 дня', value: 3 },
  { id: '1w', label: '1 неделя', value: 7 },
  { id: '2w', label: '2 недели', value: 14 },
];

function SettingsPanel({ currentFrequency = '1d', onFrequencyChange }) {
  const [frequency, setFrequency] = useState(currentFrequency);

  const handleSave = () => {
    console.log(`[API MOCK] SettingsPanel: Отправка на бэкенд -> PATCH /api/v1/settings/sync-frequency | frequency: ${frequency}`);
    onFrequencyChange?.(frequency);
    
    // Эмуляция уведомления об успешном сохранении
    alert('Настройки сохранены!');
  };

  return (
    <div className="accPanel_container">
      <h1 className="accPanel_title">Настройки</h1>
      
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

      <div style={{ marginTop: '2rem' }}>
        <button 
          className="mainMenu_addButton" 
          style={{ width: 'auto', padding: '10px 24px' }}
          onClick={handleSave}
        >
          Сохранить изменения
        </button>
      </div>
    </div>
  );
}

export default SettingsPanel;
