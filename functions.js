module.exports = {
	getDevices: async function ( client ) {
		let amount = await client.getControllerCount()
		let devices = []

		for (let i = 0; i < amount; i++) {
			devices.push(await client.getControllerData(i))
		}

		return devices
	},
	getDirectDevices: async function ( client ) {
		let amount = await client.getControllerCount()
		let devices = []

		for (let deviceId = 0; deviceId < amount; deviceId++) {
			let device = await client.getControllerData(deviceId)

			if (device.modes.find(( mode ) => mode.name == "Direct")) {
				devices.push(device)
			}
		}

		return devices
	}
}
