const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let store;
let mainWindow;

function getDataPath() {
  return path.join(app.getPath('userData'), 'mrdpstock-data.json');
}

function readData() {
  try {
    const p = getDataPath();
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch(e) {}
  return {};
}

function writeData(data) {
  try {
    fs.writeFileSync(getDataPath(), JSON.stringify(data), 'utf8');
    return true;
  } catch(e) { return false; }
}

// Storage IPC handlers
ipcMain.handle('storage-get', (event, key, shared) => {
  const data = readData();
  const k = (shared ? 'shared_' : 'user_') + key;
  if (data[k] === undefined) throw new Error('Key not found: ' + key);
  return { key, value: data[k], shared: !!shared };
});

ipcMain.handle('storage-set', (event, key, value, shared) => {
  const data = readData();
  const k = (shared ? 'shared_' : 'user_') + key;
  data[k] = value;
  writeData(data);
  return { key, value, shared: !!shared };
});

ipcMain.handle('storage-delete', (event, key, shared) => {
  const data = readData();
  const k = (shared ? 'shared_' : 'user_') + key;
  delete data[k];
  writeData(data);
  return { key, deleted: true, shared: !!shared };
});

ipcMain.handle('storage-list', (event, prefix, shared) => {
  const data = readData();
  const pfx = (shared ? 'shared_' : 'user_') + (prefix || '');
  const keys = Object.keys(data)
    .filter(k => k.startsWith(pfx))
    .map(k => k.replace(/^(shared_|user_)/, ''));
  return { keys, prefix: prefix || '', shared: !!shared };
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'MRDPSTOCK',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#f9fafb',
    show: false,
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
