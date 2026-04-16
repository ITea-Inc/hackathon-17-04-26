import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HomeView from './views/HomeView';
import StreamView from './views/StreamView';

function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' or 'stream'

  return (
    <div className="app-container flex flex-col" style={{ minHeight: '100vh' }}>
      <Header />
      <div className="main-layout flex" style={{ flex: 1 }}>
        <Sidebar onViewChange={setCurrentView} />
        <main className="content-area" style={{ flex: 1, overflowY: 'auto' }}>
          {currentView === 'home' ? (
            <HomeView onStreamSelect={() => setCurrentView('stream')} />
          ) : (
            <StreamView onBack={() => setCurrentView('home')} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
