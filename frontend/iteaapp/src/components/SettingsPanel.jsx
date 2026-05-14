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

function parseFrequency(freqStr) {
  const match = freqStr.match(/^(\d+)(s|m|h|d)$/);
  if (match) {
    return { value: match[1], unit: match[2] };
  }
  return { value: '1', unit: 'd' };
}

function SettingsPanel({
  currentFrequency = '1d',
  onFrequencyChange,
  currentCacheSize = 5368709120,
  onCacheSizeChange,
  currentExplorerRefreshSeconds = 30,
  onExplorerRefreshChange
}) {
  const isCustomFreq = !frequencyOptions.find(o => o.id === currentFrequency);
  const [frequencyType, setFrequencyType] = useState(isCustomFreq ? 'custom' : currentFrequency);
  const parsedFreq = parseFrequency(currentFrequency);
  const [customFreqValue, setCustomFreqValue] = useState(isCustomFreq ? parsedFreq.value : '1');
  const [customFreqUnit, setCustomFreqUnit] = useState(isCustomFreq ? parsedFreq.unit : 'h');

  const isCustomRefresh = !explorerRefreshOptions.find(o => o.value === currentExplorerRefreshSeconds);
  const [refreshType, setRefreshType] = useState(isCustomRefresh ? 'custom' : currentExplorerRefreshSeconds);
  const [customRefreshValue, setCustomRefreshValue] = useState(isCustomRefresh ? currentExplorerRefreshSeconds : 5);

  const isCustomCache = !cacheOptions.find(o => o.value === currentCacheSize);
  const [cacheType, setCacheType] = useState(isCustomCache ? 'custom' : currentCacheSize);
  const defaultCustomCacheGB = isCustomCache ? Math.round(currentCacheSize / 1073741824 * 100) / 100 : 1;
  const [customCacheValue, setCustomCacheValue] = useState(defaultCustomCacheGB);
  const [customCacheUnit, setCustomCacheUnit] = useState('GB');

  useEffect(() => {
    const isCustom = !frequencyOptions.find(o => o.id === currentFrequency);
    setFrequencyType(isCustom ? 'custom' : currentFrequency);
    if (isCustom) {
      const p = parseFrequency(currentFrequency);
      setCustomFreqValue(p.value);
      setCustomFreqUnit(p.unit);
    }
  }, [currentFrequency]);

  useEffect(() => {
    const isCustom = !cacheOptions.find(o => o.value === currentCacheSize);
    setCacheType(isCustom ? 'custom' : currentCacheSize);
    if (isCustom) {
      let val = currentCacheSize;
      if (val % 1073741824 === 0 || val >= 1073741824) {
        setCustomCacheValue(Math.round(val / 1073741824 * 100) / 100);
        setCustomCacheUnit('GB');
      } else {
        setCustomCacheValue(Math.round(val / 1048576 * 100) / 100);
        setCustomCacheUnit('MB');
      }
    }
  }, [currentCacheSize]);

  useEffect(() => {
    const isCustom = !explorerRefreshOptions.find(o => o.value === currentExplorerRefreshSeconds);
    setRefreshType(isCustom ? 'custom' : currentExplorerRefreshSeconds);
    if (isCustom) {
      setCustomRefreshValue(currentExplorerRefreshSeconds);
    }
  }, [currentExplorerRefreshSeconds]);

  const handleFrequencyChange = (type) => {
    setFrequencyType(type);
    if (type !== 'custom') {
      onFrequencyChange?.(type);
    } else {
      onFrequencyChange?.(`${customFreqValue}${customFreqUnit}`);
    }
  };

  const handleCustomFreqChange = (val, unit) => {
    setCustomFreqValue(val);
    setCustomFreqUnit(unit);
    onFrequencyChange?.(`${val}${unit}`);
  };

  const handleRefreshChange = (type) => {
    setRefreshType(type);
    if (type !== 'custom') {
      onExplorerRefreshChange?.(type);
    } else {
      onExplorerRefreshChange?.(customRefreshValue);
    }
  };

  const handleCustomRefreshChange = (val) => {
    const num = parseInt(val, 10);
    setCustomRefreshValue(val);
    if (!isNaN(num) && num > 0) {
      onExplorerRefreshChange?.(num);
    }
  };

  const handleCacheChange = (type) => {
    setCacheType(type);
    if (type !== 'custom') {
      onCacheSizeChange?.(type);
    } else {
      triggerCustomCacheChange(customCacheValue, customCacheUnit);
    }
  };

  const triggerCustomCacheChange = (val, unit) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const multiplier = unit === 'GB' ? 1073741824 : 1048576;
      onCacheSizeChange?.(Math.round(num * multiplier));
    }
  };

  const handleCustomCacheChange = (val, unit) => {
    setCustomCacheValue(val);
    setCustomCacheUnit(unit);
    triggerCustomCacheChange(val, unit);
  };

  const inputStyle = {
    marginLeft: '10px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '4px 8px',
    borderRadius: '4px',
    width: '80px'
  };

  const selectStyle = {
    ...inputStyle,
    width: 'auto',
    marginLeft: '5px'
  };

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
              className={`settings_option_item ${frequencyType === opt.id ? 'active' : ''}`}
              onClick={() => handleFrequencyChange(opt.id)}
            >
              <div className="settings_radio">
                <div className="settings_radio_inner" />
              </div>
              <span className="settings_option_label">{opt.label}</span>
            </div>
          ))}
          <div
            className={`settings_option_item ${frequencyType === 'custom' ? 'active' : ''}`}
            onClick={() => handleFrequencyChange('custom')}
          >
            <div className="settings_radio">
              <div className="settings_radio_inner" />
            </div>
            <span className="settings_option_label" style={{ display: 'flex', alignItems: 'center' }}>
              Свой вариант
              {frequencyType === 'custom' && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    style={inputStyle}
                    value={customFreqValue}
                    onChange={(e) => handleCustomFreqChange(e.target.value, customFreqUnit)}
                  />
                  <select
                    style={selectStyle}
                    value={customFreqUnit}
                    onChange={(e) => handleCustomFreqChange(customFreqValue, e.target.value)}
                  >
                    <option value="s">Секунд</option>
                    <option value="m">Минут</option>
                    <option value="h">Часов</option>
                    <option value="d">Дней</option>
                  </select>
                </div>
              )}
            </span>
          </div>
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
              className={`settings_option_item ${refreshType === opt.value ? 'active' : ''}`}
              onClick={() => handleRefreshChange(opt.value)}
            >
              <div className="settings_radio">
                <div className="settings_radio_inner" />
              </div>
              <span className="settings_option_label">{opt.label}</span>
            </div>
          ))}
          <div
            className={`settings_option_item ${refreshType === 'custom' ? 'active' : ''}`}
            onClick={() => handleRefreshChange('custom')}
          >
            <div className="settings_radio">
              <div className="settings_radio_inner" />
            </div>
            <span className="settings_option_label" style={{ display: 'flex', alignItems: 'center' }}>
              Свой вариант
              {refreshType === 'custom' && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    style={inputStyle}
                    value={customRefreshValue}
                    onChange={(e) => handleCustomRefreshChange(e.target.value)}
                  />
                  <span style={{ marginLeft: '5px' }}>секунд</span>
                </div>
              )}
            </span>
          </div>
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
              className={`settings_option_item ${cacheType === opt.value ? 'active' : ''}`}
              onClick={() => handleCacheChange(opt.value)}
            >
              <div className="settings_radio">
                <div className="settings_radio_inner" />
              </div>
              <span className="settings_option_label">{opt.label}</span>
            </div>
          ))}
          <div
            className={`settings_option_item ${cacheType === 'custom' ? 'active' : ''}`}
            onClick={() => handleCacheChange('custom')}
          >
            <div className="settings_radio">
              <div className="settings_radio_inner" />
            </div>
            <span className="settings_option_label" style={{ display: 'flex', alignItems: 'center' }}>
              Свой вариант
              {cacheType === 'custom' && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    style={inputStyle}
                    value={customCacheValue}
                    onChange={(e) => handleCustomCacheChange(e.target.value, customCacheUnit)}
                  />
                  <select
                    style={selectStyle}
                    value={customCacheUnit}
                    onChange={(e) => handleCustomCacheChange(customCacheValue, e.target.value)}
                  >
                    <option value="MB">МБ</option>
                    <option value="GB">ГБ</option>
                  </select>
                </div>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
