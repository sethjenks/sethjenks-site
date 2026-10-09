// esbuild walks parent directories for Yarn Plug'n'Play. A leftover
// resolver in the home directory would hide this package's node_modules.
const { createRequire } = require("module");
const fs = require("fs");
const path = require("path");

const root = __dirname;

function resolveRequest(request, issuer) {
	if (typeof request !== "string" || request.length === 0) return null;
	const from = issuerFile(issuer);
	if (request.startsWith(".") || path.isAbsolute(request)) {
		return pickFile(path.resolve(path.dirname(from), request));
	}
	try {
		return createRequire(from).resolve(request);
	} catch {
		return null;
	}
}

function issuerFile(issuer) {
	if (typeof issuer === "string" && issuer.length > 0 && !issuer.startsWith("<")) {
		const file = issuer.split("?")[0];
		if (fs.existsSync(file)) return file;
	}
	return path.join(root, "package.json");
}

function pickFile(base) {
	const candidates = [
		base,
		`${base}.ts`,
		`${base}.tsx`,
		`${base}.js`,
		`${base}.mjs`,
		`${base}.cjs`,
		`${base}.json`,
		path.join(base, "index.js"),
		path.join(base, "index.mjs"),
		path.join(base, "index.cjs"),
	];
	for (const candidate of candidates) {
		if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
	}
	return null;
}

function reportSuccess(resolution) {
	process.stdout.write(`${JSON.stringify([null, resolution])}\n`);
}

function reportError(code, message, data) {
	process.stdout.write(`${JSON.stringify([{ code, message, data }, null])}\n`);
}

if (require.main === module) {
	let buffer = "";
	process.stdin.setEncoding("utf8");
	process.stdin.on("data", (chunk) => {
		buffer += chunk;
		let index = buffer.indexOf("\n");
		while (index !== -1) {
			const line = buffer.slice(0, index);
			buffer = buffer.slice(index + 1);
			try {
				const parsed = JSON.parse(line);
				reportSuccess(resolveRequest(parsed[0], parsed[1]));
			} catch (error) {
				const message = error instanceof Error ? error.message : "Invalid request";
				reportError("INVALID_JSON", message);
			}
			index = buffer.indexOf("\n");
		}
	});
}

module.exports = { resolveRequest };
