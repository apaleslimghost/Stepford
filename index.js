var Browser = require('zombie');
Browser.silent = true;

module.exports = function(options) {
	var browser = new Browser();
	browser.visit('https://banking.smile.co.uk/SmileWeb2/start.do').then(() => {
		browser
			.fill('sortCode', options.sortcode)
			.fill('accountNumber', options.account);

		return browser.click('[name=ok]');
	}).then(() => {
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
	}).then(() => {
		browser.assert.text('title', 'enter your secure personal information');
	}).then(() => {
		console.log('DONE');
	});
};
