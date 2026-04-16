import React from 'react';

const Sidebar = ({ onViewChange }) => {
  const channels = [
    { name: 'NullPointer', category: 'C++', viewers: '1.2k', status: 'LIVE' },
    { name: 'BinaryBoi', category: 'Rust', viewers: '850', status: 'LIVE' },
    { name: 'KernelPanic', category: 'Kernel Dev', viewers: '3.4k', status: 'LIVE' },
    { name: 'AssemblyWhiz', category: 'Reverse Engineering', viewers: '120', status: 'LIVE' },
  ];

  return (
    <aside className="hacker-border p-2 flex flex-col gap-2" style={{ width: '250px', borderRightWidth: 'var(--border-width)', borderTop: 'none', borderBottom: 'none' }}>
      <div className="nav-links flex flex-col gap-1">
        <button className="hacker-button" style={{ textAlign: 'left' }} onClick={() => onViewChange('home')}>[ HOME ]</button>
        <button className="hacker-button" style={{ textAlign: 'left' }}>[ BROWSE ]</button>
        <button className="hacker-button" style={{ textAlign: 'left' }}>[ FOLLOWING ]</button>
      </div>

      <div style={{ marginTop: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>FOLLOWED_CHANNELS:</div>
      <div className="channels-list flex flex-col gap-1">
        {channels.map((ch, i) => (
          <div key={i} className="p-1 hacker-border flex flex-col" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
            <div className="flex justify-between items-center">
              <span>{ch.name}</span>
              <span style={{ color: 'red' }}>● {ch.status}</span>
            </div>
            <div className="flex justify-between" style={{ opacity: 0.7 }}>
              <span>{ch.category}</span>
              <span>{ch.viewers}</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
