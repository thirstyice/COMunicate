const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const SerialPort = require("serialport");
var port = new SerialPort("/dev/null", { autoOpen: false });
var eol = "";
var encoding="utf-8";

function createTerminalWindow() {
	const terminalWindow = new BrowserWindow({
		show: false,
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(app.getAppPath(), "preload.js")
		}
	})
	terminalWindow.loadFile('public/index.html')
	terminalWindow.once('ready-to-show', () => {
		terminalWindow.show()
	})
}
ipcMain.on("getPortList", (event) => {
	SerialPort.list()
	.then((ports) => {
		event.reply("setPortList", ports);
	})
});

ipcMain.on("connect", (event, options) => {
	function openPort() {
		port = new SerialPort(options.port, {
			baudRate: parseInt(options.speed),
			dataBits: parseInt(options.dataBits),
			stopBits: parseInt(options.stopBits),
			parity: options.parity.toLowerCase(),
			rtscts: options.flow.toString().toLowerCase().includes("rts/cts"),
			xon: options.flow.toLowerCase().includes("xon"),
			xoff: options.flow.toLowerCase().includes("xoff"),
		})
		encoding=options.encoding;
		port.on("error", (error) => {
			console.warn(error);
			event.reply("error", error);
		})
		port.on("open", (error) => {
			if (error) {
				console.warn(error);
				event.reply("error", error);
			} else {
				event.reply("connected");
			}
		});
		port.on("data", (data) => {
			event.reply("recieved", data.toString(encoding));
		})
		eol=(options.eol.match("CR")?"\r":"")+(options.eol.match("LF")?"\n":"");
	}
	if (port.isOpen) {
		port.close((error)=> {
			if (error) {
				console.warn(error);
				event.reply("error", error);
			} else {
				openPort();
			}
		});
	} else {
		openPort();
	}
});
ipcMain.on("disconnect", (event) => {
	if (port.isOpen) {
		port.close((error)=> {
			if (error) {
				console.warn(error);
				event.reply("error", error);
			} else {
				event.reply("disconnected");
			}
		});
	}
});
ipcMain.on("send", (event, message) => {
	if (port.isOpen) {
		console.log("Sending: " + message);
		port.write(message + eol, encoding, () => {
			event.reply("sent", message + eol);
		})
	} else {
		console.warn("Port not connected");
		event.reply("error", new Error("Port not connected"));
	}
});

const isMac = process.platform === 'darwin'
// TODO: Better menu
const template = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
			{
				label: "New Window",
				accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
				click: createTerminalWindow
			},
			{ role: 'close' },
      ...(isMac ? [] : { role: 'quit' })
    ]
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
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startSpeaking' },
            { role: 'stopSpeaking' }
          ]
        }
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
    ]
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
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://electronjs.org')
        }
      }
    ]
  }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)


app.on('window-all-closed', function () {
	app.quit()
})

app.whenReady().then(() => {
	createTerminalWindow();

})
