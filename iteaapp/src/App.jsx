import React from 'react';
import MainMenu from './components/MainMenu';
import AccountsPanel from './components/AccountsPanel';
import './App.css';

function App() {
  return (
    <div className="app_layout">
      <MainMenu />
      <AccountsPanel />
    </div>
  );
}

export default App;

