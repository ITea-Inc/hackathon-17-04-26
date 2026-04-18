import React, { useState } from 'react';

const frequencyOptions = [
  { id: '1h', label: 'Каждый час', value: 0.04 },
  { id: '1d', label: '1 день', value: 1 },
  { id: '3d', label: '3 дня', value: 3 },
  { id: '1w', label: '1 неделя', value: 7 },
  { id: '2w', label: '2 недели', value: 14 },
];

const cacheOptions = [
  { id: '1gb', label: '1 ГБ', value: 1073741824 },
  { id: '2gb', label: '2 ГБ', value: 2147483648 },
  { id: '5gb', label: '5 ГБ', value: 5368709120 },
  { id: '10gb', label: '10 ГБ', value: 10737418240 },
];

function SettingsPanel({ 
  currentFrequency = '1d', 
  onFrequencyChange, 
  currentCacheSize = 5368709120, 
  onCacheSizeChange 
}) {
  const [frequency, setFrequency] = useState(currentFrequency);
  const [cacheSize, setCacheSize] = useState(currentCacheSize);

  return (
    <div className="accPanel_container" style={{ paddingBottom: '2rem' }}>
      <h1 className="accPanel_title">Настройки</h1>
      
      <div className="settings_group">
        <h2 className="accPanel_sectionTitle">Периодичность синхронизации (Тайминг)</h2>
        <p className="settings_description">
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
                onFrequencyChange?.(opt.id);
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

      <div className="settings_group" style={{ marginTop: '2.5rem' }}>
        <h2 className="accPanel_sectionTitle">Лимит кэша на диске</h2>
        <p className="settings_description">
          Максимальное пространство, которое приложение может использовать для временных файлов. 
          При превышении старые файлы будут удалены.
        </p>
        
        <div className="settings_options_list">
          {cacheOptions.map((opt) => (
            <div 
              key={opt.id} 
              className={`settings_option_item ${cacheSize === opt.id || cacheSize === opt.value ? 'active' : ''}`}
              onClick={() => {
                setCacheSize(opt.value);
                onCacheSizeChange?.(opt.value);
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

      <div className="settings_info_box">
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>Совет:</strong> Политика «По расписанию» полезна для больших папок с бэкапами, которые не нужно синхронизировать в реальном времени.
        </p>
      </div>
    </div>
  );
}

export default SettingsPanel;
