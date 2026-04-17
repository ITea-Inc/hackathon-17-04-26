import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Привет из Electron + React!</h1>
      <p>
        <button onClick={() => setCount((c) => c + 1)}>Счетчик: {count}</button>
      </p>
      <p>Отредактируй <code>src/App.jsx</code> и сохрани для проверки HMR (hot module replacement).</p>
    </div>
  );
}

export default App;
