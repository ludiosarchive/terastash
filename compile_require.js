"use strict";

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const T = require('notmytype');
let child_process;

/**
 * Require a module, building it first if necessary
 */
function maybeCompileAndRequire(name, verbose) {
	T(name, T.string, verbose, T.optional(T.boolean));
	try {
		return require(name);
	} catch(requireErr) {
		if(verbose) {
			console.error(`${name} doesn't appear to be built; building it...\n`);
		}
		const nodeGyp = path.join(
			path.dirname(path.dirname(process.execPath)),
			'lib', 'node_modules', 'npm', 'bin', 'node-gyp-bin', 'node-gyp'
		);
		if(!fs.existsSync(nodeGyp)) {
			throw new Error("Could not find node-gyp");
		}
		const cwd = path.join(__dirname, 'node_modules', name);
		if(!child_process) {
			child_process = require('child_process');
		}
		let child;

		child = child_process.spawnSync(
			nodeGyp,
			['clean', 'configure', 'build'],
			{
				stdio: verbose ?
					[0, 1, 2] :
					[0, 'pipe', 'pipe'],
				cwd,
				maxBuffer: 4*1024*1024
			}
		);
		if(child.status === 0) {
			return require(name);
		} else {
			console.error(chalk.bold(`\nFailed to build ${name}; you may need to install additional tools.`));
			console.error("See https://github.com/TooTallNate/node-gyp#installation");
			console.error("");
			console.error(chalk.bold("Build error was:"));
			process.stderr.write(child.stdout);
			process.stderr.write(child.stderr);
			console.error("");
			console.error(chalk.bold("Before building, require error was:"));
			console.error(requireErr.stack);
			console.error("");
			throw new Error(`Could not build module ${name}`);
		}
	}
}

module.exports = maybeCompileAndRequire;