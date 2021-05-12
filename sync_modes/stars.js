const { utils } = require("openrgb-sdk")
const ms = 100

module.exports = class Stars {
	constructor ( deviceList, args ) {
		this.val = true,
		this.deviceList = deviceList

		this.args = args

		this.random = args.random
		this.color = args.random ? utils.randomColor() : utils.hexColor(args.color)
		this.duration = args.duration * 4
		this.frequency = 6 - args.speed
		this.leds = deviceList.map(device => Array(device.colors.length).fill([0, {}]))
	}
	static options = {
		color: {
			label: "color",
			default: "#0000ff",
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
		duration: {
			label: "duration",
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

		this.leds = this.leds.map(( device ) => {
			device = device.map(([ d, c ]) => d ? [ d - 1, c ] : [ 0, {} ])
			if (!(offset % this.frequency)) device[Math.floor(Math.random() * device.length)] = [this.duration, this.random ? utils.randomColor(null, Math.random() * 0.4 + 0.8, Math.random() * 0.5 + 0.5) : this.color]

			return device
		})

		this.deviceList.forEach(( element, index ) => {
			if (!element) return
			this.client.updateLeds(index, this.leds[index].map(([d, c]) => {

				return {
					red: Math.floor(c.red * d/this.duration),
					green: Math.floor(c.green * d/this.duration),
					blue: Math.floor(c.blue * d/this.duration)
				}
			}))
		})

		setTimeout(() => this.loop(offset + 1), ms)
	}
}
