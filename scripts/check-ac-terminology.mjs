#!/usr/bin/env node
/**
 * AC terminology gate — forbidden slow-AC Russian substring in repo sources.
 * Pattern stored as char codes so the literal does not appear in this file.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN = String.fromCharCode(
  0x041c, 0x0415, 0x0414, 0x041b, 0x0415, 0x041d, 0x041d,
);
const FORBIDDEN_RE = new RegExp(FORBIDDEN, "i");
const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".cursor",
  "mcps",
  "logos",
]);
const SKIP_FILES = new Set([
  path.normalize("scripts/check-ac-terminology.mjs"),
]);

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      await walk(full, out);
      continue;
    }
    const rel = path.relative(ROOT, full);
    if (SKIP_FILES.has(path.normalize(rel))) continue;
    out.push(full);
  }
  return out;
}

const files = await walk(ROOT);
const hits = [];

for (const file of files) {
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch {
    continue;
  }
  if (!FORBIDDEN_RE.test(text)) continue;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (FORBIDDEN_RE.test(line)) {
      hits.push(`${path.relative(ROOT, file)}:${i + 1}:${line.trim()}`);
    }
  });
}

if (hits.length) {
  console.error("FAIL: forbidden AC terminology found:");
  for (const h of hits) console.error(h);
  process.exit(1);
}

console.log("PASS: no forbidden AC terminology in repo");
process.exit(0);
