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

  // 1) GNOME 47+: accent-color
  try {
    const result = execSync('gsettings get org.gnome.desktop.interface accent-color 2>/dev/null', { stdio: 'pipe' })
      .toString().trim().replace(/'/g, '');
    if (result) {
      console.log('[Accent] GNOME accent-color:', result);
      if (colorMap[result]) return colorMap[result];
    }
  } catch (e) {
    // Silently ignore "No such key" on older GNOME
  }

  // 2) Ubuntu Yaru: accent color from theme name (e.g. Yaru-purple-dark)
  try {
    const theme = execSync('gsettings get org.gnome.desktop.interface gtk-theme 2>/dev/null', { stdio: 'pipe' })
      .toString().trim().replace(/'/g, '');
    if (theme) {
      console.log('[Accent] GTK theme:', theme);
      const match = theme.match(/[Yy]aru-(\w+)/);
      if (match) {
        const colorName = match[1].replace(/-?dark$/, '').replace(/-?light$/, '');
        console.log('[Accent] Yaru color extracted:', colorName);
        if (colorMap[colorName]) return colorMap[colorName];
      }
    }
  } catch (e) {
  }

  console.log('[Accent] Using fallback blue');
  return '#78aeed'; // Adwaita blue fallback
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
