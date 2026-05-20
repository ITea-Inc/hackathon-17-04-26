import React from 'react';

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconError = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconBell = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.15 }}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

function formatTime(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(ts) {
  const d = new Date(ts);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function groupByDate(entries) {
  const groups = {};
  for (const entry of entries) {
    const d = new Date(entry.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups[key]) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let label;
      if (d.toDateString() === today.toDateString()) {
        label = 'Сегодня';
      } else if (d.toDateString() === yesterday.toDateString()) {
        label = 'Вчера';
      } else {
        label = formatDate(entry.timestamp);
      }
      groups[key] = { label, entries: [] };
    }
    groups[key].entries.push(entry);
  }
  return Object.values(groups);
}

function ActivityPanel({ activityLog = [], onClear }) {
  const sortedLog = [...activityLog].reverse();
  const groups = groupByDate(sortedLog);

  return (
    <div className="accPanel_container" style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 className="accPanel_title">Журнал</h1>
        {activityLog.length > 0 && (
          <button className="accPanel_actionBtn" onClick={onClear}>
            Очистить
          </button>
        )}
      </div>
      <p className="accPanel_subtitle">
        История событий синхронизации.
      </p>

      {activityLog.length === 0 ? (
        <div className="activity_empty">
          <IconBell />
          <div className="activity_emptyText">Нет событий</div>
          <div className="activity_emptyHint">
            События синхронизации будут отображаться здесь по мере их появления.
          </div>
        </div>
      ) : (
        <div className="activity_list">
          {groups.map((group, gi) => (
            <div key={gi}>
              <div className="activity_dateLabel">{group.label}</div>
              {group.entries.map((entry) => (
                <div className={`activity_item activity_item--${entry.type}`} key={entry.id}>
                  <div className="activity_itemIcon">
                    {entry.type === 'done' ? <IconCheck /> : <IconError />}
                  </div>
                  <div className="activity_itemBody">
                    <div className="activity_itemTitle">
                      {entry.type === 'done' ? 'Синхронизация завершена' : 'Ошибка синхронизации'}
                    </div>
                    <div className="activity_itemPath">{entry.event.path}</div>
                    {entry.type === 'done' && entry.event.data && (
                      <div className="activity_itemDetail">
                        {entry.event.path?.endsWith('/') || (entry.event.data.fileCount === 0 && entry.event.data.cached === 0) ? (
                          entry.event.data.fileCount > 0 
                            ? `Папка закэширована (${entry.event.data.cached} из ${entry.event.data.fileCount} файлов)`
                            : 'Папка закэширована'
                        ) : (
                          `${entry.event.data.cached} из ${entry.event.data.fileCount} файлов закэшировано`
                        )}
                      </div>
                    )}
                    {entry.type === 'error' && entry.event.data?.message && (
                      <div className="activity_itemDetail">{entry.event.data.message}</div>
                    )}
                  </div>
                  <div className="activity_itemTime">{formatTime(entry.timestamp)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActivityPanel;
