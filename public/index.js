"use strict";

let eol = "";

function reloadPortsList() {
	electron.emit("getPortList");
}
const portUpdator = window.setInterval(reloadPortsList, 1000);

electron.on("error", (event, error) => {
	console.error(error);
	alert(error.message);
});

function updateDropdown(name, list, selected = "") {
	const selector = document.getElementById(name + "Selector");
	const currentOptions = selector.children;
	if (currentOptions.length == 0 && selected=="") {
		selector.innerHTML = "";
		const defaultOption = document.createElement("option");
		defaultOption.setAttribute("selected", "");
		defaultOption.setAttribute("value", "");
		defaultOption.innerText = "Choose " + name;
		selector.appendChild(defaultOption)
	}
	if (selected == ""){
		selected=selector.value;
	}
	for (const option of currentOptions) {
		if (option.value ==  "") {
			continue;
		}
		let index = list.indexOf(option.value);
		if ( index != -1 ) {
			for (; index<list.length; index++) {
				list[index]=list[index+1];
			}
			list.pop();
		} else {
			if (option.value == selected) {
				// TODO: handle port disconnection
			}
			selector.removeChild(option);
		}
	}

	for (const element of list) {
		const newOption = document.createElement("option");
		newOption.innerText = element;
		newOption.value = element;
		if (element==selected) {
			newOption.setAttribute("selected", "");
		}
		selector.appendChild(newOption);
	}
	selector.dispatchEvent(new Event("change"));
}

electron.on("setPortList", (event, portList) => {
	let paths = [];
	for (const port of portList) {
		paths.push(port.path)
	}
	updateDropdown("port", paths);
});

function connect() {
	let portSettings = {};
	for (const dropdown of document.getElementById("connection").getElementsByClassName("dropdown")) {
		const name = dropdown.id.replace("Selector","");
		if (dropdown.value == "") {
			window.alert("No " + name + " selected!");
			return;
		}
		window.localStorage[name]=dropdown.value;
		portSettings[name]=dropdown.value;
	}
	// console.log(portSettings);
	electron.emit("connect", portSettings);
}
function disconnect() {
	electron.emit("disconnect");
}
electron.on("connected", () => {
	for (const dropdown of document.getElementById("connection").getElementsByClassName("dropdown")) {
		dropdown.setAttribute("disabled", "");
	}
	const button = document.getElementById("connectButton");
	button.removeEventListener("click", connect);
	button.addEventListener("click", disconnect);
	button.innerText = "Disconnect";

	document.getElementById("sendButton")
		.getElementsByTagName("button")[0]
		.removeAttribute("disabled", "")
	;
	document.getElementById("message")
		.getElementsByTagName("input")[0]
		.removeAttribute("disabled", "")
	;
});
electron.on("disconnected", () => {
	for (const dropdown of document.getElementById("connection").getElementsByClassName("dropdown")) {
		dropdown.removeAttribute("disabled", "");
	}
	const button = document.getElementById("connectButton");
	button.addEventListener("click", connect);
	button.removeEventListener("click", disconnect);
	button.innerText = "Connect";

	document.getElementById("sendButton")
		.getElementsByTagName("button")[0]
		.setAttribute("disabled", "")
	;
	document.getElementById("message")
		.getElementsByTagName("input")[0]
		.setAttribute("disabled", "")
	;
});
electron.on("received", (event, data) => {
	const received = document.getElementById("received").getElementsByTagName("textarea")[0]
	data = data.replace("\r", "␍").replace("\n", "␤").replace(eol, eol+"\n");
	received.value = received.value + data;
})
function send() {
	const message = document.getElementById("message").getElementsByTagName("input")[0];
	electron.emit("send", message.value + eol);
	message.value = "";
}
electron.on("sent", (event, message) => {
	const sent = document.getElementById("sent").getElementsByTagName("textarea")[0]
	message = message.replace(eol, eol+"\n");
	sent.value = sent.value + message;
});
window.onload = function () {
	reloadPortsList();

	document.getElementById("eolSelector").addEventListener("change", function() {
		const newEol = document.getElementById("eolSelector").value;
		window.localStorage["eol"] = newEol;
		eol = newEol.replace("CR", "␍").replace("LF", "␤");
		const fields = ["received", "sent"];
		for (const field of fields) {
			const text = document.getElementById(field).getElementsByTagName("textarea")[0];
			text.value = text.value.replace("\n","").replace(eol, eol+"\n");
		}
	});

	updateDropdown("speed",
		[110, 300, 1200, 2400, 4800, 9600, 14400, 19200, 31250, 38400, 57600, 115200, 250000],
		window.localStorage.speed ? window.localStorage.speed : 9600
	);
	updateDropdown("flow",
		["none","XON/XOFF","RTS/CTS"],
		window.localStorage.flow ? window.localStorage.flow : "none"
	); // TODO: better flow control
	updateDropdown("eol",
		["CRLF", "CR", "LF", "none"],
		window.localStorage.eol ? window.localStorage.eol : "CRLF"
	);
	updateDropdown("dataBits",
		[8,7,6,5],
		window.localStorage.dataBits ? window.localStorage.dataBits : 8
	);
	updateDropdown("parity",
		["None", "Even", "Odd", "Mark", "Space"],
		window.localStorage.parity ? window.localStorage.parity : "None"
	);
	updateDropdown("stopBits",
		[1,2],
		window.localStorage.stopBits ? window.localStorage.stopBits : 1
	);
	updateDropdown("encoding",
		["utf-8", "ascii", "base64", "binary", "hex"],
		window.localStorage.encoding ? window.localStorage.encoding : "utf-8"
	);

	document.getElementById("connectButton").addEventListener("click", connect);
	document.getElementById("sendButton")
		.getElementsByTagName("button")[0]
		.addEventListener("click", send)
	;
	document.getElementById("message")
		.getElementsByTagName("input")[0]
		.addEventListener("keyup", function(event) {
			// Number 13 is the "Enter" key on the keyboard
			if (event.keyCode === 13) {
				event.preventDefault();
				document.getElementById("sendButton").getElementsByTagName("button")[0].click();
			}
		})
	;
}
