// Modules to control application life and create native browser window
const electron = require('electron')
const fs = require('fs')
const path = require('path')
const { createAuthorId, Upwell } = require('api')
const server = require('./server')

let port = 5001
server.listen(port, () => {
  console.log('listening on http://localhost:' + port)
})

let window = null

function createWindow(id = '') {
  // Create the browser window.
  const window = new electron.BrowserWindow({
    width: 1250,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
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
  if (process.platform !== 'darwin') {
    server.close()
    electron.app.quit()
  }
})

function newFile() {
  window = createWindow('new')
}

async function open() {
  let window = electron.BrowserWindow.getFocusedWindow()
  let result = await electron.dialog.showOpenDialog(window, {
    filters: [{ extensions: ['.upwell'], name: 'Upwell' }],
  })
  let path = result.filePaths && result.filePaths[0]
  if (path) {
    let opened = createWindow('?path=' + path)
    let buf = fs.readFileSync(path)
    let stream = fs.createReadStream(path)
    Upwell.deserialize(stream, { id: createAuthorId(), name: 'system' }).then(
      (item) => {
        opened.webContents.send('open-file', {
          id: item.id,
          buf,
          path,
        })
      }
    )
  }
}

async function save() {
  let window = electron.BrowserWindow.getFocusedWindow()
  let url = window.webContents.getURL()
  window.webContents.loadURL(url + '#download')
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
const isMac = process.platform === 'darwin'

const template = [
  // { role: 'appMenu' }
  ...(isMac
    ? [
        {
          label: electron.app.name,
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
        label: 'Save as...',
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

const menu = electron.Menu.buildFromTemplate(template)
electron.Menu.setApplicationMenu(menu)
