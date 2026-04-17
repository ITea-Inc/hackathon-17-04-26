const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (isDev) {
    // В режиме разработки подгружаем Vite сервер
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // Раскомментируй, если нужна консоль браузера
  } else {
    // В продакшене грузим собранный статический файл
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
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
