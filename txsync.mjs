/**
 * txsync.mjs — Transifex Structured JSON sync helper
 *
 * Usage:
 *   node txsync.mjs push              # flatten all locales → tx/
 *   node txsync.mjs pull              # unflatten tx/ → src/i18n/locales/
 *   node txsync.mjs push --locale en  # single locale
 *   node txsync.mjs pull --locale zh-TW
 *
 * Workflow:
 *   1. Run `node txsync.mjs push` to produce Transifex-ready files in tx/
 *   2. Upload tx/<locale>.json to Transifex (or let the TX CLI do it)
 *   3. After translators finish, download updated files back into tx/
 *   4. Run `node txsync.mjs pull` to write them back to src/i18n/locales/
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const LOCALES_DIR = join(__dirname, "src/i18n/locales");
const TX_DIR = join(__dirname, "tx");
const LOCALES = ["en", "zh-CN", "zh-TW", "vi", "nl", "es-ES"];

// ── Flatten: { a: { b: "v" } } → { "a.b": { string: "v" } } ─────────────────

function flatten(obj, prefix = "") {
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(value)) {
            value.forEach((item, i) => {
                if (typeof item === "object" && item !== null) {
                    Object.assign(out, flatten(item, `${path}.${i}`));
                } else {
                    out[`${path}.${i}`] = { string: String(item) };
                }
            });
        } else if (typeof value === "object" && value !== null) {
            Object.assign(out, flatten(value, path));
        } else {
            out[path] = { string: String(value) };
        }
    }
    return out;
}

// ── Unflatten: { "a.b": { string: "v" } } → { a: { b: "v" } } ───────────────

function unflatten(flat) {
    const out = {};
    for (const [dotPath, entry] of Object.entries(flat)) {
        const value = entry.string ?? entry;
        const parts = dotPath.split(".");
        let cursor = out;
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            const nextPart = parts[i + 1];
            const nextIsIndex = /^\d+$/.test(nextPart);
            if (cursor[part] === undefined) {
                cursor[part] = nextIsIndex ? [] : {};
            }
            cursor = cursor[part];
        }
        const last = parts[parts.length - 1];
        if (/^\d+$/.test(last)) {
            cursor[Number(last)] = value;
        } else {
            cursor[last] = value;
        }
    }
    return out;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJSON(path) {
    return JSON.parse(readFileSync(path, "utf8"));
}

function writeJSON(path, data) {
    writeFileSync(path, JSON.stringify(data, null, 4), "utf8");
}

function resolveLocales(args) {
    const idx = args.indexOf("--locale");
    if (idx !== -1 && args[idx + 1]) {
        const locale = args[idx + 1];
        if (!LOCALES.includes(locale)) {
            console.error(`Unknown locale "${locale}". Valid: ${LOCALES.join(", ")}`);
            process.exit(1);
        }
        return [locale];
    }
    return LOCALES;
}

// ── Commands ──────────────────────────────────────────────────────────────────

function push(locales) {
    mkdirSync(TX_DIR, { recursive: true });
    for (const locale of locales) {
        const src = join(LOCALES_DIR, `${locale}.json`);
        const dest = join(TX_DIR, `${locale}.json`);
        const nested = readJSON(src);
        const structured = flatten(nested);
        writeJSON(dest, structured);
        const count = Object.keys(structured).length;
        console.log(`push  ${locale}: ${count} strings → ${dest}`);
    }
}

function pull(locales) {
    for (const locale of locales) {
        const src = join(TX_DIR, `${locale}.json`);
        const dest = join(LOCALES_DIR, `${locale}.json`);
        let structured;
        try {
            structured = readJSON(src);
        } catch {
            console.warn(`pull  ${locale}: tx/${locale}.json not found, skipping`);
            continue;
        }
        const nested = unflatten(structured);
        writeJSON(dest, nested);
        const count = Object.keys(structured).length;
        console.log(`pull  ${locale}: ${count} strings → ${dest}`);
    }
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

const [, , command, ...rest] = process.argv;
const locales = resolveLocales(rest);

if (command === "push") {
    push(locales);
} else if (command === "pull") {
    pull(locales);
} else {
    console.error("Usage: node txsync.mjs push|pull [--locale <code>]");
    process.exit(1);
}