const { utils } = require("openrgb-sdk")

module.exports = class Rainbow {
	constructor ( deviceList, args ) {
		this.val = true,
		this.deviceList = deviceList

		this.args = args

		this.frequency = (6 - args.frequency) * 0.05
		this.ms = (6 - args.speed) * 40
		this.direction = args.direction
		this.rainbow = []
	}
	static options = {
		frequency: {
			label: "cycle length",
			min: 1,
			max: 5,
			step: 1,
			default: 3,
			type: "number",
		},
		speed: {
			label: "speed",
			min: 1,
			max: 5,
			step: 1,
			default: 3,
			type: "number",
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
	getRainbow ( offset ) {
		let rainbow = []
		for (var i = 0; i < 120; ++i) {
			let red   = Math.round(Math.sin(this.frequency * i - offset * this.frequency - 0) * 127 + 128)
			let green = Math.round(Math.sin(this.frequency * i - offset * this.frequency - 2) * 127 + 128)
			let blue  = Math.round(Math.sin(this.frequency * i - offset * this.frequency - 4) * 127 + 128)

			rainbow.push({red, green, blue})
		}

		return rainbow
	}
	async loop ( offset = 0 ) {
		if (!this.val) return
		let rainbow = this.getRainbow(offset)

		for (let index = 0; index < this.deviceList.length; index++) {
			let colors = []
			for (let zoneId = 0; zoneId < this.deviceList[index].zones.length; zoneId++) {
				if (this.deviceList[index].zones[zoneId].type == 2) {
					for (let column = 0; column < this.deviceList[index].zones[zoneId].matrix.width; column++) {
						let rainbow_matrix = rainbow.slice(0, this.deviceList[index].zones[zoneId].matrix.width)
						this.deviceList[index].zones[zoneId].matrix.keys.forEach(el => {
							colors[el[column]] = rainbow_matrix[column]
						});
					}
					for (let index = 0; index < colors.length; index++) {
						if (!colors[index]) colors[index] = utils.color(255)
					}
				} else {
					colors = colors.concat(rainbow.slice(0, this.deviceList[index].zones[zoneId].ledsCount))
				}
			}
			await this.client.updateLeds(this.deviceList[index].deviceId, colors)
		}
		setTimeout(() => this.loop(offset + 1), this.ms)
	}
}
