const { contextBridge, ipcRenderer} = require('electron')

contextBridge.exposeInMainWorld(
	'electron',
	{
		emit: (message, ...args) => { ipcRenderer.send(message, ...args) },
		on: (message, callback) => { ipcRenderer.on(message, callback) }
	}
)
