import React from 'react';
import FileItem from './FileItem';

const FileExplorer = ({ items }) => {
  return (
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
  );
};

export default FileExplorer;
