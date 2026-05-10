import React, { useEffect, useState } from 'react';

const themeOptions = [
  { id: 'system', label: 'Системная' },
  { id: 'light', label: 'Светлая' },
  { id: 'dark', label: 'Темная' },
];

const accentOptions = [
  { id: 'system', label: 'Системный', value: 'var(--gnome-accent, #78aeed)' },
  { id: 'blue', label: 'Синий', value: '#3584e4' },
  { id: 'teal', label: 'Бирюзовый', value: '#26a269' },
  { id: 'green', label: 'Зеленый', value: '#33d17a' },
  { id: 'yellow', label: 'Желтый', value: '#f6d32d' },
  { id: 'orange', label: 'Оранжевый', value: '#ff7800' },
  { id: 'red', label: 'Красный', value: '#e01b24' },
  { id: 'pink', label: 'Розовый', value: '#f66151' },
  { id: 'purple', label: 'Фиолетовый', value: '#9141ac' },
  { id: 'slate', label: 'Серый', value: '#77767b' },
];

function AppearancePanel() {
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'system');
  const [accent, setAccent] = useState(localStorage.getItem('app-accent') || 'system');
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  
  const [useCustomColors, setUseCustomColors] = useState(localStorage.getItem('app-use-custom-colors') === 'true');
  const [customBg, setCustomBg] = useState(localStorage.getItem('app-custom-bg') || '');
  const [customAccent, setCustomAccent] = useState(localStorage.getItem('app-custom-hex-accent') || '');

  const fetchWallpaper = () => {
    try {
      if (window.require) {
        const { execSync } = window.require('child_process');
        const fs = window.require('fs');
        const crypto = window.require('crypto');
        const os = window.require('os');
        const path = window.require('path');

        const uri = execSync('gsettings get org.gnome.desktop.background picture-uri').toString().trim().replace(/^'|'$/g, '');
        let filePath = uri.replace('file://', '');
        
        let targetFileUri = uri;

        if (filePath.endsWith('.xml')) {
          if (fs.existsSync(filePath)) {
            const xml = fs.readFileSync(filePath, 'utf8');
            const match = xml.match(/<file>([^<]+)<\/file>/);
            if (match && match[1]) {
              filePath = match[1];
              targetFileUri = `file://${filePath}`;
            }
          }
        }
        
        const getThumbnailPath = (fileUri) => {
           const md5 = crypto.createHash('md5').update(fileUri).digest('hex');
           const thumbLarge = path.join(os.homedir(), '.cache/thumbnails/large', `${md5}.png`);
           const thumbNormal = path.join(os.homedir(), '.cache/thumbnails/normal', `${md5}.png`);
           if (fs.existsSync(thumbLarge)) return thumbLarge;
           if (fs.existsSync(thumbNormal)) return thumbNormal;
           return null;
        };

        let thumbPath = getThumbnailPath(uri) || getThumbnailPath(targetFileUri);
        let finalPathToLoad = thumbPath || filePath;

        if (fs.existsSync(finalPathToLoad)) {
          const ext = finalPathToLoad.split('.').pop().toLowerCase();
          const base64 = fs.readFileSync(finalPathToLoad).toString('base64');
          let mimeType = 'image/jpeg';
          if (ext === 'png') mimeType = 'image/png';
          else if (ext === 'jxl') mimeType = 'image/jxl';
          else if (ext === 'webp') mimeType = 'image/webp';
          
          setWallpaperUrl(`data:${mimeType};base64,${base64}`);
        }
      }
    } catch(e) {
      console.log('Failed to fetch gnome wallpaper', e);
    }
  };

  useEffect(() => {
    fetchWallpaper();
    
    let monitor;
    if (window.require) {
      const { spawn } = window.require('child_process');
      try {
        monitor = spawn('gsettings', ['monitor', 'org.gnome.desktop.background']);
        
        // Debounce fetching slightly because GNOME sometimes emits multiple events rapidly
        let timeoutId;
        monitor.stdout.on('data', () => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fetchWallpaper(), 300);
        });
      } catch (e) {
        console.error('Failed to start gsettings monitor', e);
      }
    }

    return () => {
      if (monitor) monitor.kill();
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('app-accent', accent);
    localStorage.setItem('app-custom-hex-accent', customAccent);
    localStorage.setItem('app-use-custom-colors', useCustomColors);
    
    if (useCustomColors && customAccent) {
      document.documentElement.style.setProperty('--custom-accent', customAccent);
    } else {
      const selectedAccent = accentOptions.find(opt => opt.id === accent)?.value;
      if (selectedAccent && accent !== 'system') {
        document.documentElement.style.setProperty('--custom-accent', selectedAccent);
      } else {
        document.documentElement.style.removeProperty('--custom-accent');
      }
    }
  }, [accent, customAccent, useCustomColors]);

  useEffect(() => {
    localStorage.setItem('app-custom-bg', customBg);
    if (useCustomColors && customBg) {
      document.documentElement.style.setProperty('--custom-bg', customBg);
      document.documentElement.classList.add('custom-bg-active');
    } else {
      document.documentElement.style.removeProperty('--custom-bg');
      document.documentElement.classList.remove('custom-bg-active');
    }
  }, [customBg, useCustomColors]);

  const bgStyle = wallpaperUrl ? { 
    backgroundImage: `url("${wallpaperUrl}"), url('/images/cloud.jpg'), linear-gradient(135deg, #2a5298 0%, #1e3c72 100%)`,
    backgroundBlendMode: 'normal, overlay, normal'
  } : {};

  return (
    <div className="accPanel_container" style={{ paddingBottom: '2rem' }}>
      <h1 className="accPanel_title">Оформление</h1>

      <div className="settings_group">
        <h2 className="accPanel_sectionTitle">Стиль</h2>
        <p className="settings_description">
          Выберите тему внешнего вида приложения.
        </p>

        <div className="theme_picker">
          {themeOptions.map((opt) => (
            <div
              key={opt.id}
              className={`theme_card ${theme === opt.id ? 'active' : ''}`}
              onClick={() => setTheme(opt.id)}
            >
              <div className={`theme_preview theme_preview--${opt.id}`} style={bgStyle}>
                <div className="theme_window_mock theme_window_mock--back">
                  <div className="theme_window_header"></div>
                </div>
                <div className="theme_window_mock theme_window_mock--front">
                  <div className="theme_window_header"></div>
                </div>
              </div>
              <span className="theme_label">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="settings_group" style={{ marginTop: '2.5rem' }}>
        <h2 className="accPanel_sectionTitle">Акцентный цвет</h2>
        <p className="settings_description">
          Выберите цвет для выделения активных элементов.
        </p>

        <div className="accent_picker">
          {accentOptions.map((opt) => (
            <div 
              key={opt.id}
              className={`accent_circle_wrapper ${accent === opt.id && !customAccent ? 'active' : ''}`}
              onClick={() => { setAccent(opt.id); setCustomAccent(''); }}
              title={opt.label}
            >
              <div 
                className="accent_circle" 
                style={{ 
                  background: opt.value,
                  boxShadow: opt.id === 'system' ? 'inset 0 0 0 1px rgba(0,0,0,0.2)' : 'none'
                }} 
              >
                {opt.id === 'system' && (
                  <div style={{ width: '100%', height: '100%', borderRadius: 'inherit', background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 100%)' }} />
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '30px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={useCustomColors} 
              onChange={(e) => setUseCustomColors(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 500 }}>
              Использовать дополнительные цвета
            </span>
          </label>
        </div>

        {useCustomColors && (
          <div className="settings_info_box" style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Свой акцентный цвет (HEX)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Переопределяет системные или выбранные выше цвета. Оставьте пустым для сброса.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="color" 
                  value={customAccent || '#78aeed'} 
                  onChange={(e) => setCustomAccent(e.target.value)}
                  style={{ width: '32px', height: '32px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
                <input 
                  type="text" 
                  value={customAccent} 
                  onChange={(e) => setCustomAccent(e.target.value)}
                  placeholder="#HEX"
                  style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>Свой цвет фона (HEX)</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Переопределяет цвет фона всего приложения. Оставьте пустым для сброса.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="color" 
                  value={customBg || '#242424'} 
                  onChange={(e) => setCustomBg(e.target.value)}
                  style={{ width: '32px', height: '32px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
                <input 
                  type="text" 
                  value={customBg} 
                  onChange={(e) => setCustomBg(e.target.value)}
                  placeholder="#HEX"
                  style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AppearancePanel;
