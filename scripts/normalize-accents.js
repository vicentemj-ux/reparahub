/**
 * normalize-accents.js
 * Replace all accented chars with their non-accented equivalents in .ts/.tsx files.
 * Reads and writes as proper UTF-8 using Node.js.
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
  const original = fs.readFileSync(filePath, "utf8")
  let modified = original
  let changed = false
  for (const [accent, plain] of Object.entries(ACCENT_MAP)) {
    if (modified.includes(accent)) {
      modified = modified.split(accent).join(plain)
      changed = true
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, modified, "utf8")
    console.log("Fixed:", path.relative(".", filePath))
  }
}

walk(".")
console.log("Done.")
