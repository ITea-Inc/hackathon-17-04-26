import React, { useEffect, useState } from 'react';

const frequencyOptions = [
  { id: '30s', label: '30 секунд' },
  { id: '1m', label: '1 минута' },
  { id: '5m', label: '5 минут' },
  { id: '30m', label: '30 минут' },
  { id: '1d', label: '1 день' },
];

const cacheOptions = [
  { id: '1gb', label: '1 ГБ', value: 1073741824 },
  { id: '2gb', label: '2 ГБ', value: 2147483648 },
  { id: '5gb', label: '5 ГБ', value: 5368709120 },
  { id: '10gb', label: '10 ГБ', value: 10737418240 },
];

const explorerRefreshOptions = [
  { id: '10s', label: '10 секунд', value: 10 },
  { id: '15s', label: '15 секунд', value: 15 },
  { id: '30s', label: '30 секунд', value: 30 },
  { id: '1m', label: '1 минута', value: 60 },
];

function SettingsPanel({
  currentFrequency = '1d',
  onFrequencyChange,
  currentCacheSize = 5368709120,
  onCacheSizeChange,
  currentExplorerRefreshSeconds = 30,
  onExplorerRefreshChange
}) {
  const [frequency, setFrequency] = useState(currentFrequency);
  const [cacheSize, setCacheSize] = useState(currentCacheSize);
  const [explorerRefresh, setExplorerRefresh] = useState(currentExplorerRefreshSeconds);

  useEffect(() => setFrequency(currentFrequency), [currentFrequency]);
  useEffect(() => setCacheSize(currentCacheSize), [currentCacheSize]);
  useEffect(() => setExplorerRefresh(currentExplorerRefreshSeconds), [currentExplorerRefreshSeconds]);

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
        <h2 className="accPanel_sectionTitle">Обновление проводника</h2>
        <p className="settings_description">
          Интервал, с которым проводник проверяет изменения файлов в облаке.
        </p>

        <div className="settings_options_list">
          {explorerRefreshOptions.map((opt) => (
            <div
              key={opt.id}
              className={`settings_option_item ${explorerRefresh === opt.value ? 'active' : ''}`}
              onClick={() => {
                setExplorerRefresh(opt.value);
                onExplorerRefreshChange?.(opt.value);
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
    </div>
  );
}

export default SettingsPanel;
