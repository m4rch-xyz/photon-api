const { getDevices, getDirectDevices } = require(__dirname + "/functions.js")
const fs = require("fs")
const { utils } = require("openrgb-sdk")

module.exports = function ( app, client, syncModes ) {
	client.on("disconnect", stopAll)

	app.post("/sync/set/", async ({ body: args }, res ) => {
		if (!args.zoneName) return res.send({ ok: false, message: "didn't  receive a zone name"})

		let last
		try { last = JSON.parse(fs.readFileSync(`${process.env.ProgramData}/photon/data/last.json`)) } catch { last = {} }

		if (args.modeName) {
			syncModes[args.zoneName].modeName = args.modeName
			last.syncZones[args.zoneName].modeName = args.modeName
		}
		if (args.options) {
			syncModes[args.zoneName].options = args.options
			last.syncZones[args.zoneName].options = args.options
		}
		if ("active" in args) {
			syncModes[args.zoneName].active = args.active
			last.syncZones[args.zoneName].active = args.active
		}
		if (args.deviceList) {
			syncModes[args.zoneName].deviceList = args.deviceList
			last.device = last.device.filter(el => !args.deviceList.includes(el.location))
		} 

		if (syncModes[args.zoneName].mode && typeof syncModes[args.zoneName].mode.stop == "function") syncModes[args.zoneName].mode.stop()

		if (args.newZoneName) {
			if (syncModes[args.newZoneName]) return res.send({ ok: false, message: "zone name already taken" })
			syncModes[args.newZoneName] = syncModes[args.zoneName]
			last.syncZones[args.newZoneName] = last.syncZones[args.zoneName]
			delete syncModes[args.zoneName]
			delete last.syncZones[args.zoneName]
			args.zoneName = args.newZoneName
		}
		let devices = (await getDirectDevices(client)).filter(( device ) => syncModes[args.zoneName].deviceList.includes(device.location))

		for ({ deviceId } of devices) {
			await client.updateMode(deviceId, "Direct")
		}

		let Mode = require(__dirname + `/sync_modes/${syncModes[args.zoneName].modeName}`)
		let mode = new Mode(devices, syncModes[args.zoneName].options)

		syncModes[args.zoneName].mode = mode

		if (syncModes[args.zoneName].active) mode.start(client)

		devices = await getDevices(client)
		if (args.deviceList) {
			last.syncZones[args.zoneName].deviceList = args.deviceList.map(location => {
				let index = devices.findIndex(el => el.location == location)
				let device = {
					location,
					name: devices[index].name,
					num: devices.filter(el => el.name == devices[index].name).findIndex(el => el.location == location)
				}

				return device
	
			})
		}

		fs.writeFileSync(`${process.env.ProgramData}/photon/data/last.json`, JSON.stringify(last, null, "\t"))

		res.send({ ok: true })
	})

	app.post("/sync/new/", async ({ body: args }, res ) => {
		if (syncModes[args.zoneName]) return res.send({ ok: false, message: "a zone with this name already exists"})

		let last
		try { last = JSON.parse(fs.readFileSync(`${process.env.ProgramData}/photon/data/last.json`)) } catch { last = {} }

		syncModes[args.zoneName] = {}

		syncModes[args.zoneName].modeName = args.modeName
		syncModes[args.zoneName].options = args.options
		syncModes[args.zoneName].active = args.active
		syncModes[args.zoneName].deviceList = args.deviceList
		last.device = last.device ? last.device.filter(el => !args.deviceList.includes(el.location)) : []

		let devices = (await getDirectDevices(client)).filter(( device ) => args.deviceList.includes(device.location))

		for ({ deviceId } of devices) {
			await client.updateMode(deviceId, "Direct")
		}

		let Mode = require(__dirname + `/sync_modes/${syncModes[args.zoneName].modeName}`)
		let mode = new Mode(devices, syncModes[args.zoneName].options)

		syncModes[args.zoneName].mode = mode

		if (syncModes[args.zoneName].active) mode.start(client)

		if (!last.syncZones) last.syncZones = {}
		last.syncZones[args.zoneName] = { ...syncModes[args.zoneName] }
		delete last.syncZones[args.zoneName].mode

		devices = await getDevices(client)

		last.syncZones[args.zoneName].deviceList = args.deviceList.map( location => {
			let index = devices.findIndex(el => el.location == location)
			let device = {
				location,
				name: devices[index].name,
				num: devices.filter(el => el.name == devices[index].name).findIndex(el => el.location == location)
			}

			return device

		})

		fs.writeFileSync(`${process.env.ProgramData}/photon/data/last.json`, JSON.stringify(last, null, "\t"))

		res.send({ ok: true })
	})

	app.post("/sync/delete/", async ({ body: args }, res ) => {
		if (!syncModes[args.zoneName]) return res.send({ ok: false, message: "a zone with this name does not exist"})

		if (syncModes[args.zoneName].mode && typeof syncModes[args.zoneName].mode.stop == "function") syncModes[args.zoneName].mode.stop()
		delete syncModes[args.zoneName]

		try { last = JSON.parse(fs.readFileSync(`${process.env.ProgramData}/photon/data/last.json`)) } catch (error) { console.log(error) }
		delete last.syncZones[args.zoneName]
		fs.writeFileSync(`${process.env.ProgramData}/photon/data/last.json`, JSON.stringify(last, null, "\t"))

		res.send({ ok: true })
	})

	app.post("/device/:device/:mode/", async ({ params, body: args }, res ) => {
		try {

			let devices = await getDevices(client)

			let device = devices.find(el => el.deviceId == params.device)

			let last
			try { last = JSON.parse(fs.readFileSync(`${process.env.ProgramData}/photon/data/last.json`)) } catch { last = {} }

			if (!Array.isArray(last.device)) last.device = []
	
			let index = last.device.findIndex(({ location }) => location == device.location)


			if (index >= 0) {
				last.device[index].mode = +params.mode
				last.device[index].options = JSON.parse(JSON.stringify(args)) //stupid solution to unlink vars 
			} else {
				let num = devices.filter(el => el.name == device.name).findIndex(el => el.deviceId == params.device)
				index = last.device.findIndex(el => el.name == device.name && el.num == num)

				if (index >= 0) {
					last.device[index].location = device.location
					last.device[index].mode = +params.mode
					last.device[index].options = JSON.parse(JSON.stringify(args)) //stupid solution to unlink vars 
				} else {
					index = last.device.length
					last.device.push({name: device.name, num, location: device.location, mode: +params.mode, options: args })
				}
			}

			if (!args.random && device.modes.filter(el => el.id == params.mode)[0].colorMode == 1) {
				client.updateLeds(+params.device, args.colors.map(el => utils.hexColor(el)))
				if (Array.isArray(last.device[index].options.colors)) {
					last.device[index].colors = last.device[index].options.colors
					delete last.device[index].options.colors
				}
				args.colors = false
			}

			if (!args.random && device.modes.filter(el => el.id == params.mode)[0].colorMode == 2 && Array.isArray(last.device[index].colors)) {
				delete last.device[index].colors
				args.colors = false
			}

			fs.writeFileSync(`${process.env.ProgramData}/photon/data/last.json`, JSON.stringify(last, null, "\t"))

			let colorhelper 
			if (args.colors) {
				colorhelper = args.colors
				args.colors = args.colors.map(el => utils.hexColor(el))
			}

			await client.updateMode(+params.device, +params.mode, args)

			if (args.colors) args.colors = colorhelper

			res.send({ ok: true })
		} catch (error) {
			res.send({ ok: false, message: error?.message || error || "did not work" })
		}
	})

	app.post("/settings/device/resize/:device/", async ({ params, body: args }, res ) => {
		try {
			await client.resizeZone(+params.device, +args.zone, +args.length)
			res.send({ ok: true })
		} catch (error) {
			res.send({ ok: false, message: error.message || error || "did not work" }) 
		}
	})

	app.get("/sync/modes/", ( req, res ) => {
		let modes = {}
		fs.readdirSync(__dirname + "/sync_modes/").filter(( file ) => file.endsWith(".js")).forEach(( file ) => {
			let pull = require(__dirname + `/sync_modes/${file}`)

			modes[file] = pull?.options || {}
		})

		res.send(modes)
	})

	app.get("/sync/zones/", ( req, res ) => {
		let zones = {}

		for (zone in syncModes) {
			zones[zone] = { ...syncModes[zone] }
			delete zones[zone].mode
		}

		res.send(Object.entries(zones))
	})

	app.get("/devices/", async ( req, res ) => {
		try {
			let devices = await getDevices(client)
			res.send(devices)
		} catch {
			await client.connect()
			res.send([])
		}
	})

	app.get("/settings/", ( req, res ) => {
		let settings
		try { settings = JSON.parse(fs.readFileSync(`${process.env.ProgramData}/photon/data/settings.json`)) } catch { last = {} }

		res.send({
			settings
		})
	})

	app.get("/profiles/", ( req, res ) => {
		if (!fs.existsSync(`${process.env.ProgramData}/photon/profiles/`) || !fs.lstatSync(`${process.env.ProgramData}/photon/profiles/`).isDirectory()) {
			fs.mkdirSync(`${process.env.ProgramData}/photon/profiles/`, { recursive: true })
			res.send([])
			return
		}

		let profiles = fs.readdirSync(`${process.env.ProgramData}/photon/profiles/`).filter(( file ) => file.endsWith(".json")).map(( file ) => file.slice(0, -5))

		res.send(profiles.sort())
	})

	app.post("/profiles/load/", async ({ body: args }, res ) => {
		try {
			stopAll()
			let profile = {}
			try { profile = JSON.parse(fs.readFileSync(`${process.env.ProgramData}/photon/profiles/${args.name}.json`)) } catch (error) { console.log(error) }
			fs.writeFileSync(`${process.env.ProgramData}/photon/data/last.json`, JSON.stringify(profile, null, "\t"))

			syncModes = profile.syncZones

			let directDevices = await getDirectDevices(client)
			for (zoneName in profile.syncZones) {
				let devices = directDevices.filter(( device ) => syncModes[zoneName].deviceList.includes(device.location))

				for ({ deviceId } of devices) {
					await client.updateMode(deviceId, "Direct")
				}

				let Mode = require(__dirname + `/sync_modes/${syncModes[zoneName].modeName}`)
				let mode = new Mode(devices, syncModes[zoneName].options)
				if (syncModes[zoneName].active) mode.start(client)

				syncModes[zoneName].mode = mode
			}

			res.send({ ok: true })
		} catch ( error ) {
			res.send({ ok: false, message: error?.message || error || "error" }) 
		}
	})

	app.post("/profiles/save/", ({ body: args }, res ) => {
		try {
			let profile
			try { profile = JSON.parse(fs.readFileSync(`${process.env.ProgramData}/photon/data/last.json`)) } catch { profile = {} }
			fs.writeFileSync(`${process.env.ProgramData}/photon/profiles/${args.name}.json`, JSON.stringify(profile, null, "\t"))
			res.send({ ok: true })
		} catch ( error ) {
			res.send({ ok: false, message: error?.message || error || "error" }) 
		}
	})

	app.post("/profiles/rename/", ({ body: args }, res ) => {
		try {
			if (!fs.existsSync(`${process.env.ProgramData}/photon/profiles/${args.oldName}.json`)) return res.send({ ok: false, message: "profile does not exist" })
			if (fs.existsSync(`${process.env.ProgramData}/photon/profiles/${args.newName}.json`)) return res.send({ ok: false, message: "new name already exists" })

			fs.renameSync(`${process.env.ProgramData}/photon/profiles/${args.oldName}.json`, `${process.env.ProgramData}/photon/profiles/${args.newName}.json`)

			let settings = {}
			try { settings = JSON.parse(fs.readFileSync(`${process.env.ProgramData}/photon/data/settings.json`)) } catch {}
			if (settings.startupProfile == args.oldName) {
				settings.startupProfile = args.newName
				fs.writeFileSync(`${process.env.ProgramData}/photon/data/settings.json`, JSON.stringify(settings, null, "\t"))
			}
	
			res.send({ ok: true })
		} catch ( error ) {
			res.send({ ok: false, message: error?.message || error || "error" }) 
		}
	})

	app.post("/profiles/delete/", ({ body: args }, res) => {
		try {
			if (!fs.existsSync(`${process.env.ProgramData}/photon/profiles/${args.name}.json`)) return res.send({ ok: false, message: "profile does not exist" })

			fs.unlinkSync(`${process.env.ProgramData}/photon/profiles/${args.name}.json`)
			res.send({ ok: true })
		} catch ( error ) {
			res.send({ ok: false, message: error.message || error || "error" })
		}
	})

	app.post("/settings/startup/profile/", ({ body: args }, res) => {
		try {
			let settings = {}
			try { settings = JSON.parse(fs.readFileSync(`${process.env.ProgramData}/photon/data/settings.json`)) } catch {}
			if ("name" in args && !args.name) {
				settings.startupProfile = false
			} else {
				if (!fs.existsSync(`${process.env.ProgramData}/photon/profiles/${args.name}.json`)) return res.send({ ok: false, message: "profile does not exist" })
				settings.startupProfile = args.name
			}
			fs.writeFileSync(`${process.env.ProgramData}/photon/data/settings.json`, JSON.stringify(settings, null, "\t"))
			res.send({ ok: true })
		} catch ( error ) {
			res.send({ ok: false, message: error.message || error || "error" })
		}
	})

	function stopAll () {
		Object.values(syncModes).forEach(({ mode }) => mode?.stop?.())
	}
}
