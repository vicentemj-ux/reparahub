const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const serverDir = path.join(rootDir, 'src-tauri', 'server')
const standaloneDir = path.join(rootDir, '.next', 'standalone')
const staticDir = path.join(rootDir, '.next', 'static')
const publicDir = path.join(rootDir, 'public')
const envSource = path.join(rootDir, '.env.local')
const envDest = path.join(serverDir, '.env')

function copyRecursive(src, dest, ignoreSet = new Set()) {
  if (!fs.existsSync(src)) return
  if (ignoreSet.has(path.basename(src))) return

  const stat = fs.lstatSync(src)
  if (stat.isSymbolicLink()) {
    return
  }
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry), ignoreSet)
    }
  } else {
    fs.copyFileSync(src, dest)
  }
}

function removeRecursive(dir, preserveSet = new Set()) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir)) {
    if (preserveSet.has(entry.toLowerCase())) continue
    const entryPath = path.join(dir, entry)
    const stat = fs.lstatSync(entryPath)
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(entryPath)
    } else if (stat.isDirectory()) {
      removeRecursive(entryPath, preserveSet)
      fs.rmdirSync(entryPath)
    } else {
      fs.unlinkSync(entryPath)
    }
  }
}

// ── 1. Verificar que standalone exista ──
if (!fs.existsSync(standaloneDir)) {
  console.error(`❌ .next/standalone/ no encontrado.`)
  console.error(`   Asegurate de que next.config.mjs tenga output: 'standalone' y que pnpm build haya terminado exitosamente.`)
  process.exit(1)
}

// ── 2. Limpiar src-tauri/server preservando node.exe ──
console.log('🧹 Limpiando src-tauri/server (preservando node.exe)...')
if (!fs.existsSync(serverDir)) {
  fs.mkdirSync(serverDir, { recursive: true })
}
removeRecursive(serverDir, new Set(['node.exe']))

// ── 3. Copiar .next/standalone/ → src-tauri/server/ (omitir node_modules) ──
console.log('📦 Copiando .next/standalone/ → src-tauri/server/ (sin node_modules)...')
const ignoreNodeModules = new Set(['node_modules'])
for (const entry of fs.readdirSync(standaloneDir)) {
  if (entry === 'node_modules') continue
  const src = path.join(standaloneDir, entry)
  const dest = path.join(serverDir, entry)
  copyRecursive(src, dest, ignoreNodeModules)
}

// ── 4. Instalar dependencias de produccion con npm (archivos reales, no symlinks) ──
console.log('📦 Instalando dependencias de produccion con npm...')
const npmCacheDir = path.join(rootDir, '.npm-cache-tauri')
try {
  execSync('npm install --production --no-audit --no-fund --prefer-offline', {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...process.env, npm_config_cache: npmCacheDir },
  })
} catch (e) {
  console.error('❌ Error al instalar dependencias en src-tauri/server/:')
  console.error(e.message)
  process.exit(1)
}

// Clean npm cache from server dir (should not be here but safety cleanup)
const serverNpmCache = path.join(serverDir, '.npm-cache')
if (fs.existsSync(serverNpmCache)) {
  fs.rmSync(serverNpmCache, { recursive: true, force: true })
  console.log('🧹 Limpiado .npm-cache residual en server/')
}

// Strip dev/test/docs files from node_modules to reduce bundle size
console.log('📦 Optimizando node_modules para bundle...')
const stripPatterns = [
  /\.(md|txt|markdown|yml|yaml|tsx?|map|flow|tsbuildinfo)$/,
  /^(README|CHANGELOG|LICENSE|CONTRIBUTING|AUTHORS|\.npmignore|\.gitignore|\.editorconfig|\.eslintrc|\.prettierrc|tsconfig)/,
  /^(test|tests|__tests__|spec|__mocks__|examples?|docs?|benchmarks?|coverage|\.github)$/,
]
function stripNodeModules(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (stripPatterns.some(p => p.test(entry.name))) {
        fs.rmSync(fullPath, { recursive: true, force: true })
      } else {
        stripNodeModules(fullPath)
      }
    } else if (entry.isFile()) {
      if (stripPatterns.some(p => p.test(entry.name))) {
        fs.unlinkSync(fullPath)
      }
    }
  }
}
stripNodeModules(path.join(serverDir, 'node_modules'))

// ── 5. Copiar .next/static/ → src-tauri/server/.next/static/ ──
if (fs.existsSync(staticDir)) {
  console.log('📦 Copiando .next/static/ → src-tauri/server/.next/static/...')
  copyRecursive(staticDir, path.join(serverDir, '.next', 'static'), ignoreNodeModules)
}

// ── 6. Copiar public/ → src-tauri/server/public/ ──
if (fs.existsSync(publicDir)) {
  console.log('📦 Copiando public/ → src-tauri/server/public/...')
  copyRecursive(publicDir, path.join(serverDir, 'public'), ignoreNodeModules)
}

// ── 7. Copiar .env.local → src-tauri/server/.env ──
if (fs.existsSync(envSource)) {
  fs.copyFileSync(envSource, envDest)
  console.log('✅ Copiado .env.local → src-tauri/server/.env')
} else {
  console.warn('⚠️ .env.local no encontrado. El servidor puede fallar si requiere variables de entorno.')
}

console.log('✅ src-tauri/server/ listo para empaquetar con Tauri.')
