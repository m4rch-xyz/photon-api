
# requirements

- [OpenRGB](https://gitlab.com/CalcProgrammer1/OpenRGB/)
- [nodejs (v14 or higher)](https://nodejs.org/en/) and [npm (v7 or higher)](https://docs.npmjs.com/try-the-latest-stable-version-of-npm)

# add custom mode



to add a custom mode simply add a javascript file with a unique name into the "/service/photon_modes/" directory.

that file should have a specific structure, exporting a class.

the constructor has 2 arguments automatically passed in, the full `deviceList` and a custom `args` object

```js
module.exports = class Name {
	constructor (deviceList, args) {
		// your variable declaration
	}
}
```

the `args` element is fully controllable and lets you get user input to your code

you can control the inputs the user can give you with a `static options` object, the key of each object being the name the variable will be given in the returned `args` object

**refer to "/service/photon_modes/types.json" on what you can do**

finally you have to add a start function to your class where you put in your code to run and if your code needs to be stopped put a stop function too

in the end your class should look something like

```js
module.exports = class Name {
	constructor ( deviceList, args ) {
		this.devices = deviceList

		this.speed = args.speed
		this.random = args.random
	}
	static options = {
		speed: {
			label: "speed",
			type: "number",
			min: 0,
			max: 10,
			step: 1,
			default: 5,
			way: "range"
		},
		random: {
			label: "random color",
			type: "checkbox",
			default: true
		}
	}
	start ( client ) {
		// your code
	},
	stop () {
		// stop
	}
}
```

the start function will be the one that will be called once this mode is selected. its only argument that gets passed is the client on which you can perform actions. refer to the openrgb-sdk documentation for details on your options
it may be async.
