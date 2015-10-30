var moment = require('moment');
var numeral = require('numeral');
var Browser = require('zombie');
var spinner = require('elegant-spinner');
var logUpdate = require('log-update');
Browser.silent = true;

var tickSpinner = spinner();
var spin = () => logUpdate(tickSpinner());

function parseTx(browser) {
	return browser.queryAll('.summaryTable tbody tr')
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

function parseStatement(browser) {
	tick();

	if(browser.query('td.error')) return Promise.resolve([]);

	var data = parseTx(browser);
	return browser.clickLink('[title=previous]').then(() => {
		return parseStatement(browser).then(prev => prev.concat(data));
	});
}

module.exports = function(options) {
	var browser = new Browser();
	tick();
	return browser.visit('https://banking.smile.co.uk/SmileWeb2/start.do')
	.then(() => {
		tick();
		browser
			.fill('sortCode', options.sortcode)
			.fill('accountNumber', options.account);

		return browser.click('[name=ok]');
	})
	.then(() => {
		tick();
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
		tick();
		browser.assert.text('title', 'enter your secure personal information');
		var key = browser.query('#logonBody input').name;

		if(key === 'memorableDay') {
			browser
			.fill('memorableDay',   options.memorableDate[0])
			.fill('memorableMonth', options.memorableDate[1])
			.fill('memorableYear',  options.memorableDate[2]);
		} else {
			browser.fill(key, options[key]);
		}

		return browser.click('[name=ok]');
	})
	.then(() => {
		tick();
		browser.assert.text('title', 'home'); // what
		var acctCell = browser.queryAll('.dataRowBB').find(el =>
			el.textContent.match(new RegExp(options.account))
		);
		var row = acctCell.parentNode;
		var linkCell = row.children[0];
		return browser.clickLink(linkCell.firstElementChild);
	})
	.then(() => {
		tick();
		browser.assert.text('title', 'recent items');
		var recent = parseTx(browser);

		return browser.clickLink('[title="view previous statements"]')
		.then(() => browser.clickLink('[title="click here to go to statement"]'))
		.then(() => parseStatement(browser))
		.then(data => recent.concat(data).sort((a, b) => a.date - b.date));
	});
};
