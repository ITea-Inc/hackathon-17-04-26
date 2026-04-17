const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { execSync } = require('child_process');

Menu.setApplicationMenu(null);

const isDev = process.env.NODE_ENV !== 'production';

/* ---- GNOME accent color ---- */
function getGnomeAccentColor() {
  const colorMap = {
    blue:   '#78aeed',
    teal:   '#4a9a8e',
    green:  '#8cb854',
    yellow: '#d4a54a',
    orange: '#e5843a',
    red:    '#e55c5c',
    pink:   '#d56199',
    purple: '#9141ac',
    slate:  '#6f8396',
  };
  try {
    const result = execSync('gsettings get org.gnome.desktop.interface accent-color')
      .toString().trim().replace(/'/g, '');
    return colorMap[result] || '#78aeed';
  } catch {
    return '#78aeed';
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Inject GNOME accent color as CSS variable
  const accent = getGnomeAccentColor();
  const accentCSS = `:root { --gnome-accent: ${accent} !important; }`;

  // insertCSS is the most reliable way — survives HMR reloads
  win.webContents.on('dom-ready', () => {
    win.webContents.insertCSS(accentCSS);
  });

  // Also inject on any navigation (Vite HMR sometimes triggers this)
  win.webContents.on('did-navigate-in-page', () => {
    win.webContents.insertCSS(accentCSS);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
