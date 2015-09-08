"use strong";
"use strict";

require('better-buffer-inspect');

const assert = require('assert');
const A = require('ayy');
const terastash = require('..');
const fs = require('../fs-promisified');
const os = require('os');
const crypto = require('crypto');
const path = require('path');
const utils = require('../utils');
const Promise = require('bluebird');
const gdrive = require('../chunker/gdrive');

describe('GDriver', function() {
	it('can upload a file, create folder, get file, delete both', Promise.coroutine(function*() {
		this.timeout(20000);

		const config = yield terastash.getChunkStores();
		const chunkStore = config.stores["terastash-tests-gdrive"];
		if(!chunkStore) {
			throw new Error("Please define a terastash-tests-gdrive chunk store to run this test");
		}
		A.eq(chunkStore.type, "gdrive");
		const gdriver = new gdrive.GDriver(chunkStore.clientId, chunkStore.clientSecret);
		yield gdriver.loadCredentials();

		const tempFname = path.join(os.tmpdir(), 'terastash-gdrive-tests-' + String(Math.random()));
		const fileLength = utils.randInt(1*1024, 5*1024);
		const buf = crypto.pseudoRandomBytes(fileLength);
		A.eq(buf.length, fileLength);
		yield fs.writeFileAsync(tempFname, buf, 0, buf.length);

		let _ = yield Promise.all([
			gdriver.createFile(
				"test-file", {parents: chunkStore.parents}, fs.createReadStream(tempFname)
			),
			gdriver.createFolder(
				"test-folder", {parents: chunkStore.parents}
			)
		]);
		const createFileResponse = _[0];
		const createFolderResponse = _[1];
		A.eq(typeof createFileResponse.id, "string");
		A.eq(typeof createFolderResponse.id, "string");

		_ = yield Promise.all([
			gdriver.getMetadata(createFileResponse.id),
			gdriver.getData(createFileResponse.id),
			gdriver.getData(createFileResponse.id, [0, 100])
		]);

		const getMetadataResponse = _[0];
		A.eq(getMetadataResponse.md5Checksum, createFileResponse.md5Checksum);

		// Make sure getData gives us bytes that match what we uploaded
		const dataStream = _[1][0];
		const data = yield utils.readableToBuffer(dataStream);
		A.eq(data.length, buf.length);
		const dataDigest = crypto.createHash("md5").update(data).digest("hex");
		A.eq(dataDigest, createFileResponse.md5Checksum);

		const partialDataStream = _[2][0];
		A.neq(dataStream, partialDataStream);
		const partialData = yield utils.readableToBuffer(partialDataStream);
		assert.deepStrictEqual(partialData, buf.slice(0, 100));

		yield Promise.all([
			gdriver.deleteFile(createFileResponse.id),
			gdriver.deleteFile(createFolderResponse.id)
		]);

		// Deleting a file that doesn't exist throws an error
		let caught;
		try {
			yield gdriver.deleteFile(createFileResponse.id);
		} catch(err) {
			caught = err;
		}
		A(caught instanceof Error, `deleteFile on nonexistent file did not throw Error; caught=${caught}`);
	}));
});
