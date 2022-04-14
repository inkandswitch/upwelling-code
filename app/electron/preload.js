const electron = require('electron')

electron.ipcRenderer.on('open-file', (ev, data) => {
  // oops, legacy
  let serialized = Buffer.from(data.buf).toString('base64')
  localStorage.setItem('upwell-.' + data.id, serialized)
  window.location.href = `${data.id}/stack?path=${data.path}`
})
