const { utils } = require("openrgb-sdk")

module.exports = class Static {
	constructor ( deviceList, args ) {
		this.deviceList = deviceList

		this.args = args

		this.color = utils.hexColor(args.color)
	}
	static options = {
		color: {
			label: "color",
			default: "#ff0000",
			type: "color"
		}
	}
	start ( client ) {
		this.deviceList.forEach(( device ) => {
			if (!device) return
			client.updateLeds(device.deviceId, Array(device.colors.length).fill(this.color))
		})
	}
}
