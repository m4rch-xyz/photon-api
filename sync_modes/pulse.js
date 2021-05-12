const { utils } = require("openrgb-sdk")
const ms = 100

module.exports = class Pulse {
	constructor ( deviceList, args ) {
		this.val = true,
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
		this.val = true
		this.client = client

		this.loop()
	}
	stop () {
		this.val = false
	}
	async loop ( offset = 0) {
		if (!this.val) return

		let color
		switch (offset % 10) {
			case 6: 
			case 4:
				color = this.color
				break
			case 5:
			case 7:
				color = {red:this.color.red/3,green:this.color.green/3,blue:this.color.blue/3}
				break
			case 8:
				color = {red:this.color.red/5,green:this.color.green/5,blue:this.color.blue/5}
				break
			default: 
				color = {red:0,green:0,blue:0}
		}

		this.deviceList.forEach((element, i) => {
			if (!element) return
			client.updateLeds(i, Array(element.colors.length).fill(color))
		})

		setTimeout(_ => this.loop(offset + 1), ms)
	}
}
