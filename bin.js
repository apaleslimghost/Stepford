#!/usr/bin/env node

var stepford = require('./');
var argv = require('minimist')(process.argv.slice(2));
var csv = require('to-csv');
var path = require('path');
var util = require('util');
var fs = require('fs');
var moment = require('moment');
var extend = util._extend;

var options = argv._[0] ? extend(argv, require(path.resolve(argv._[0]))) : argv;

var out = options.o;
var format = {
	json: JSON.stringify,
	csv: data => csv(data.map(row => (row.date = moment(row.date).format('YYYY-MM-DD'), row)))
}[options.format || path.extname(out).slice(1)] || util.inspect;

var write = out ? data => fs.writeFile(out, data, 'utf8') : console.log;

stepford(options).then(
	data => write(format(data)),
	err => {
		console.error(err.stack);
		process.exit(1);
	}
);
