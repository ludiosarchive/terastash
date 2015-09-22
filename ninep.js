"use strong";
"use strict";

const A = require('ayy');
const T = require('notmytype');
const Promise = require('bluebird');
const net = require('net');
const inspect = require('util').inspect;
const utils = require('./utils');
const frame_reader = require('./frame_reader');

// Note: fmt: is for documentation only
const packets = {
	// https://github.com/chaos/diod/blob/master/protocol.md
	12: {name: "Tlopen"}, // fid[4] flags[4]
	13: {name: "Rlopen"}, // qid[13] iounit[4]
	24: {name: "Tgetattr"}, // tag[2] fid[4] request_mask[8]
	25: {name: "Rgetattr"},
			// tag[2] valid[8] qid[13] mode[4] uid[4] gid[4] nlink[8]
                 // rdev[8] size[8] blksize[8] blocks[8]
                 // atime_sec[8] atime_nsec[8] mtime_sec[8] mtime_nsec[8]
                 // ctime_sec[8] ctime_nsec[8] btime_sec[8] btime_nsec[8]
                 // gen[8] data_version[8]
	30: {name: "Txattrwalk"}, // fid[4] newfid[4] name[s]
	31: {name: "Rxattrwalk"}, // size[8]
	40: {name: "Treaddir"}, // fid[4] offset[8] count[4]
	41: {name: "Rreaddir"}, // count[4] data[count]
	100: {name: "Tversion", fmt: ["i4:msize", "S2:version"]},
	101: {name: "Rversion", fmt: ["i4:msize", "S2:version"]},
	102: {name: "Tauth", fmt: ["S2:uname", "S2:aname"]},
	103: {name: "Rauth", fmt: ["b13:aqid"]},
	104: {name: "Tattach", fmt: ["i4:fid", "i4:afid", "S2:uname", "S2:aname"]},
	105: {name: "Rattach", fmt: ["b13:qid"]},
	107: {name: "Rerror", fmt: ["S2:ename"]},
	108: {name: "Tflush", fmt: ["i2:oldtag"]},
	109: {name: "Rflush", fmt: []},
	110: {name: "Twalk", fmt: ["i4:fid", "i4:newfid", "i2:nwname", "R:wname"]},
	111: {name: "Rwalk", fmt: ["i2:nqid", "R:qids"]},
	112: {name: "Topen", fmt: ["i4:fid", "i1:mode"]},
	113: {name: "Ropen", fmt: ["b13:qid", "i4:iounit"]},
	114: {name: "Tcreate", fmt: ["i4:fid", "S2:name", "i4:perm", "i1:mode"]},
	115: {name: "Rcreate", fmt:["i13:qid", "i4:iounit"]},
	116: {name: "Tread", fmt: ["i4:fid", "i8:offset", "i4:count"]},
	117: {name: "Rread", fmt: ["S4:data"]},
	118: {name: "Twrite", fmt: ["i4:fid", "i8:offset", "S4:data"]},
	119: {name: "Rwrite", fmt: ["i4:count"]},
	120: {name: "Tclunk", fmt: ["i4:fid"]},
	121: {name: "Rclunk", fmt: []},
	122: {name: "Tremove", fmt: ["i4:fid"]},
	124: {name: "Tstat", fmt: ["i4:fid"]},
	125: {name: "Rstat", fmt: ["S2:stat"]},
	126: {name: "Twstat", fmt: ["i4:fid", "S2:stat"]}
};

const Type = {};
for(const p of Object.keys(packets)) {
	Type[packets[p].name] = Number(p);
}

const QIDType = {
	DIR: 0x80, // File is a directory
	APPEND: 0x40, // File is append-only
	EXCL: 0x20, // File can only be open exactly once
	MOUNT: 0x10, // File describes a mount
	AUTH: 0x08, // File is an authorization ticket
	TMP: 0x04, // File is temporary
	LINK: 0x02, // Symlink
	FILE: 0x00 // Regular file
}

const BuffersType = T.list(Buffer);

function reply(client, type, tag, bufs) {
	T(client, T.object, type, T.number, tag, T.number, bufs, BuffersType);
	const preBuf = new Buffer(7);
	let length = 0;
	for(const buf of bufs) {
		length += buf.length;
	}
	preBuf.writeUInt32LE(7 + length, 0);
	preBuf.writeUInt8(type, 4);
	preBuf.writeUInt16LE(tag, 5);
	client.cork();
	client.write(preBuf);
	for(const buf of bufs) {
		client.write(buf);
	}
	client.uncork();
	console.error("<-", packets[type].name, {tag, bufs});
}

function uint32(n) {
	T(n, T.number);
	const buf = new Buffer(4);
	buf.writeUInt32LE(n, 0);
	return buf;
}

function uint16(n) {
	T(n, T.number);
	const buf = new Buffer(2);
	buf.writeUInt16LE(n, 0);
	return buf;
}

function uint8(n) {
	T(n, T.number);
	const buf = new Buffer(1);
	buf.writeUInt8(n, 0);
	return buf;
}

function string(b) {
	T(b, Buffer);
	A.lte(b.length, 64 * 1024);
	return [uint16(b.length), b];
}

function makeQID(type, version, path) {
	T(type, T.number, version, T.number, path, Buffer);
	A.eq(path.length, 8);
	return [uint8(type), uint32(version), path];
}

class FrameReader {
	constructor(frame) {
		this._frame = frame;
		this._offset = 0;
	}

	string() {
		const size = this._frame.readUInt16LE(this._offset);
		this._offset += 2;
		const string = this._frame.slice(this._offset, this._offset + size);
		this._offset += size;
		return string;
	}

	uint32() {
		const int = this._frame.readUInt32LE(this._offset);
		this._offset += 4;
		return int;
	}

	uint16() {
		const int = this._frame.readUInt16LE(this._offset);
		this._offset += 2;
		return int;
	}

	uint8() {
		const int = this._frame.readUInt8(this._offset);
		this._offset += 1;
		return int;
	}

	buffer(length) {
		const buf = this._frame.slice(this._offset, this._offset + length);
		this._offset += length;
		return buf;
	}
}

function listen(socketPath) {
	T(socketPath, T.string);
	const ourMax = (64 * 1024 * 1024) - 4;
	const server = net.createServer(function(client) {
		const decoder = new frame_reader.Int32BufferDecoder("LE", ourMax, true);
		utils.pipeWithErrors(client, decoder);
		decoder.on('data', function(frameBuf) {
			const frame = new FrameReader(frameBuf);
			const type = frame.uint8();
			const tag = frame.uint16();
			if(type === Type.Tversion) {
				const msize = frame.uint32();
				const version = frame.string();
				// TODO: ensure version is 9P2000.L
				console.error("->", packets[type].name, {tag, msize, version});
				// http://man.cat-v.org/plan_9/5/version - we must respond
				// with an equal or smaller msize.  Note that msize includes
				// the size int itself.
				const replyMsize = Math.min(msize, ourMax + 4);
				reply(client, Type.Rversion, tag, [uint32(replyMsize)].concat(string(version)));
			} else if(type === Type.Tattach) {
				const fid = frame.uint32();
				const afid = frame.uint32();
				const uname = frame.string();
				const aname = frame.string();
				console.error("->", packets[type].name, {tag, fid, afid, uname, aname});
				reply(client, Type.Rattach, tag, makeQID(QIDType.DIR, 0, new Buffer(8).fill(0)));
			} else if(type === Type.Tgetattr) {
				const fid = frame.uint32();
				const requestMask = frame.buffer(8);
				console.error("->", packets[type].name, {tag, fid, requestMask});

				// valid[8] qid[13] mode[4] uid[4] gid[4] nlink[8]
	                 // rdev[8] size[8] blksize[8] blocks[8]
	                 // atime_sec[8] atime_nsec[8] mtime_sec[8] mtime_nsec[8]
	                 // ctime_sec[8] ctime_nsec[8] btime_sec[8] btime_nsec[8]
	                 // gen[8] data_version[8]

				const valid = new Buffer(8).fill(0);
				const qid = new Buffer(13).fill(0);
				const mode = new Buffer(4).fill(0);
				const uid = new Buffer(4).fill(0);
				const gid = new Buffer(4).fill(0);
				const nlink = new Buffer(8).fill(0);
				const rdev = new Buffer(8).fill(0);
				const size = new Buffer(8).fill(0);
				const blksize = new Buffer(8).fill(0);
				const blocks = new Buffer(8).fill(0);
				const atime_sec = new Buffer(8).fill(0);
				const atime_nsec = new Buffer(8).fill(0);
				const mtime_sec = new Buffer(8).fill(0);
				const mtime_nsec = new Buffer(8).fill(0);
				const ctime_sec = new Buffer(8).fill(0);
				const ctime_nsec = new Buffer(8).fill(0);
				const btime_sec = new Buffer(8).fill(0);
				const btime_nsec = new Buffer(8).fill(0);
				const gen = new Buffer(8).fill(0);
				const data_version = new Buffer(8).fill(0);

				reply(client, Type.Rgetattr, tag, [
					valid, qid, mode, uid, gid, nlink, rdev, size, blksize, blocks,
					atime_sec, atime_nsec, mtime_sec, mtime_nsec, ctime_sec,
					ctime_nsec, btime_sec, btime_nsec, gen, data_version]);
			} else if(type === Type.Tclunk) {
				const fid = frame.uint32();
				console.error("->", packets[type].name, {tag, fid});
				// TODO: clunk something
				reply(client, Type.Rclunk, tag, []);
			} else if(type === Type.Txattrwalk) {
				// fid[4] newfid[4] name[s]
				const fid = frame.uint32();
				const newfid = frame.uint32();
				const name = frame.string();
				console.error("->", packets[type].name, {tag, fid, newfid, name});
				// We have no xattrs
				reply(client, Type.Rxattrwalk, tag, [new Buffer(8).fill(0)]);
			} else if(type === Type.Twalk) {
				const fid = frame.uint32();
				const newfid = frame.uint32();
				const nwname = frame.uint16();
				const wnames = [];
				let n = nwname;
				while(n--) {
					wnames.push(frame.string());
				}
				// TODO: support non-0
				A.eq(nwname, 0);
				console.error("->", packets[type].name, {tag, fid, newfid, nwname, wnames});
				const nqids = 0;
				reply(client, Type.Rwalk, tag, [uint16(nqids)]);
			} else if(type === Type.Tlopen) {
				const fid = frame.uint32();
				const flags = frame.uint32();
				console.error("->", packets[type].name, {tag, fid, flags});
				const qid = makeQID(QIDType.DIR, 0, new Buffer(8).fill(0));
				const iounit = 8 * 1024 * 1024;
				reply(client, Type.Rlopen, tag, qid.concat(uint32(iounit)));
			} else if(type === Type.Treaddir) {
				const fid = frame.uint32();
				const offset = frame.buffer(8);
				const count = frame.uint32();
				console.error("->", packets[type].name, {tag, fid, offset, count});
				const Rcount = 0;
				reply(client, Type.Rreaddir, tag, [uint32(Rcount)]);
			} else {
				console.error("-> Unknown message", {frameBuf, type, tag});
			}
		});
		decoder.on('error', function(err) {
			console.error(err);
		});
		decoder.on('end', function() {
			console.log('Disconnected');
		});
	});
	server.listen(socketPath);
	console.log(`9P server started, listening on UNIX domain socket at ${inspect(socketPath)}`);
}

module.exports = {listen};