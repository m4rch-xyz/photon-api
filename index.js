const express = require("express")
const { Client, utils } = require("openrgb-sdk")
const fs = require("fs")
const http = require("http")

const { getDirectDevices, getDevices } = require(__dirname + "/functions.js")
const routes = require(__dirname + "/routes.js")

const client = new Client("rest-api")

switch (process.platform) {
	case "win32": {
		process.env.DATAFOLDER = `${process.env.ProgramData}/photon`
		break
	}
	case "linux": {
		process.env.DATAFOLDER = `${process.env.HOME}/.photon`
		break
	}
	case "darwin": {
		process.env.DATAFOLDER = "TODO"
		break
	}
}

const app = express()
let server = http.createServer(app)
enableDestroy(server)
server.listen(1872)

async function connect () {
	try {
		await client.connect()
	} catch {
		setTimeout(connect, 3000)
	}
}

connect()

client.on("connect", start)


app.use(( req, res, next ) => {

	res.setHeader("Access-Control-Allow-Origin", "*")
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE")
	res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, content-type")
	res.setHeader("Access-Control-Allow-Credentials", true)

	next()

})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

async function start () {
	client.on("disconnect", connect)

	if (!fs.existsSync(`${process.env.DATAFOLDER}/data/`)) fs.mkdirSync(`${process.env.DATAFOLDER}/photon/data/`, { recursive: true })
	if (!fs.existsSync(`${process.env.DATAFOLDER}/profiles/`)) fs.mkdirSync(`${process.env.DATAFOLDER}/photon/profiles/`, { recursive: true })

	let settings
	try { settings = JSON.parse(fs.readFileSync(`${process.env.DATAFOLDER}/data/settings.json`)) } catch { settings = {} }

	let last
	if (!settings.startupProfile) {
		try { last = JSON.parse(fs.readFileSync(`${process.env.DATAFOLDER}/data/last.json`)) } catch { last = {} }
	} else {
		if (fs.existsSync(`${process.env.DATAFOLDER}/profiles/${settings.startupProfile}.json`)) {
			last = JSON.parse(fs.readFileSync(`${process.env.DATAFOLDER}/profiles/${settings.startupProfile}.json`))
		} else {
			try { last = JSON.parse(fs.readFileSync(`${process.env.DATAFOLDER}/data/last.json`)) } catch { last = {} }
		}
	}

	let devices = await getDevices(client)
	if (last.device) {
		for ([i, el] of last.device.entries()) {
			let device = devices.find(( device1 ) => device1.location == el.location)
			if (!device) {
				device = devices.filter(el => el.name == last.device[i].name)[last.device[i].num]
				if (!device) continue
				last.device[i].location = device.location
			}
			if (el.colors) {
				client.updateLeds(device.deviceId, el.colors.map(el => utils.hexColor(el)))
			}
			let colorhelper 
			if (el.options.colors) {
				colorhelper = el.options.colors
				el.options.colors = el.options.colors.map(el => utils.hexColor(el))
			}
			await client.updateMode(device.deviceId, el.mode, el.options)
			if (el.options.colors) el.options.colors = colorhelper
		}
	}


	let syncModes = JSON.parse(JSON.stringify(last.syncZones || "{}"))  // stupid solution to unlink vars 

	let directDevices = await getDirectDevices(client)

	for (let zoneName in syncModes) {

		let zoneDevices = []

		syncModes[zoneName].deviceList.forEach((device, i) => {
			let index = directDevices.findIndex(( el ) => el.location == device.location)
			if (index >= 0) {
				zoneDevices.push(device.location)
			} else {
				let a = directDevices.filter(d => d.name == device.name)
				if (a.length > device.num) {
					zoneDevices.push(a[device.num].location)
					last.syncZones[zoneName].deviceList[i].location = a[device.num].location
				}
			}
		})

		syncModes[zoneName].deviceList = zoneDevices

		zoneDevices = directDevices.filter(( device ) => syncModes[zoneName].deviceList.includes(device.location))

		for ({ deviceId } of zoneDevices) {
			await client.updateMode(deviceId, "Direct")
		}

		let Mode = require(__dirname + `/sync_modes/${syncModes[zoneName].modeName}`)
		let mode = new Mode(zoneDevices, syncModes[zoneName].options)
		if (syncModes[zoneName].active) mode.start(client)

		syncModes[zoneName].mode = mode

	}


	fs.writeFileSync(`${process.env.DATAFOLDER}/data/last.json`, JSON.stringify(last, null, "\t"))

	routes(app, client, syncModes)
}

app.get("/status/", ( req, res ) => {
	res.send({ connected: client.isConnected })
})

app.post("/settings/port/photon/", ({ body: args }, res) => {
	try {
		server.destroy()
		server.listen(args.port)
	} catch ( error ) {
		res.send({ ok: false, message: error.message || error || "error" })
	}
})

function enableDestroy(server) {
	var connections = {}

	server.on('connection', function(conn) {
		var key = conn.remoteAddress + ':' + conn.remotePort;
		connections[key] = conn;
		conn.on('close', function() {
			delete connections[key];
		});
	});

	server.destroy = function(cb) {
		server.close(cb)
		for (var key in connections) connections[key].end();
	};
}
