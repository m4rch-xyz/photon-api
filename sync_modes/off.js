module.exports = class Off {
	constructor ( deviceList, args ) {
		this.deviceList = deviceList

		this.args = args
	}
	start ( client ) {
		this.deviceList.forEach((element, i) => {
			if (!element) return
			client.updateLeds(i, Array(element.colors.length).fill({ red: 0, green: 0, blue: 0 }))
		})
	}
}
