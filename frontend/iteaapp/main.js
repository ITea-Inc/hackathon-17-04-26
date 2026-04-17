const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { execSync } = require('child_process');

let mainWindow;
let tray;

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
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    icon: path.join(__dirname, 'public/images/logo.png'), // <-- Укажите путь к вашей иконке здесь
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  const accent = getGnomeAccentColor();
  const accentCSS = `:root { --gnome-accent: ${accent} !important; }`;

  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.insertCSS(accentCSS);
  });

  mainWindow.webContents.on('did-navigate-in-page', () => {
    mainWindow.webContents.insertCSS(accentCSS);
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'public', 'images', 'logo.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open App', 
      click: () => {
        mainWindow.show();
      } 
    },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuiting = true;
        app.quit();
      } 
    }
  ]);

  tray.setToolTip('ITea App');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
}

function setupLocalServer() {
  const http = require('http');
  const server = http.createServer((req, res) => {
    // Разрешаем CORS (на всякий случай)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Ответ для "пинга" (расширение Nautilus проверяет, запущено ли приложение)
    if (req.method === 'GET' && req.url === '/api/ping') {
      res.writeHead(200);
      res.end('pong');
      return;
    }

    // Обработка клика "Получить ссылку" в Наутилус
    if (req.method === 'POST' && req.url === '/api/share-from-nautilus') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        const params = new URLSearchParams(body);
        const filePath = params.get('file_path');
        
        console.log('\n[Nautilus Hook] Пользователь хочет поделиться файлом:', filePath);
        // TODO: Чуть позже мы заставим Electron послать это событие в React Frontend
        
        res.writeHead(200);
        res.end('Shared');
      });
      return;
    }
    
    res.writeHead(404);
    res.end();
  });

  // Слушаем порт 5174, который мы указали в нашем Python-коде
  server.listen(5174, '127.0.0.1', () => {
    console.log('[Local Server] Слушаем команды от Nautilus на порту 5174');
  });
}

app.whenReady().then(() => {
  createWindow();
  setupLocalServer(); // <-- Запускаем сервер при старте
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
