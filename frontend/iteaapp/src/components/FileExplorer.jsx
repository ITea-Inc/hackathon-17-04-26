import React from 'react';
import FileItem from './FileItem';

const fetchFiles = () => {
  fetch(`http://localhost:8080/api/files/705962e5-a5d1-4a6b-b3c6-7e9882430927?path=/`)
    .then(res => {
      if (!res.ok) throw new Error(`Ошибка ${res.status}`);
      return res;
    })
};

const FileExplorer = ({ items, onSyncChange, onFolderClick }) => {
  console.log(fetchFiles());
  return (
    <div className="explorer-container">
      <div className="explorer-header">
        <div className="header-name">Name</div>
        <div className="header-type">Type</div>
        <div className="header-size">Size</div>
        <div className="header-modified">Modified</div>
        <div className="header-sync">Sync</div>
      </div>
      <div className="explorer-list">
        {items.map((item, index) => (
          <FileItem key={index} {...item} onSyncChange={onSyncChange} onFolderClick={onFolderClick} />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
