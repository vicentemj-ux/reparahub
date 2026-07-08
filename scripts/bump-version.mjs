#!/usr/bin/env node
/**
 * bump-version.mjs — Sincroniza version del proyecto en 3 lugares y crea git tag.
 *
 * Uso:
 *   node scripts/bump-version.mjs patch
 *   node scripts/bump-version.mjs minor
 *   node scripts/bump-version.mjs major
 *   node scripts/bump-version.mjs minor --message "feat(scanner): primera version estable"
 *
 * Lo que hace:
 *  1. Lee la version actual de package.json.
 *  2. Calcula la nueva segun el nivel.
 *  3. Lee el changelog auto desde `git log <ultimo-tag>..HEAD` y agrupa por tipo.
 *  4. Si se pasa --message, lo usa como nota destacada de la release.
 *  5. Actualiza package.json.
 *  6. Actualiza docs/PROJECT_CONTEXT.md (Version activa + Fecha).
 *  7. Prepende nuevo bloque a CHANGELOG.md.
 *  8. git add + commit + tag.
 *
 * Sin dependencias externas. Solo node:fs/promises, node:child_process, node:readline.
 */

import { readFile, writeFile, access } from "node:fs/promises"
import { execSync } from "node:child_process"
import { createInterface } from "node:readline"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

// ─── Utilidades ────────────────────────────────────────────────────────────────

const log = (msg) => console.log(`\x1b[36m[bump]\x1b[0m ${msg}`)
const ok = (msg) => console.log(`\x1b[32m[bump]\x1b[0m ${msg}`)
const warn = (msg) => console.log(`\x1b[33m[bump]\x1b[0m ${msg}`)
const err = (msg) => console.log(`\x1b[31m[bump]\x1b[0m ${msg}`)

const run = (cmd, opts = {}) => {
  try {
    const command = Array.isArray(cmd) ? cmd.join(" ") : cmd
    return execSync(command, { cwd: ROOT, stdio: ["pipe", "pipe", "pipe"], encoding: "utf8", shell: true, ...opts }).trim()
  } catch (e) {
    err(`Comando fallo: ${Array.isArray(cmd) ? cmd.join(" ") : cmd}`)
    if (e.stderr) err(e.stderr)
    throw e
  }
}

const ask = async (question) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

const exists = async (path) => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const today = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const bumpSemver = (current, level) => {
  const [major, minor, patch] = current.split(".").map(Number)
  if (level === "major") return `${major + 1}.0.0`
  if (level === "minor") return `${major}.${minor + 1}.0`
  if (level === "patch") return `${major}.${minor}.${patch + 1}`
  throw new Error(`Nivel invalido: ${level}`)
}

// ─── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const level = args[0]
const messageIdx = args.indexOf("--message")
const customMessage = messageIdx !== -1 ? args[messageIdx + 1] : null

if (!["major", "minor", "patch"].includes(level)) {
  err("Uso: node scripts/bump-version.mjs <major|minor|patch> [--message \"...\"]")
  process.exit(1)
}

// ─── Pre-flight checks ─────────────────────────────────────────────────────────

log("Verificando pre-requisitos...")

// 1. Working tree limpio
const status = run("git status --porcelain")
if (status) {
  err("Hay cambios sin commitear. Haz commit o stash primero.")
  err(`Archivos:\n${status}`)
  process.exit(1)
}
ok("Working tree limpio.")

// 2. Estar en main
const branch = run("git rev-parse --abbrev-ref HEAD")
if (branch !== "main") {
  err(`Estas en '${branch}', no en 'main'. Cambiate primero.`)
  process.exit(1)
}
ok("Branch main.")

// 3. package.json existe
const pkgPath = join(ROOT, "package.json")
if (!(await exists(pkgPath))) {
  err("package.json no encontrado.")
  process.exit(1)
}

// 4. Last tag existe?
const tags = run("git tag --list v* --sort=-v:refname").split("\n").filter(Boolean)
const lastTag = tags[0] || null
log(`Ultimo tag: ${lastTag || "(ninguno)"}`)

// ─── Lectura de version actual ─────────────────────────────────────────────────

const pkg = JSON.parse(await readFile(pkgPath, "utf8"))
const currentVersion = pkg.version
const newVersion = bumpSemver(currentVersion, level)

log(`Version actual: v${currentVersion}`)
log(`Nueva version:  v${newVersion}  (${level})`)

// ─── Generar entradas de changelog ─────────────────────────────────────────────

log("Leyendo commits desde el ultimo tag...")

const range = lastTag ? `${lastTag}..HEAD` : "HEAD"
let commitsRaw = ""
try {
  commitsRaw = run(`git log ${range} --pretty="format:%H|%s" --no-merges`)
} catch {
  commitsRaw = ""
}

if (!commitsRaw) {
  warn("No hay commits en el rango. El CHANGELOG quedara vacio (solo se agregara la seccion).")
}

const groups = {
  Features: [],
  Fixes: [],
  Performance: [],
  Refactors: [],
  Docs: [],
  Infra: [],
  Other: [],
}

const classify = (subject) => {
  const m = subject.match(/^([a-zA-Z]+)(?:\([^)]+\))?!?:\s*(.+)$/)
  if (!m) return { type: "Other", subject }
  const [, type, rest] = m
  if (type === "feat") return { type: "Features", subject: rest }
  if (type === "fix") return { type: "Fixes", subject: rest }
  if (type === "perf") return { type: "Performance", subject: rest }
  if (type === "refactor") return { type: "Refactors", subject: rest }
  if (type === "docs") return { type: "Docs", subject: rest }
  if (type === "chore" || type === "build" || type === "ci" || type === "infra" || type === "style") {
    return { type: "Infra", subject: rest }
  }
  return { type: "Other", subject }
}

const lines = commitsRaw.split("\n").filter(Boolean)
for (const line of lines) {
  const [, subject] = line.split("|")
  if (!subject) continue
  const { type, subject: cleanSubject } = classify(subject)
  groups[type].push(cleanSubject)
}

const renderGroup = (title, items) => {
  if (items.length === 0) return ""
  const bullets = items.map((s) => `- ${s}`).join("\n")
  return `### ${title}\n${bullets}\n`
}

let changelogBody = ""
changelogBody += renderGroup("Features", groups.Features)
changelogBody += renderGroup("Fixes", groups.Fixes)
changelogBody += renderGroup("Performance", groups.Performance)
changelogBody += renderGroup("Refactors", groups.Refactors)
changelogBody += renderGroup("Docs", groups.Docs)
changelogBody += renderGroup("Infra", groups.Infra)
changelogBody += renderGroup("Other", groups["Other"])

if (customMessage) {
  changelogBody = `### Notas de la release\n- ${customMessage}\n\n` + changelogBody
}

if (!changelogBody.trim()) {
  changelogBody = "_Sin cambios desde la ultima version._\n"
}

log("Entrada de changelog generada:")
console.log("\n" + changelogBody + "\n")

// ─── Confirmacion ──────────────────────────────────────────────────────────────

const proceed = await ask(`¿Aplicar bump a v${newVersion} y crear tag? [y/N] `)
if (proceed.toLowerCase() !== "y") {
  err("Cancelado por el usuario.")
  process.exit(0)
}

// ─── Actualizar package.json ────────────────────────────────────────────────────

log("Actualizando package.json...")
pkg.version = newVersion
await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8")
ok(`package.json: ${currentVersion} -> ${newVersion}`)

// ─── Actualizar docs/PROJECT_CONTEXT.md ────────────────────────────────────────

const ctxPath = join(ROOT, "docs", "PROJECT_CONTEXT.md")
if (await exists(ctxPath)) {
  log("Actualizando docs/PROJECT_CONTEXT.md...")
  let ctx = await readFile(ctxPath, "utf8")
  const date = today()

  // Reemplaza la linea "Version activa de producto: **vX.Y.Z**"
  ctx = ctx.replace(
    /(Version activa de producto:\s*\*\*v)[\d.]+(\*\*)/,
    `$1${newVersion}$2`,
  )
  // Reemplaza la linea "Fecha de actualizacion: **YYYY-MM-DD**"
  ctx = ctx.replace(
    /(Fecha de actualizacion:\s*\*\*)\d{4}-\d{2}-\d{2}(\*\*)/,
    `$1${date}$2`,
  )
  await writeFile(ctxPath, ctx, "utf8")
  ok(`PROJECT_CONTEXT.md sincronizado a v${newVersion} (${date}).`)
} else {
  warn("docs/PROJECT_CONTEXT.md no existe. Saltando.")
}

// ─── Actualizar CHANGELOG.md ───────────────────────────────────────────────────

const clPath = join(ROOT, "CHANGELOG.md")
const date = today()
const newEntry = `## [v${newVersion}] — ${date}\n\n${changelogBody}\n`

if (await exists(clPath)) {
  log("Prepending a CHANGELOG.md...")
  let cl = await readFile(clPath, "utf8")
  // Encuentra la primera linea "## [v..." o "---" para insertar antes
  const headerEnd = cl.indexOf("\n---\n")
  if (headerEnd !== -1) {
    const head = cl.slice(0, headerEnd)
    const rest = cl.slice(headerEnd)
    cl = head + "\n---\n\n" + newEntry + rest
  } else {
    cl = newEntry + "\n" + cl
  }
  await writeFile(clPath, cl, "utf8")
  ok("CHANGELOG.md actualizado.")
} else {
  warn("CHANGELOG.md no existe. Saltando.")
}

// ─── git add + commit + tag ────────────────────────────────────────────────────

log("Creando commit y tag...")
run("git add package.json CHANGELOG.md docs/PROJECT_CONTEXT.md")
const commitMsg = `chore(release): v${newVersion}`
run(`git commit -m "${commitMsg}"`)
ok(`Commit creado: ${commitMsg}`)

const tagName = `v${newVersion}`
run(`git tag -a ${tagName} -m "Release ${tagName}"`)
ok(`Tag creado: ${tagName}`)

// ─── Listo ─────────────────────────────────────────────────────────────────────

ok("================================================")
ok(`Bump completo: v${currentVersion} -> v${newVersion}`)
ok("================================================")
console.log("")
log("Proximo paso:")
console.log(`  git push origin main --tags`)
console.log("")

