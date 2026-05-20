import React, { useState } from 'react';
import { useDETheme } from '../contexts/DEThemeContext';

const IconAccounts = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconSyncRules = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconAppearance = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const IconActivity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconAbout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const IconDE = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const menuItems = [
  { id: 'accounts',   label: 'Аккаунты',             icon: <IconAccounts /> },
  { id: 'sync-rules', label: 'Правила синхронизации', icon: <IconSyncRules /> },
  { id: 'activity',   label: 'Журнал',               icon: <IconActivity /> },
  { id: 'appearance', label: 'Оформление',           icon: <IconAppearance /> },
  { id: 'settings',   label: 'Настройки',            icon: <IconSettings /> },
  { id: 'about',      label: 'О программе',          icon: <IconAbout /> },
];

function MainMenu({ activeItem: controlledActive, onItemClick, isSyncing, activityCount = 0 }) {
  const [internalActive, setInternalActive] = useState('accounts');
  const activeItem = controlledActive ?? internalActive;
  const { deTheme, cycleTheme } = useDETheme();

  const handleClick = (id) => {
    setInternalActive(id);
    onItemClick?.(id);
  };

  return (
    <aside className="mainMenu_sidebar">
      <div className="mainMenu_logoBlock">
        <div className="mainMenu_logoIcon">
          <img className="mainLogo" src="images/logo.png" alt="logo" />
        </div>
        <span className="mainMenu_logoText">ITeaCloud</span>
      </div>

      <nav className="mainMenu_nav">
        <ul className="mainMenu_navList">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                className={'mainMenu_navItem' + (activeItem === item.id ? ' mainMenu_navItem--active' : '')}
                onClick={() => handleClick(item.id)}
              >
                <span className="mainMenu_navIcon">{item.icon}</span>
                <span className="mainMenu_navLabel">{item.label}</span>
                {item.id === 'activity' && activityCount > 0 && (
                  <span className="mainMenu_badge">{activityCount > 99 ? '99+' : activityCount}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mainMenu_spacer" />

      {isSyncing && (
        <div className="mainMenu_syncStatus">
          <span className="mainMenu_syncDot" />
          <span className="mainMenu_syncLabel">Синхронизация...</span>
        </div>
      )}

      <button 
        className="de_toggle_btn" 
        onClick={cycleTheme}
        title={`Текущее: ${deTheme === 'gnome' ? 'GNOME' : 'Hyprland'} (Ctrl+Shift+D)`}
      >
        <IconDE />
        <span className="de_toggle_label">
          {deTheme === 'gnome' ? 'GNOME' : 'Hyprland'}
        </span>
      </button>
    </aside>
  );
}

export default MainMenu;
