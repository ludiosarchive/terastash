"use strong";
"use strict";

const A = require('ayy');
const T = require('notmytype');
const crypto = require('crypto');

/**
 * Make sure that OpenSSL's AES-128-CTR cipher works as expected, including
 * our use of the IV as the counter.
 */
function selfTest() {
	let cipher;
	let decrypted;
	const key = new Buffer('12300000000000045600000000000789', 'hex');
	const iv0 = new Buffer('00000000000000000000000000000000', 'hex');
	const iv1 = new Buffer('00000000000000000000000000000001', 'hex');

	// Test for exact ciphertext
	cipher = crypto.createCipheriv('aes-128-ctr', key, iv0);
	const text = 'Hello, world. This is a test string spanning multiple AES blocks.';
	const encrypted = cipher.update(new Buffer(text));
	A.eq(
		encrypted.toString('hex'),
		'5a4be59fb050aa6059075162597141e2ff2c99e3b7b968f3396d50712587640626719d' +
		'c348cb5d966985eb7bb964e35bbe0dd77624386b875f46694a1e89b49ec2'
	);

	// Test that encryption->decryption round-trips
	cipher = crypto.createCipheriv('aes-128-ctr', key, iv0);
	decrypted = cipher.update(encrypted);
	A.eq(decrypted.toString('utf-8'), text);

	// Test that we can decrypt the middle of the ciphertext with an incremented IV
	cipher = crypto.createCipheriv('aes-128-ctr', key, iv1);
	decrypted = cipher.update(encrypted.slice(16));
	A.eq(decrypted.toString('utf-8'), text.substr(16));
}

function assertSafeNonNegativeInteger(num) {
	T(num, T.number);
	A(Number.isInteger(num), num);
	A.gte(num, 0);
	A.lte(num, Number.MAX_SAFE_INTEGER);
}

function strictZeroPad(s, num) {
	T(s, T.string, num, T.number);
	assertSafeNonNegativeInteger(num);
	A.lte(s.length, num);
	return '0'.repeat(num - s.length) + s;
}

function blockNumberToIv(blockNum) {
	assertSafeNonNegativeInteger(blockNum);
	const buf = new Buffer(strictZeroPad(blockNum.toString(16), 32), 'hex');
	A(buf.length, 16);
	return buf;
}

module.exports = {selfTest, blockNumberToIv};
