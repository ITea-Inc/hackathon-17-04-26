import React, { useState } from 'react';

const frequencyOptions = [
  { id: '1h', label: 'Каждый час', value: 0.04 },
  { id: '1d', label: '1 день', value: 1 },
  { id: '3d', label: '3 дня', value: 3 },
  { id: '1w', label: '1 неделя', value: 7 },
  { id: '2w', label: '2 недели', value: 14 },
];

function SettingsPanel({ currentFrequency = '1d', onFrequencyChange }) {
  const [frequency, setFrequency] = useState(currentFrequency);

  const handleSave = () => {
    // Теперь это реально меняет состояние в App.jsx, 
    // которое используется при создании правил SCHEDULED
    onFrequencyChange?.(frequency);
    
    // Показываем более аккуратное уведомление (можно заменить на тост)
    console.log(`[Settings] Установлена частота: ${frequency}`);
  };

  return (
    <div className="accPanel_container">
      <h1 className="accPanel_title">Настройки</h1>
      
      <div className="settings_group">
        <h2 className="accPanel_sectionTitle">Периодичность синхронизации (Тайминг)</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Выберите интервал для файлов и папок с политикой «По расписанию». 
          Новые правила будут использовать это значение.
        </p>
        
        <div className="settings_options_list">
          {frequencyOptions.map((opt) => (
            <div 
              key={opt.id} 
              className={`settings_option_item ${frequency === opt.id ? 'active' : ''}`}
              onClick={() => {
                setFrequency(opt.id);
                onFrequencyChange?.(opt.id); // Сразу применяем при клике для лучшего UX
              }}
            >
              <div className="settings_radio">
                <div className="settings_radio_inner" />
              </div>
              <span className="settings_option_label">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>Совет:</strong> Политика «По расписанию» полезна для больших папок с бэкапами, которые не нужно синхронизировать в реальном времени.
        </p>
      </div>
    </div>
  );
}

export default SettingsPanel;
