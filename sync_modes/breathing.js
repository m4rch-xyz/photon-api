const { utils } = require("openrgb-sdk")
const ms = 50

module.exports = class Breathing {
	constructor ( deviceList, args ) {
		this.val = true,
		this.deviceList = deviceList

		this.args = args

		this.random = args.random
		this.color = utils.hexColor(args.color)
		this.frequency = (0.2 * +args.speed) || 0.5
	}
	static options = {
		color: {
			label: "color",
			default: "#ff0000",
			type: "color"
		},
		speed: {
			label: "speed",
			min: 1,
			max: 5,
			step: 1,
			default: 3,
			type: "number"
		},
		random: {
			label: "random color",
			default: false,
			type: "checkbox"
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
	async loop ( offset = 0 ) {
		if (!this.val) return

		let brightness = Math.abs(Math.sin(offset * this.frequency))
		let color = Object.fromEntries(Object.entries(this.color).map(el => [el[0], Math.floor(el[1] * brightness)]))

		if (this.random && Math.max(...Object.entries(color).map(el => el[1])) < 10) {
			this.color = utils.randomColor(null, Math.random() * 0.4 + 0.8, Math.random() * 0.5 + 0.5)
		} 


		this.deviceList.forEach((element, i) => {
			if (!element) return
			this.client.updateLeds(element.deviceId, Array(element.colors.length).fill(color))
		})

		setTimeout(_ => this.loop(offset + 0.1), ms)
	}
}
