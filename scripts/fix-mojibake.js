/**
 * fix-mojibake.js
 * Repairs files that were corrupted by a UTF-8 → Windows-1252 → UTF-8 round-trip.
 * Re-interprets the garbled chars as Latin-1 bytes and re-decodes as UTF-8.
 * Then strips accents normally.
 */
const fs = require("fs")
const path = require("path")

const EXTS = [".ts", ".tsx", ".js", ".jsx"]
const SKIP_DIRS = ["node_modules", ".next", ".git", ".pnpm", "_archive"]

const ACCENT_MAP = {
  "\u00E1": "a", "\u00E9": "e", "\u00ED": "i", "\u00F3": "o", "\u00FA": "u",
  "\u00C1": "A", "\u00C9": "E", "\u00CD": "I", "\u00D3": "O", "\u00DA": "U",
  "\u00F1": "n", "\u00D1": "N",
  "\u00FC": "u", "\u00DC": "U",
  "\u2014": "-", "\u2013": "-", "\u2022": "*",
  "\u201C": '"', "\u201D": '"', "\u2018": "'", "\u2019": "'",
  "\u2026": "...", "\u00D7": "x",
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (!SKIP_DIRS.includes(e.name) && !e.name.startsWith(".")) {
        walk(full)
      }
    } else if (EXTS.includes(path.extname(e.name))) {
      processFile(full)
    }
  }
}

function processFile(filePath) {
  const raw = fs.readFileSync(filePath)
  let content
  try {
    content = raw.toString("utf8")
  } catch {
    return
  }

  // Detect mojibake: if the file contains "O followed by typical corruption markers
  const hasMojibake = /\u00C3[\u00A0-\u00BF\u0080-\u009F]/.test(content)

  let fixed = content
  if (hasMojibake) {
    try {
      // Re-interpret: read as Latin-1, re-encode bytes, decode as UTF-8
      const latin1Bytes = Buffer.from(content, "latin1")
      fixed = latin1Bytes.toString("utf8")
    } catch {
      // If re-encoding fails, keep original
      fixed = content
    }
  }

  // Strip remaining genuine accented chars
  let changed = false
  for (const [accent, plain] of Object.entries(ACCENT_MAP)) {
    if (fixed.includes(accent)) {
      fixed = fixed.split(accent).join(plain)
      changed = true
    }
  }
  if (hasMojibake) changed = true

  if (changed && fixed !== content) {
    fs.writeFileSync(filePath, fixed, "utf8")
    console.log("Fixed:", path.relative(".", filePath))
  }
}

walk(".")
console.log("Done.")
