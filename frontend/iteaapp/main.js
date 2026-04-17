const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { execSync } = require('child_process');

// Menu.setApplicationMenu(null);

const isDev = process.env.NODE_ENV !== 'production';

/* ---- GNOME accent color ---- */
function getGnomeAccentColor() {
  const colorMap = {
    blue: '#78aeed',
    teal: '#4a9a8e',
    green: '#8cb854',
    yellow: '#d4a54a',
    orange: '#e5843a',
    red: '#e55c5c',
    pink: '#d56199',
    purple: '#9141ac',
    slate: '#6f8396',
    bark: '#b27b4f',
    sage: '#6f8372',
    lavender: '#9141ac',
    magenta: '#d56199',
  };

  try {
    const result = execSync('gsettings get org.gnome.desktop.interface accent-color 2>/dev/null', { stdio: 'pipe' })
      .toString().trim().replace(/'/g, '');
    if (result) {
      if (colorMap[result]) return colorMap[result];
    }
  } catch (e) {}

  try {
    const theme = execSync('gsettings get org.gnome.desktop.interface gtk-theme 2>/dev/null', { stdio: 'pipe' })
      .toString().trim().replace(/'/g, '');
    if (theme) {
      const match = theme.match(/[Yy]aru-(\w+)/);
      if (match) {
        const colorName = match[1].replace(/-?dark$/, '').replace(/-?light$/, '');
        if (colorMap[colorName]) return colorMap[colorName];
      }
    }
  } catch (e) {}

  return '#78aeed';
}

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 650,
    icon: path.join(__dirname, 'public/images/logo.png'), // <-- Укажите путь к вашей иконке здесь
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

  const accent = getGnomeAccentColor();
  const accentCSS = `:root { --gnome-accent: ${accent} !important; }`;

  win.webContents.on('dom-ready', () => {
    win.webContents.insertCSS(accentCSS);
  });

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
