'use strict';

module.exports = function (size, useList, callback) {
	let arr = new Float64Array(size[0])
	for (let i = 0; i < arr.length; i++) {
		arr[i] = Math.random()
	}
	callback(null, arr, useList ? [arr.buffer] : null)
}