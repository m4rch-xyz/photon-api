module.exports = class ColorCycle {
	constructor ( deviceList, args ) {
		this.val = true,
		this.deviceList = deviceList

		this.args = args

		this.ms = (6 - args.speed) * 25
	}
	static options = {
		speed: {
			label: "speed",
			min: 1,
			max: 5,
			step: 1,
			default: 3,
			type: "number"
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
	getColorCycle ( offset ) {
		let red   = Math.round(Math.sin(-offset * 0.15 * 0.5 - 0) * 127 + 128)
		let green = Math.round(Math.sin(-offset * 0.15 * 0.5 - 2) * 127 + 128)
		let blue  = Math.round(Math.sin(-offset * 0.15 * 0.5 - 4) * 127 + 128)

		return { red, green, blue }
	}
	loop ( offset = 0 ) {
		if (!this.val) return

		let rainbow = this.getColorCycle(offset)

		this.deviceList.forEach((element, i) => {
			if (!element) return
			this.client.updateLeds(i, Array(element.colors.length).fill(rainbow))
		})

		setTimeout(_ => this.loop(offset + 1), this.ms)
	}
}
