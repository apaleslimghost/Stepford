var moment = require('moment');
var numeral = require('numeral');
var Browser = require('zombie');
Browser.silent = true;



module.exports = function(options) {
	var browser = new Browser();
	return browser.visit('https://banking.smile.co.uk/SmileWeb2/start.do')
	.then(() => {
		browser
			.fill('sortCode', options.sortcode)
			.fill('accountNumber', options.account);

		return browser.click('[name=ok]');
	})
	.then(() => {
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
		browser.assert.text('title', 'home'); // what
		var acctCell = browser.queryAll('.dataRowBB').find(el =>
			el.textContent.match(new RegExp(options.account))
		);
		var row = acctCell.parentNode;
		var linkCell = row.children[0];
		return browser.clickLink(linkCell.firstElementChild);
	})
	.then(() => {
		browser.assert.text('title', 'recent items');
		var rows = browser.queryAll('.summaryTable tbody tr').slice(0, -1);
		return rows.map(row => ({
			date: moment(row.children[0].textContent, 'DD/MM/YYYY').toDate(),
			payee: row.children[1].textContent,
			amount: row.children[2].textContent.trim() ?
				+numeral(row.children[2].textContent) :
				-numeral(row.children[3].textContent)
		}));
	});
};