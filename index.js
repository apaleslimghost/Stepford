'use strict';

var moment = require('moment');
var numeral = require('numeral');
var Browser = require('zombie');
var spinner = require('elegant-spinner');
var logUpdate = require('log-update').create(process.stderr);
var c = require('chalk');
Browser.silent = true;

module.exports = function(options) {
	var currentMessage = 'loading…';
	var tickSpinner = spinner();
	var log = options.silent ? () => {} : (options.log || (msg) => currentMessage = msg);
	var t = (options.silent || options.log) || setInterval(() => {
		logUpdate(c.cyan.bold(tickSpinner()) + ' ' + c.grey(currentMessage));
	}, 50);

	var browser = new Browser();

	var afterEarliest = row => row.date >= new Date(options.earliest);
	function willFilter(tx) {
		return options.earliest && !tx.every(afterEarliest);
	}
	function filterTx(tx) {
		return tx.filter(afterEarliest);
	}

	function parseTx() {
		return browser.queryAll(':not(.verttop) > .summaryTable tbody tr')
		.filter(row => {
			if(row.children[0].textContent.match(/last statement/)) return false;
			if(row.children[1].textContent === 'BROUGHT FORWARD') return false;
			return true;
		})
		.map(row => ({
			date: moment(row.children[0].textContent, 'DD/MM/YYYY').toDate(),
			payee: row.children[1].textContent,
			amount: row.children[2].textContent.trim() ?
				+numeral(row.children[2].textContent) :
				-numeral(row.children[3].textContent)
		}));
	}

	function parseStatementLoop(n, total) {
		var p = browser.query('#recentItemsPageCount').textContent.match(/Page (\d+) of \d+/)[1];
		log(`parsing statement page ${p} + (${n}/${total})`);

		if(browser.query('td.error')) return Promise.resolve([]);

		var data = parseTx(browser);
		if(willFilter(data)) {
			return Promise.resolve(filterTx(data));
		}

		return browser.clickLink('[title=previous]').then(() => {
			return parseStatementLoop(n + 1, total).then(prev => prev.concat(data));
		});
	}

	function cleanup() {
		clearInterval(t);
		browser.destroy();
	}

	return browser.visit('https://banking.smile.co.uk/SmileWeb2/start.do')
	.then(() => {
		log('login');
		browser
			.fill('sortCode', options.sortcode)
			.fill('accountNumber', options.account);

		return browser.click('[name=ok]');
	})
	.then(() => {
		log('security code');
		browser.assert.text('title', 'enter your security code');
		var first  = browser.query('[for=firstPassCodeDigit]') .textContent.match(/^(\w+)/)[1];
		var second = browser.query('[for=secondPassCodeDigit]').textContent.match(/^(\w+)/)[1];

		var getDigit = pos => ({
			first: options.securityCode[0],
			second: options.securityCode[1],
			third: options.securityCode[2],
			fourth: options.securityCode[3]
		})[pos];

		browser
			.select('firstPassCodeDigit',  getDigit(first))
			.select('secondPassCodeDigit', getDigit(second));

		return browser.click('[name=ok]');
	})
	.then(() => {
		log('secure personal information');
		browser.assert.text('title', 'enter your secure personal information');
		var key = browser.query('#logonBody input').name;

		if(key === 'memorableDay') {
			let date = moment(options.memorableDate, 'YYYY-MM-DD');
			browser
			.fill('memorableDay',   date.format('DD'))
			.fill('memorableMonth', date.format('MM'))
			.fill('memorableYear',  date.format('YYYY'));
		} else {
			browser.fill(key, options[key]);
		}

		return browser.click('[name=ok]').catch(() => {
			// yeah, no idea
		});
	})
	.then(() => {
		if(browser.query('title').textContent.trim() === 'smile noticeboard') {
			log('noticeboard');
			return browser.click('[name=ok]');
		}
	})
	.then(() => {
		log('home');
		browser.assert.text('title', 'home'); // what
		var acctCell = browser.queryAll('.dataRowBB').find(el =>
			el.textContent.match(new RegExp(options.account))
		);
		var row = acctCell.parentNode;
		var linkCell = row.children[0];
		return browser.clickLink(linkCell.firstElementChild);
	})
	.then(() => {
		log('parsing recent items');
		browser.assert.text('title', 'recent items');
		var recent = parseTx(browser);
		if(willFilter(recent)) {
			return filterTx(recent);
		}

		return browser.clickLink('[title="view previous statements"]')
		.then(() => {
			var total = browser.queryAll('.summaryTable tbody tr').length;
			return browser.clickLink('[title="click here to go to statement"]')
			.then(() => parseStatementLoop(1, total));
		})
		.then(data => recent.concat(data).sort((a, b) => a.date - b.date));
	}).then(d => {
		return [].concat(options.plugins || []).reduce(
			(last, plugin) => last.then(plugin),
			Promise.resolve()
		).then(() => d);
	}).then(d => {
		cleanup();
		logUpdate(`${c.green('✔︎')} extracted ${d.length} transactions`);
		return d;
	}, e => {
		cleanup();
		throw e;
	});
};
