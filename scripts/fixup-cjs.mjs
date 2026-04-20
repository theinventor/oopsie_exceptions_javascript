#!/usr/bin/env node
// Drops a minimal package.json into the CJS output dir so Node reads the .js
// files as CommonJS, even though the package's top-level package.json has
// "type": "module" (for the ESM build).
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("Usage: fixup-cjs.mjs <cjs-dir>");
  process.exit(1);
}

const dir = resolve(process.cwd(), target);
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, "package.json"), `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`);
console.log(`wrote ${resolve(dir, "package.json")}`);
