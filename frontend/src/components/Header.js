import React from 'react';

const Header = () => {
  return (
    <header className="flex items-center justify-between p-2 hacker-border" style={{ borderBottomWidth: 'var(--border-width)' }}>
      <div className="logo flex items-center gap-2">
        <div className="p-1 hacker-border" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>ITea streaming</div>
        <span style={{ fontSize: '0.8rem' }}>// STREAMING_SERVICE_V1.0</span>
      </div>
      <div className="search-bar" style={{ flex: 0.5 }}>
        <input type="text" className="hacker-input" style={{ width: '100%' }} placeholder="SEARCH_CHANNELS..." />
      </div>
      <div className="user-actions flex items-center gap-2">
        <button className="hacker-button">LOG_IN</button>
        <button className="hacker-button">SIGN_UP</button>
      </div>
    </header>
  );
};

export default Header;
