const { app, BrowserWindow } = require('electron');
const path = require('path');
require('dotenv').config();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#f7f7f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile('renderer/index.html');
}

app.whenReady().then(() => {
  createWindow();
  require('./src/ipc')(mainWindow);
});

app.on('window-all-closed', () => app.quit());
