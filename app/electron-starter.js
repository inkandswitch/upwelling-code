// Modules to control application life and create native browser window
const electron = require('electron')

let window = null

function createWindow(id = '') {
  // Create the browser window.
  const window = new electron.BrowserWindow({
    width: 1250,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
    },
  })

  // and load the index.html of the app.
  window.loadURL('http://localhost:3000/' + id)

  // Open the DevTools.
  window.webContents.openDevTools()
  return window
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electron.app.whenReady().then(() => {
  window = createWindow()

  electron.app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
electron.app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') electron.app.quit()
})

function newFile() {
  createWindow('new')
}

async function open() {
  let result = await dialog.showOpenDialog(window, {
    filters: [{ extensions: ['.upwell'], name: 'Upwell' }],
  })
  let path = result.filePaths && result.filePaths[0]
  if (path) {
    createWindow('?path=' + path)
  }
}

async function save() {
  let result = await dialog.showSaveDialog(window, {})
  let path = result.filePath
  if (path) {
    let url = window.webContents.url
    window.webContents.loadURL(url + '/download')
  }
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
const { app, Menu } = require('electron')
const { dialog } = require('electron/main')

const isMac = process.platform === 'darwin'

const template = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
      ]
    : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      {
        label: 'New',
        role: 'new',
        click: () => {
          newFile()
        },
      },
      {
        label: 'Open',
        role: 'open',
        click: () => {
          open()
        },
      },
      {
        label: 'Save',
        role: 'save',
        click: () => {
          save()
        },
      },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac
        ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
            },
          ]
        : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
    ],
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac
        ? [
            { type: 'separator' },
            { role: 'front' },
            { type: 'separator' },
            { role: 'window' },
          ]
        : [{ role: 'close' }]),
    ],
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://inkandswitch.com')
        },
      },
    ],
  },
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
