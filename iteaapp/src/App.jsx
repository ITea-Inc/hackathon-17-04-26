import React from 'react';
import FileExplorer from './components/FileExplorer';
import './App.css';

function App() {
  const dummyFiles = [
    { name: 'Documents', type: 'folder', size: '', modified: '2024-03-15' },
    { name: 'Pictures', type: 'folder', size: '', modified: '2024-03-10' },
    { name: 'Project_Alpha.pdf', type: 'pdf', size: '2.4 MB', modified: '2024-03-16' },
    { name: 'config.json', type: 'json', size: '12 KB', modified: '2024-03-17' },
    { name: 'vacation_photo.jpg', type: 'jpg', size: '4.8 MB', modified: '2024-02-28' },
    { name: 'budget_2024.xlsx', type: 'xlsx', size: '1.1 MB', modified: '2024-03-01' },
    { name: 'Notes.txt', type: 'txt', size: '156 B', modified: '2024-03-18' },
  ];

  return (
    <FileExplorer items={dummyFiles} />
  );
}

export default App;
