async function toENTime(japaneseNumber) {
	const kanjiNumbers = {
		一: 1,
		二: 2,
		三: 3,
		四: 4,
		五: 5,
		六: 6,
		七: 7,
		八: 8,
		九: 9,
		〇: 0,
	};

	const multipliers = {
		十: 10,
		百: 100,
		千: 1000,
		万: 10000,
	};

	const units = {
		秒: 's',
		分: 'mi',
		時間: 'h',
		日: 'd',
		週間: 'w',
		月: 'mo',
		年: 'y',
	};

	let result = '';
	let numberPart = 0;
	let currentMultiplier = 1;
	let lastWasMultiplier = false;
	let unitBuffer = '';

	const processNumberPart = unit => {
		if (lastWasMultiplier && numberPart === 0) {
			numberPart = 1;
		}
		result += numberPart + unit;
		numberPart = 0;
	};

	for (let i = 0; i < japaneseNumber.length; i++) {
		const char = japaneseNumber[i];
		unitBuffer += char;
		if (char in multipliers) {
			if (numberPart === 0) numberPart = 1;
			currentMultiplier = multipliers[char];
			numberPart *= currentMultiplier;
			lastWasMultiplier = true;
			unitBuffer = '';
		} else if (char in kanjiNumbers) {
			if (lastWasMultiplier) {
				numberPart += kanjiNumbers[char];
			} else {
				numberPart = kanjiNumbers[char];
			}
			lastWasMultiplier = false;
			unitBuffer = '';
		} else if (unitBuffer in units) {
			processNumberPart(units[unitBuffer]);
			lastWasMultiplier = false;
			unitBuffer = '';
		} else if (!(char in units)) {
			if (i === japaneseNumber.length - 1 || !(japaneseNumber.substring(i, i + 2) in units)) {
				throw new Error('Invalid character in input');
			}
		}
	}

	if (numberPart > 0) {
		result += numberPart;
	}

	return result;
}

module.exports = { toENTime };
