import React from 'react';
import FileItem from './FileItem';

const FileExplorer = ({ items }) => {
  return (
    <div className="app-main">
      <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '3rem' }}>
        <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: '800', margin: 0 }}>My Files</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Modern Desktop File Management</p>
      </div>
      <div className="explorer-container">
      <div className="explorer-header">
        <div className="header-name">Name</div>
        <div className="header-type">Type</div>
        <div className="header-size">Size</div>
        <div className="header-modified">Modified</div>
      </div>
      <div className="explorer-list">
        {items.map((item, index) => (
          <FileItem key={index} {...item} />
        ))}
      </div>
    </div>
    </div>
  );
};

export default FileExplorer;
