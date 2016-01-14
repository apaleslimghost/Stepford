<h1 align="center">
	<img src="logo.png" width="400" alt="stepford">
</h1>

A scraper for smile online banking. `npm install stepford`

```js
var stepford = require('stepford');

stepford({
	sortCode: '089286',
	account: '12345678',
	securityCode: '1234',
	memorableName: 'karlmarx',
	birthPlace: 'sacredheart',
	lastSchool: 'greendale',
	firstSchool: 'thirdstelementary',
	memorableDate: '1990-06-13'
}).then(transactions => console.log(transactions));
```

```bash
❯ stepford config.json -o transactions.csv
```

config
-------

js                | cli                | notes
------------------|--------------------|-------
`sortcode`        | `--sort-code`      |
`account`         | `--account`        |
`securityCode`    | `--security-code`  |
`memorableName`   | `--memorable-name` |
`birthPlace`      | `--birth-place`    |
`lastSchool`      | `--last-school`    |
`firstSchool`     | `--first-school`   |
`memorableDate`   | `--memorable-date` | `YYYY-MM-DD` format
`silent`          | `--silent`         | Turns off progress messages.
`earliest`        | `--earliest`       | `YYYY-MM-DD` format. Transactions before this date will be discarded
                  | `-o`               | Output file, stdout if not present. `json` and `csv` files will be formatted appropriately.

caveats
-------

Stepford is not affiliated with or endorsed by The Cooperative Bank, plc. **Use at your own risk**. I can't guarantee it won't transfer all your money to hackers in Russia. (It doesn't, but I can't guarantee that. Something something merchantability or fitness for a particular purpose.)

Seriously, you might want to think twice and [read the source code](index.js) before you hand your bank security details to a chunk of Javascript you downloaded from the internet.

licence
-------

MIT. &copy; Matt Brennan.
