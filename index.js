var Browser = require('zombie');
Browser.silent = true;

function securePersonalInformation(options, browser) {
	if(browser.query('title') !== 'enter your secure personal information') return;

	var key = browser.query('#logonBody input').name;

	if(key === 'memorableDay') {
		browser
			.fill('memorableDay',   options.memorableDate[0])
			.fill('memorableMonth', options.memorableDate[1])
			.fill('memorableYear',  options.memorableDate[2])
	} else {
		browser.fill(key, options[key]);
	}

	return browser.click('[name=ok]');
}

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

	})
	.then(() => securePersonalInformation(options, browser))
	.then(() => securePersonalInformation(options, browser))
	.then(() => {
		console.log('DONE');
	});
};
