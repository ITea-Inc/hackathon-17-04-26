import React from 'react';

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'FUSE-монтирование',
    desc: 'Облачные файлы доступны как обычная папка в файловой системе через FUSE.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
        <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
      </svg>
    ),
    title: 'Гибкая синхронизация',
    desc: 'Три политики: постоянная, по расписанию и ручная. Настраиваемый cron-интервал.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
    title: 'Интеграция с GNOME',
    desc: 'Автоматическое подхватывание акцентного цвета, темы и обоев рабочего стола.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11a9 9 0 0 1 9 9" />
        <path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1" />
      </svg>
    ),
    title: 'Расширение Nautilus',
    desc: 'Контекстное меню «Получить ссылку» для файлов в ~/CloudMount прямо из файлового менеджера.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Офлайн-закрепление',
    desc: 'Пин файлов для гарантированного хранения в локальном кэше даже без интернета.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
    title: 'Публичные ссылки',
    desc: 'Создание share-ссылок на файлы в облаке одним кликом из приложения.',
  },
];

const techStack = [
  { name: 'Java 21 + Spring Boot', color: '#e76f00' },
  { name: 'Electron', color: '#47848f' },
  { name: 'React', color: '#61dafb' },
  { name: 'FUSE (libfuse)', color: '#8cb854' },
  { name: 'WebSocket (STOMP)', color: '#78aeed' },
  { name: 'Яндекс.Диск API', color: '#fc3f1d' },
];

const teamMembers = [
  { name: 'Команда ITea', role: 'Разработка и дизайн' },
];

function AboutPanel() {
  return (
    <div className="accPanel_container" style={{ paddingBottom: '2rem' }}>
      <div className="about_hero">
        <div className="about_logoWrap">
          <img className="about_logo" src="images/logo.png" alt="ITeaCloud" />
        </div>
        <div className="about_heroText">
          <h1 className="about_appName">ITeaCloud</h1>
          <p className="about_version">Версия 0.1.0</p>
          <p className="about_desc">
            Клиент для работы с облачными хранилищами на Linux.
            Монтирует облако как локальную папку, синхронизирует файлы по гибким правилам
            и интегрируется с рабочим окружением GNOME.
          </p>
        </div>
      </div>

      <div className="settings_group" style={{ marginTop: '1.5rem' }}>
        <h2 className="accPanel_sectionTitle">Возможности</h2>
        <div className="about_featuresGrid">
          {features.map((f, i) => (
            <div className="about_featureCard" key={i}>
              <div className="about_featureIcon">{f.icon}</div>
              <div className="about_featureBody">
                <div className="about_featureTitle">{f.title}</div>
                <div className="about_featureDesc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="settings_group" style={{ marginTop: '1.5rem' }}>
        <h2 className="accPanel_sectionTitle">Стек технологий</h2>
        <div className="about_techRow">
          {techStack.map((t, i) => (
            <span className="about_techBadge" key={i} style={{ '--tech-color': t.color }}>
              <span className="about_techDot" />
              {t.name}
            </span>
          ))}
        </div>
      </div>

      <div className="settings_group" style={{ marginTop: '1.5rem' }}>
        <h2 className="accPanel_sectionTitle">Разработка</h2>
        <div className="about_teamRow">
          {teamMembers.map((m, i) => (
            <div className="about_teamMember" key={i}>
              <div className="about_teamAvatar">
                {m.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div className="about_teamName">{m.name}</div>
                <div className="about_teamRole">{m.role}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="about_links">
          <a
            className="about_link"
            href="https://github.com/ITea-Inc/hackathon-17-04-26"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              if (window.require) {
                window.require('electron').shell.openExternal(e.target.href);
              } else {
                window.open(e.target.href, '_blank');
              }
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

export default AboutPanel;
