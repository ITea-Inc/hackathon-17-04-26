import React, { useState } from 'react';

const API_BASE = 'http://localhost:8080';

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']);
const textExtensions = new Set(['txt', 'md', 'json', 'xml', 'yaml', 'yml', 'csv', 'log', 'ini', 'conf', 'cfg']);
const codeExtensions = new Set(['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'go', 'rs', 'rb', 'php', 'css', 'html', 'sh', 'bash', 'sql']);
const videoExtensions = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov']);
const audioExtensions = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac']);
const archiveExtensions = new Set(['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar']);
const docExtensions = new Set(['pdf', 'doc', 'docx', 'odt', 'rtf']);
const sheetExtensions = new Set(['xls', 'xlsx', 'ods']);
const presExtensions = new Set(['ppt', 'pptx', 'odp']);

function getFileCategory(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (imageExtensions.has(ext)) return 'image';
  if (textExtensions.has(ext) || codeExtensions.has(ext)) return 'text';
  if (videoExtensions.has(ext)) return 'video';
  if (audioExtensions.has(ext)) return 'audio';
  if (archiveExtensions.has(ext)) return 'archive';
  if (docExtensions.has(ext)) return 'document';
  if (sheetExtensions.has(ext)) return 'spreadsheet';
  if (presExtensions.has(ext)) return 'presentation';
  return 'file';
}

function getExtension(name) {
  return (name || '').split('.').pop().toLowerCase();
}

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Б';
  if (!bytes) return '—';
  const k = 1024;
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const CategoryIcon = ({ category }) => {
  const iconProps = { width: 32, height: 32, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };

  switch (category) {
    case 'image':
      return (
        <svg {...iconProps}>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    case 'video':
      return (
        <svg {...iconProps}>
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    case 'audio':
      return (
        <svg {...iconProps}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'text':
      return (
        <svg {...iconProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'archive':
      return (
        <svg {...iconProps}>
          <path d="M21 8v13H3V8" />
          <path d="M1 3h22v5H1z" />
          <path d="M10 12h4" />
        </svg>
      );
    case 'document':
      return (
        <svg {...iconProps}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
      );
  }
};

const FolderIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M10 4H4C2.895 4 2 4.895 2 6V18C2 19.105 2.895 20 4 20H20C21.105 20 22 19.105 22 18V8C22 6.895 21.105 6 20 6H12L10 4Z" fill="#e8a33d" />
  </svg>
);

function FilePreviewPanel({ file, accountId, onClose }) {
  const [shareUrl, setShareUrl] = useState(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const isFolder = file.directory === true;
  const category = isFolder ? 'folder' : getFileCategory(file.name);
  const ext = getExtension(file.name);
  const isImage = category === 'image';

  const handleShare = () => {
    if (!accountId || !file.fullPath) return;
    setShareLoading(true);
    setShareError(null);
    setShareUrl(null);

    fetch(`${API_BASE}/api/share/${accountId}?path=${encodeURIComponent(file.fullPath)}`, {
      method: 'POST',
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setShareUrl(data.url);
        setShareLoading(false);
      })
      .catch(err => {
        setShareError(err.message);
        setShareLoading(false);
      });
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const categoryLabels = {
    folder: 'Папка', image: 'Изображение', video: 'Видео', audio: 'Аудио',
    text: 'Текстовый файл', archive: 'Архив', document: 'Документ',
    spreadsheet: 'Таблица', presentation: 'Презентация', file: 'Файл',
  };

  return (
    <div className="preview_panel">
      <div className="preview_header">
        <span className="preview_headerTitle">Свойства</span>
        <button className="preview_closeBtn" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="preview_body">
        <div className="preview_iconArea">
          {isImage ? (
            <div className="preview_thumbnail">
              <img
                src={`${API_BASE}/api/files/${accountId}/preview?path=${encodeURIComponent(file.fullPath)}`}
                alt={file.name}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <div className="preview_thumbFallback" style={{ display: 'none' }}>
                <CategoryIcon category={category} />
              </div>
            </div>
          ) : (
            <div className="preview_fileIcon">
              {isFolder ? <FolderIcon /> : <CategoryIcon category={category} />}
            </div>
          )}
        </div>

        <div className="preview_fileName">{file.name}</div>

        <div className="preview_meta">
          <div className="preview_metaRow">
            <span className="preview_metaLabel">Тип</span>
            <span className="preview_metaValue">
              {categoryLabels[category] || 'Файл'}
              {!isFolder && ext ? ` (.${ext})` : ''}
            </span>
          </div>
          {!isFolder && (
            <div className="preview_metaRow">
              <span className="preview_metaLabel">Размер</span>
              <span className="preview_metaValue">{formatSize(file.size)}</span>
            </div>
          )}
          <div className="preview_metaRow">
            <span className="preview_metaLabel">Изменён</span>
            <span className="preview_metaValue">{formatDate(file.lastModified)}</span>
          </div>
          <div className="preview_metaRow">
            <span className="preview_metaLabel">Путь</span>
            <span className="preview_metaValue preview_metaValue--path">{file.fullPath}</span>
          </div>
        </div>

        <div className="preview_actions">
          {!shareUrl ? (
            <button
              className="preview_shareBtn"
              onClick={handleShare}
              disabled={shareLoading}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              {shareLoading ? 'Создание ссылки...' : 'Поделиться ссылкой'}
            </button>
          ) : (
            <div className="preview_shareResult">
              <input
                className="preview_shareInput"
                value={shareUrl}
                readOnly
                onClick={(e) => e.target.select()}
              />
              <button className="preview_copyBtn" onClick={handleCopy}>
                {copied ? '✓' : 'Копировать'}
              </button>
            </div>
          )}
          {shareError && (
            <div className="preview_shareError">⚠ {shareError}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FilePreviewPanel;
